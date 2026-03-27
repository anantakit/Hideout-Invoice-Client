import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { addDays, format, startOfDay, subDays } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import toast from 'react-hot-toast'
import { ROUTES } from '@/app/routes'
import { todayISO, getErrorMessage } from '@/shared/utils'
import { useTimeline, useAvailabilityGrouped, useMoveStay } from '../../hooks'
import type { TimelineBooking } from '../../types'
import { computeDateKPI } from '../utils/computeDateKPI'
import type { SelectedBookingContext } from '@/features/timeline/types'
import type { RoomAvailability } from '../components/AvailabilitySummary'
import type { ContextMenuState } from '../components/BookingContextMenu'
import type { DrawerMode, CreateBookingPrefill } from '../components/OperationsDrawer'
import type { ZoomLevel } from '../utils/timelineConstants'
import { ZOOM_CONFIG } from '../utils/timelineConstants'
import {
  TIMELINE_ROW_HEIGHT_PX,
  TIMELINE_OVERSCAN_ROWS,
  computeRowHeight,
  getCellWidthPx,
} from '../utils/tokens'
import { computeRoomLayout } from '../utils/bookingLayout'
import { getStatusColorClass } from '../utils/statusColors'
import { useInfiniteTimeline } from './useInfiniteTimeline'
import { useTimelineDrag } from './useTimelineDrag'
import { useTimelineActions } from './useTimelineActions'
import { useTimelineDrawCreate } from './useTimelineDrawCreate'

// ── Mobile constants ──────────────────────────────────────────────────────────
const MOBILE_STRIP_DAYS = 21
const MOBILE_CENTER = 10

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTimelineState(
  scrollContainerRef: React.RefObject<HTMLDivElement | null>,
) {
  const navigate = useNavigate()

  // ── Dev: force skeleton with ?skeleton in URL ──────────────────────────
  const forceSkeleton =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).has('skeleton')

  // ── Content-ready flag ─────────────────────────────────────────────────
  const [contentReady, setContentReady] = useState(false)

  // ── Infinite timeline ──────────────────────────────────────────────────
  const {
    bufferStart,
    bufferEnd,
    totalDays,
    days,
    fromStr,
    toStr,
    visibleStartDate,
    jumpToDate,
    jumpToToday,
    shiftBy,
  } = useInfiniteTimeline({ scrollContainerRef, ready: contentReady })

  // ── Filter state ──────────────────────────────────────────────────────
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string | null>(null)

  // ── Zoom level ────────────────────────────────────────────────────────
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('7d')

  // ── Operations drawer state ───────────────────────────────────────────
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null)
  const [createBookingPrefill, setCreateBookingPrefill] =
    useState<CreateBookingPrefill | null>(null)

  // ── Bottom-sheet state ────────────────────────────────────────────────
  const [selectedBooking, setSelectedBooking] =
    useState<SelectedBookingContext | null>(null)

  // ── Context menu + dialogs state ──────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [cancelTarget, setCancelTarget] = useState<TimelineBooking | null>(null)
  const [checkInTarget, setCheckInTarget] = useState<{
    booking: TimelineBooking
    roomId: string
  } | null>(null)
  const [checkOutTarget, setCheckOutTarget] = useState<TimelineBooking | null>(null)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)

  // ── Mobile date strip state ───────────────────────────────────────────
  const [mobileAnchor, setMobileAnchor] = useState<Date>(() => startOfDay(new Date()))
  const [mobileDayOffset, setMobileDayOffset] = useState(MOBILE_CENTER)

  // ── Aliases ───────────────────────────────────────────────────────────
  const windowStart = bufferStart
  const windowEnd = bufferEnd
  const zoomDays = totalDays

  // ── KPI date range ────────────────────────────────────────────────────
  const availFrom = useMemo(
    () => format(startOfDay(visibleStartDate), 'yyyy-MM-dd'),
    [visibleStartDate],
  )
  const availTo = useMemo(
    () => format(addDays(startOfDay(visibleStartDate), 1), 'yyyy-MM-dd'),
    [visibleStartDate],
  )

  // ── Queries ───────────────────────────────────────────────────────────
  const {
    data: timelineData,
    isLoading,
    isError,
    isFetching,
  } = useTimeline(fromStr, toStr)

  const { data: availData, isLoading: availLoading } =
    useAvailabilityGrouped(availFrom, availTo)

  // Flip contentReady once timeline data arrives
  useEffect(() => {
    if (!contentReady && !isLoading && !isError && timelineData) {
      setContentReady(true)
    }
  }, [contentReady, isLoading, isError, timelineData])

  // Pre-scroll skeleton to "today" position
  useEffect(() => {
    if (isLoading && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 14 * getCellWidthPx()
    }
  }, [isLoading, scrollContainerRef])

  // ── Mutations ─────────────────────────────────────────────────────────
  const moveStayMutation = useMoveStay()
  const timelineActions = useTimelineActions()

  // ── Derived data ──────────────────────────────────────────────────────
  const allRooms = timelineData?.rooms ?? []
  const allRoomsRef = useRef(allRooms)
  allRoomsRef.current = allRooms
  const unassignedStays = timelineData?.unassigned_stays ?? []
  const availRoomTypes = availData?.room_types ?? []

  // Sync selectedBooking with fresh timeline data after mutations
  useEffect(() => {
    setSelectedBooking((prev) => {
      if (!prev) return prev
      const stayId = prev.booking.room_stay_id
      for (const room of allRooms) {
        const fresh = room.bookings.find((b) => b.room_stay_id === stayId)
        if (fresh) {
          const roomNumbers = allRooms
            .filter((r) => r.bookings.some((bk) => bk.booking_id === fresh.booking_id))
            .map((r) => r.room_number)
          return { booking: { ...fresh }, roomNumbers }
        }
      }
      return prev
    })
  }, [allRooms])

  const roomAvailability = useMemo<RoomAvailability[]>(
    () =>
      availRoomTypes.map((rt) => {
        const physicallyAvailable = rt.rooms.filter((r) => r.available).length
        const effectiveAvailable = Math.max(
          0,
          physicallyAvailable - (rt.unassigned_count ?? 0),
        )
        return {
          room_type_id: rt.room_type_id,
          room_type_name: rt.room_type_name,
          total_rooms: rt.rooms.length,
          available_rooms: effectiveAvailable,
          occupied_rooms: rt.rooms.length - effectiveAvailable,
        }
      }),
    [availRoomTypes],
  )

  const { roomTypeIdByRoomId, roomTypeNameByRoomId, priceByRoomTypeId } = useMemo(() => {
    const idMap: Record<string, string> = {}
    const nameMap: Record<string, string> = {}
    const priceMap: Record<string, number> = {}
    for (const rt of availRoomTypes) {
      priceMap[rt.room_type_id] = rt.price_per_night
      for (const r of rt.rooms) {
        idMap[r.room_id] = rt.room_type_id
        nameMap[r.room_id] = rt.room_type_name
      }
    }
    return {
      roomTypeIdByRoomId: idMap,
      roomTypeNameByRoomId: nameMap,
      priceByRoomTypeId: priceMap,
    }
  }, [availRoomTypes])
  const roomTypeIdByRoomIdRef = useRef(roomTypeIdByRoomId)
  roomTypeIdByRoomIdRef.current = roomTypeIdByRoomId
  const roomTypeNameByRoomIdRef = useRef(roomTypeNameByRoomId)
  roomTypeNameByRoomIdRef.current = roomTypeNameByRoomId
  const priceByRoomTypeIdRef = useRef(priceByRoomTypeId)
  priceByRoomTypeIdRef.current = priceByRoomTypeId

  const filteredRooms = useMemo(() => {
    if (!selectedRoomTypeId) return allRooms
    return allRooms.filter((r) => roomTypeIdByRoomId[r.id] === selectedRoomTypeId)
  }, [allRooms, selectedRoomTypeId, roomTypeIdByRoomId])

  const bookingRoomCountMap = useMemo<Record<string, number>>(() => {
    const roomSets: Record<string, Set<string>> = {}
    for (const room of allRooms) {
      for (const b of room.bookings) {
        if (!roomSets[b.booking_id]) roomSets[b.booking_id] = new Set()
        roomSets[b.booking_id].add(room.id)
      }
    }
    const counts: Record<string, number> = {}
    for (const [bid, s] of Object.entries(roomSets)) counts[bid] = s.size
    return counts
  }, [allRooms])

  const bookingColorMap = useMemo<Record<string, string>>(() => {
    const colors: Record<string, string> = {}
    for (const room of allRooms) {
      for (const b of room.bookings) {
        colors[b.room_stay_id] = getStatusColorClass(b.status)
      }
    }
    return colors
  }, [allRooms])

  const roomLayerCountMap = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    for (const room of allRooms) {
      if (room.bookings.length <= 1) {
        map[room.id] = room.bookings.length
      } else {
        const layout = computeRoomLayout(room.bookings, fromStr, toStr)
        map[room.id] = layout.totalLayers
      }
    }
    return map
  }, [allRooms, fromStr, toStr])

  // ── Mobile date strip derived ─────────────────────────────────────────
  const mobileStripStart = useMemo(
    () => subDays(mobileAnchor, MOBILE_CENTER),
    [mobileAnchor],
  )
  const mobileDays = useMemo(
    () =>
      Array.from({ length: MOBILE_STRIP_DAYS }, (_, i) =>
        addDays(mobileStripStart, i),
      ),
    [mobileStripStart],
  )
  const mobileSelectedDate = useMemo(
    () => addDays(mobileStripStart, mobileDayOffset),
    [mobileStripStart, mobileDayOffset],
  )
  const mobileSelectedDateStr = useMemo(
    () => format(mobileSelectedDate, 'yyyy-MM-dd'),
    [mobileSelectedDate],
  )
  const mobileStripRef = useRef<HTMLDivElement>(null)

  // Auto-scroll the mobile date strip to center the selected day
  const mobileStripInitial = useRef(true)
  useEffect(() => {
    const el = mobileStripRef.current
    if (!el) return
    const btnWidth = 48
    const scrollTarget =
      mobileDayOffset * btnWidth - el.clientWidth / 2 + btnWidth / 2
    el.scrollTo({
      left: scrollTarget,
      behavior: mobileStripInitial.current ? 'instant' : 'smooth',
    })
    mobileStripInitial.current = false
  }, [mobileDayOffset, mobileAnchor, isLoading])

  const handleMobileDaySelect = useCallback(
    (i: number) => {
      setMobileDayOffset(i)
      if (i <= 2 || i >= MOBILE_STRIP_DAYS - 3) {
        const tappedDate = addDays(mobileStripStart, i)
        setMobileAnchor(tappedDate)
        setMobileDayOffset(MOBILE_CENTER)
      }
    },
    [mobileStripStart],
  )

  const todayStr = useMemo(() => todayISO(), [])

  // Count pending check-in tasks for today
  const todayPendingCheckinCount = useMemo(() => {
    let count = 0
    count += unassignedStays.filter(
      (s) =>
        s.check_in.slice(0, 10) === todayStr &&
        s.status !== 'CANCELLED' &&
        s.status !== 'CHECKED_OUT',
    ).length
    for (const room of allRooms) {
      for (const b of room.bookings) {
        if (
          b.check_in.slice(0, 10) === todayStr &&
          (b.status === 'RESERVED' || b.status === 'ASSIGNED')
        ) {
          count++
        }
      }
    }
    return count
  }, [unassignedStays, allRooms, todayStr])

  // ── KPI totals ────────────────────────────────────────────────────────
  const kpiTotals = useMemo(
    () =>
      computeDateKPI(
        allRooms,
        timelineData?.unassigned_stays ?? [],
        availFrom,
        roomTypeNameByRoomId,
      ),
    [allRooms, timelineData, availFrom, roomTypeNameByRoomId],
  )

  const arrivalsDepartures = useMemo(
    () => ({
      arrivals: kpiTotals.checkinTotal,
      departures: kpiTotals.checkoutTotal,
    }),
    [kpiTotals],
  )

  // ── Handlers ──────────────────────────────────────────────────────────
  const handlePrev = useCallback(() => {
    shiftBy(-7)
    const newDate = subDays(mobileSelectedDate, 1)
    setMobileAnchor(newDate)
    setMobileDayOffset(MOBILE_CENTER)
  }, [shiftBy, mobileSelectedDate])

  const handleNext = useCallback(() => {
    shiftBy(7)
    const newDate = addDays(mobileSelectedDate, 1)
    setMobileAnchor(newDate)
    setMobileDayOffset(MOBILE_CENTER)
  }, [shiftBy, mobileSelectedDate])

  const handleToday = useCallback(() => {
    jumpToToday()
    setMobileAnchor(startOfDay(new Date()))
    setMobileDayOffset(MOBILE_CENTER)
  }, [jumpToToday])

  const handleJumpToDate = useCallback(
    (date: Date) => {
      jumpToDate(date)
      setMobileAnchor(startOfDay(date))
      setMobileDayOffset(MOBILE_CENTER)
    },
    [jumpToDate],
  )

  const handleZoomChange = useCallback((level: ZoomLevel) => {
    setZoomLevel(level)
    const cfg = ZOOM_CONFIG[level]
    document.documentElement.style.setProperty(
      '--timeline-cell-width',
      cfg.cssWidth,
    )
  }, [])

  const handleRoomTypeSelect = useCallback(
    (id: string | null) => setSelectedRoomTypeId(id),
    [],
  )

  const handleSelectBooking = useCallback(
    (b: TimelineBooking, roomNumbers?: string[]) => {
      const rooms =
        roomNumbers ??
        allRoomsRef.current
          .filter((r) => r.bookings.some((bk) => bk.booking_id === b.booking_id))
          .map((r) => r.room_number)
      setSelectedBooking({ booking: { ...b }, roomNumbers: rooms })
      setDrawerMode('booking-detail')
    },
    [],
  )

  const handleCloseSheet = useCallback(() => {
    setSelectedBooking(null as SelectedBookingContext | null)
    setDrawerMode((prev) => (prev === 'booking-detail' ? null : prev))
  }, [])

  const handleCloseDrawer = useCallback(() => {
    setDrawerMode(null)
    setSelectedBooking(null)
  }, [])

  const handleToggleOpsDrawer = useCallback(() => {
    setDrawerMode((prev) => (prev === 'ops' ? null : 'ops'))
  }, [])

  const handleDrawerCheckIn = useCallback(
    (b: TimelineBooking) => {
      const room = allRooms.find((r) =>
        r.bookings.some((bk) => bk.room_stay_id === b.room_stay_id),
      )
      if (!room) return
      setCheckInTarget({ booking: b, roomId: room.id })
    },
    [allRooms],
  )

  const handleDirectCheckOut = useCallback(
    (b: TimelineBooking) => {
      timelineActions.checkOut({
        bookingId: b.booking_id,
        roomStayId: b.room_stay_id,
      })
    },
    [timelineActions],
  )

  const handleDoubleClickBooking = useCallback(
    (b: TimelineBooking) => {
      navigate(ROUTES.bookings.detail(b.booking_id))
    },
    [navigate],
  )

  // ── Context menu + quick actions ──────────────────────────────────────
  const handleOpenContextMenu = useCallback(
    (
      booking: TimelineBooking,
      roomId: string,
      roomNumber: string,
      x: number,
      y: number,
    ) => {
      setContextMenu({ booking, roomId, roomNumber, x, y })
    },
    [],
  )
  const handleCloseContextMenu = useCallback(() => setContextMenu(null), [])

  const handleQuickCheckIn = useCallback(
    (booking: TimelineBooking, roomId: string) => {
      setCheckInTarget({ booking, roomId })
    },
    [],
  )

  const handleConfirmCheckIn = useCallback(() => {
    if (!checkInTarget) return
    timelineActions.checkIn({
      bookingId: checkInTarget.booking.booking_id,
      roomStayId: checkInTarget.booking.room_stay_id,
      roomId: checkInTarget.roomId,
    })
    setCheckInTarget(null)
  }, [checkInTarget, timelineActions])

  const handleQuickCheckOut = useCallback(
    (booking: TimelineBooking) => {
      setCheckOutTarget(booking)
    },
    [],
  )

  const handleConfirmCheckOut = useCallback(() => {
    if (!checkOutTarget) return
    timelineActions.checkOut({
      bookingId: checkOutTarget.booking_id,
      roomStayId: checkOutTarget.room_stay_id,
    })
    setCheckOutTarget(null)
  }, [checkOutTarget, timelineActions])

  const handleContextOpenDetail = useCallback(
    (booking: TimelineBooking) => {
      navigate(ROUTES.bookings.detail(booking.booking_id))
    },
    [navigate],
  )

  const handleContextTransfer = useCallback(
    (booking: TimelineBooking, _roomId: string) => {
      navigate(ROUTES.bookings.detail(booking.booking_id))
    },
    [navigate],
  )

  const handleContextCancel = useCallback(
    (booking: TimelineBooking) => {
      setCancelTarget(booking)
    },
    [],
  )

  const handleConfirmCancel = useCallback(() => {
    if (!cancelTarget) return
    timelineActions.cancelStay({
      bookingId: cancelTarget.booking_id,
      stayId: cancelTarget.room_stay_id,
    })
    setCancelTarget(null)
  }, [cancelTarget, timelineActions])

  // ── Virtualisation ────────────────────────────────────────────────────
  const getRowHeight = useCallback(
    (index: number) => {
      const room = filteredRooms[index]
      if (!room) return TIMELINE_ROW_HEIGHT_PX
      const layers = roomLayerCountMap[room.id] ?? 1
      return computeRowHeight(layers)
    },
    [filteredRooms, roomLayerCountMap],
  )

  const rowVirtualizer = useVirtualizer({
    count: filteredRooms.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: getRowHeight,
    overscan: TIMELINE_OVERSCAN_ROWS,
  })

  useEffect(() => {
    rowVirtualizer.measure()
  }, [rowVirtualizer, roomLayerCountMap])

  // ── Room position helpers for drag ────────────────────────────────────
  const gridContainerRef = useRef<HTMLDivElement>(null)

  const { cumulativeHeights, roomIdxMap } = useMemo(() => {
    const heights: number[] = [0]
    const idxMap = new Map<string, number>()
    for (let i = 0; i < filteredRooms.length; i++) {
      idxMap.set(filteredRooms[i].id, i)
      const room = filteredRooms[i]
      const layers = roomLayerCountMap[room.id] ?? 1
      heights.push(heights[i] + computeRowHeight(layers))
    }
    return { cumulativeHeights: heights, roomIdxMap: idxMap }
  }, [filteredRooms, roomLayerCountMap])

  const getRoomTop = useCallback(
    (roomId: string): number | undefined => {
      const idx = roomIdxMap.get(roomId)
      if (idx === undefined) return undefined
      return cumulativeHeights[idx]
    },
    [roomIdxMap, cumulativeHeights],
  )

  const getRoomHeight = useCallback(
    (roomId: string): number => {
      const layers = roomLayerCountMap[roomId] ?? 1
      return computeRowHeight(layers)
    },
    [roomLayerCountMap],
  )

  const getRoomAtY = useCallback(
    (y: number): string | undefined => {
      let lo = 0
      let hi = filteredRooms.length - 1
      while (lo <= hi) {
        const mid = (lo + hi) >>> 1
        const top = cumulativeHeights[mid]
        const bottom = cumulativeHeights[mid + 1]
        if (y < top) hi = mid - 1
        else if (y >= bottom) lo = mid + 1
        else return filteredRooms[mid].id
      }
      return undefined
    },
    [filteredRooms, cumulativeHeights],
  )

  // ── Drag and drop ─────────────────────────────────────────────────────
  const handleMoveStay = useCallback(
    (payload: {
      bookingId: string
      stayId: string
      newRoomId: string
      newCheckIn: string
      newCheckOut: string
    }) => {
      const targetRoom = allRooms.find((r) => r.id === payload.newRoomId)
      const roomLabel = targetRoom
        ? `ห้อง ${targetRoom.room_number}`
        : 'ห้องที่เลือก'

      moveStayMutation.mutate(
        {
          bookingId: payload.bookingId,
          stayId: payload.stayId,
          payload: {
            room_id: payload.newRoomId,
            check_in: payload.newCheckIn,
            check_out: payload.newCheckOut,
          },
        },
        {
          onSuccess: () => {
            toast.success(
              `ย้ายไป${roomLabel} (${payload.newCheckIn} → ${payload.newCheckOut}) สำเร็จ`,
            )
          },
          onError: (err: unknown) => {
            const serverMsg = getErrorMessage(err, '')
            let msg: string

            if (serverMsg.includes('room type mismatch')) {
              msg = `ไม่สามารถย้ายข้ามประเภทห้องได้ — ${roomLabel}เป็นคนละประเภทกับห้องเดิม`
            } else if (serverMsg.includes('room unavailable')) {
              msg = `${roomLabel}ไม่ว่างในช่วง ${payload.newCheckIn} → ${payload.newCheckOut}`
            } else if (serverMsg.includes('room is not active')) {
              msg = `${roomLabel}ปิดใช้งานอยู่ ไม่สามารถย้ายเข้าได้`
            } else if (serverMsg.includes('room stay not found')) {
              msg = 'ไม่พบข้อมูลการเข้าพักนี้ อาจถูกยกเลิกไปแล้ว'
            } else if (serverMsg.includes('room not found')) {
              msg = `ไม่พบ${roomLabel}ในระบบ`
            } else if (
              serverMsg.includes('CHECKED_OUT') ||
              serverMsg.includes('CANCELLED')
            ) {
              msg = 'ไม่สามารถย้ายได้ — การจองนี้เช็คเอาท์หรือยกเลิกไปแล้ว'
            } else if (serverMsg.includes('check_out must be after check_in')) {
              msg = 'วันเช็คเอาท์ต้องอยู่หลังวันเช็คอิน'
            } else {
              msg = serverMsg || 'ไม่สามารถย้ายการจองได้ กรุณาลองใหม่'
            }

            toast.error(msg)
          },
        },
      )
    },
    [moveStayMutation, allRooms],
  )

  const {
    dragState,
    previewPos,
    isDragging,
    handleDragStart,
    handleKeyboardMove,
    handleKeyboardResize,
  } = useTimelineDrag({
    rooms: filteredRooms,
    windowStart,
    windowDays: zoomDays,
    scrollContainerRef,
    gridContainerRef,
    onMoveStay: handleMoveStay,
    getRoomTop,
    getRoomHeight,
    getRoomAtY,
  })

  // ── Draw to create ────────────────────────────────────────────────────
  const { drawPreview, handleDrawStart } = useTimelineDrawCreate({
    rooms: filteredRooms,
    windowStart,
    windowDays: zoomDays,
    scrollContainerRef,
    getRoomTop,
    getRoomHeight,
    isDragging,
    allRoomsRef,
    roomTypeIdByRoomIdRef,
    roomTypeNameByRoomIdRef,
    priceByRoomTypeIdRef,
    setCreateBookingPrefill,
    setDrawerMode,
  })

  return {
    // Loading / error
    isLoading,
    isError,
    isFetching,
    forceSkeleton,

    // Infinite timeline
    days,
    windowStart,
    windowEnd,
    zoomDays,
    visibleStartDate,

    // Zoom
    zoomLevel,
    handleZoomChange,

    // Filter
    selectedRoomTypeId,
    handleRoomTypeSelect,

    // Rooms + data
    allRooms,
    filteredRooms,
    unassignedStays,
    bookingColorMap,
    bookingRoomCountMap,
    roomLayerCountMap,
    roomAvailability,
    roomTypeNameByRoomId,
    roomTypeIdByRoomId,

    // KPIs
    kpiTotals,
    arrivalsDepartures,
    availLoading,
    todayStr,
    todayPendingCheckinCount,

    // Navigation
    handlePrev,
    handleNext,
    handleToday,
    handleJumpToDate,

    // Booking selection / drawer
    drawerMode,
    selectedBooking,
    createBookingPrefill,
    handleSelectBooking,
    handleCloseSheet,
    handleCloseDrawer,
    handleToggleOpsDrawer,
    handleDrawerCheckIn,
    handleDirectCheckOut,
    handleDoubleClickBooking,
    handleBookingCreated: useCallback(
      (_bookingId: string) => {
        setCreateBookingPrefill(null)
        setDrawerMode(null)
      },
      [],
    ),

    // Context menu
    contextMenu,
    handleOpenContextMenu,
    handleCloseContextMenu,
    handleContextOpenDetail,
    handleContextTransfer,
    handleContextCancel,

    // Quick actions + confirm dialogs
    cancelTarget,
    setCancelTarget,
    checkInTarget,
    setCheckInTarget,
    checkOutTarget,
    setCheckOutTarget,
    handleQuickCheckIn,
    handleConfirmCheckIn,
    handleQuickCheckOut,
    handleConfirmCheckOut,
    handleConfirmCancel,

    // Keyboard help
    showKeyboardHelp,
    setShowKeyboardHelp,

    // Mobile
    mobileDays,
    mobileDayOffset,
    mobileSelectedDate,
    mobileSelectedDateStr,
    mobileStripRef,
    handleMobileDaySelect,

    // Virtualizer
    rowVirtualizer,
    gridContainerRef,

    // Drag
    dragState,
    previewPos,
    isDragging,
    handleDragStart,
    handleKeyboardMove,
    handleKeyboardResize,

    // Draw
    drawPreview,
    handleDrawStart,
  }
}
