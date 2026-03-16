import React, { useState, useMemo, useCallback, useRef, useEffect, useSyncExternalStore } from 'react'
import { addDays, subDays, format, startOfDay } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/app/routes'
import { useVirtualizer } from '@tanstack/react-virtual'
import { CalendarPlus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { TooltipProvider } from '@/shared/ui/tooltip'
import toast from 'react-hot-toast'
import { todayISO } from '@/shared/utils'
import ErrorPanel from '@/shared/components/ErrorPanel'
import TimelineSkeleton from '../timeline/components/TimelineSkeleton'
import { useTimeline, useAvailabilityGrouped, useMoveStay } from '../hooks'
import type { TimelineBooking } from '../types'
import { computeDateKPI } from '../timeline/utils/computeDateKPI'
import TimelineHeader from '../timeline/components/TimelineHeader'
import RoomRow from '../timeline/components/RoomRow'
import BookingBottomSheet from '../timeline/components/BookingBottomSheet'
import type { SelectedBookingContext } from '../timeline/components/BookingBottomSheet'
import DragPreview from '../timeline/components/DragPreview'
import type { RoomAvailability } from '../timeline/components/AvailabilitySummary'
import TimelineToolbar from '../timeline/components/TimelineToolbar'
import { ZOOM_CONFIG, type ZoomLevel } from '../timeline/utils/timelineConstants'
import { OperationsDrawer, type DrawerMode, type CreateBookingPrefill } from '../timeline/components/OperationsDrawer'
import { MobileTimelineList } from '../timeline/components/MobileTimelineList'
import {
  TIMELINE_ROW_HEIGHT_PX,
  TIMELINE_OVERSCAN_ROWS,
  computeRowHeight,
  getCellWidthPx,
} from '../timeline/utils/tokens'
import { computeRoomLayout } from '../timeline/utils/bookingLayout'
import { useInfiniteTimeline } from '../timeline/hooks/useInfiniteTimeline'
import { useTimelineDrag } from '../timeline/hooks/useTimelineDrag'
import { useTimelineDraw } from '../timeline/hooks/useTimelineDraw'
import { useTimelineActions } from '../timeline/hooks/useTimelineActions'
import BookingContextMenu, { type ContextMenuState } from '../timeline/components/BookingContextMenu'
import { getStatusColorClass } from '../timeline/utils/statusColors'
import { MobileDateStrip } from '../timeline/components/MobileDateStrip'
import {
  KeyboardHelpDialog,
  CancelConfirmDialog,
  CheckInConfirmDialog,
  CheckOutConfirmDialog,
} from '../timeline/components/TimelineConfirmDialogs'

// ─── MobileOnly — renders children only below md (768px) ─────────────────────

const mdQuery = '(min-width: 768px)'
const subscribe = (cb: () => void) => {
  const mql = window.matchMedia(mdQuery)
  mql.addEventListener('change', cb)
  return () => mql.removeEventListener('change', cb)
}
const getSnapshot = () => !window.matchMedia(mdQuery).matches
const getServerSnapshot = () => true

function MobileOnly({ children }: { children: React.ReactNode }) {
  const isMobile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  if (!isMobile) return null
  return <>{children}</>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOBILE_STRIP_DAYS = 21
const MOBILE_CENTER = 10 // anchor is at index 10

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const navigate = useNavigate()

  // ── Dev: force skeleton with ?skeleton in URL ──────────────────────────
  const forceSkeleton = import.meta.env.DEV && new URLSearchParams(window.location.search).has('skeleton')

  // ── Virtualisation ──────────────────────────────────────────────────────
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // ── Content-ready flag (true once timeline data has loaded at least once) ──
  // Breaks the circular dep: hook needs ready, but ready depends on data that
  // depends on hook output.  We flip once and never go back.
  const [contentReady, setContentReady] = useState(false)

  // ── Infinite timeline (replaces fixed window) ──────────────────────────
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

  // ── Filter state ──────────────────────────────────────────────────────────
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string | null>(null)

  // ── Zoom level ─────────────────────────────────────────────────────────
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('7d')

  // ── Operations drawer state ─────────────────────────────────────────────
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null)
  const [createBookingPrefill, setCreateBookingPrefill] = useState<CreateBookingPrefill | null>(null)

  // ── Bottom-sheet state ────────────────────────────────────────────────────
  const [selectedBooking, setSelectedBooking] = useState<SelectedBookingContext | null>(null)

  // ── Context menu + cancel dialog + keyboard help state ──────────────────
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [cancelTarget, setCancelTarget] = useState<TimelineBooking | null>(null)
  const [checkInTarget, setCheckInTarget] = useState<{ booking: TimelineBooking; roomId: string } | null>(null)
  const [checkOutTarget, setCheckOutTarget] = useState<TimelineBooking | null>(null)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)

  // ── Mobile date strip: anchor date (center of the 21-day strip) ─────────
  const [mobileAnchor, setMobileAnchor] = useState<Date>(() => startOfDay(new Date()))
  const [mobileDayOffset, setMobileDayOffset] = useState(10) // 10 = center

  // ── Derived date strings ──────────────────────────────────────────────────
  // These alias the infinite timeline's buffer for backwards compat
  const windowStart = bufferStart
  const windowEnd   = bufferEnd
  const zoomDays    = totalDays

  // ── KPIs are reactive to the visible start date (= date shown in header) ──
  const availFrom = useMemo(() => format(startOfDay(visibleStartDate), 'yyyy-MM-dd'), [visibleStartDate])
  const availTo   = useMemo(() => format(addDays(startOfDay(visibleStartDate), 1), 'yyyy-MM-dd'), [visibleStartDate])

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: timelineData, isLoading, isError } = useTimeline(fromStr, toStr)

  const { data: availData, isLoading: availLoading } =
    useAvailabilityGrouped(availFrom, availTo)

  // Flip contentReady once timeline data arrives (never resets to false)
  useEffect(() => {
    if (!contentReady && !isLoading && !isError && timelineData) {
      setContentReady(true)
    }
  }, [contentReady, isLoading, isError, timelineData])

  // Pre-scroll skeleton to "today" position so the transition to real content
  // has no visible jump. BUFFER_DAYS = 14 matches useInfiniteTimeline.
  useEffect(() => {
    if (isLoading && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 14 * getCellWidthPx()
    }
  }, [isLoading])

  // ── Move stay mutation ──────────────────────────────────────────────────
  const moveStayMutation = useMoveStay()

  // ── Timeline quick actions (check-in / check-out / cancel) ────────────
  const timelineActions = useTimelineActions()

  // ── Derived data ──────────────────────────────────────────────────────────
  const allRooms        = timelineData?.rooms           ?? []
  const allRoomsRef     = useRef(allRooms)
  allRoomsRef.current   = allRooms
  const unassignedStays = timelineData?.unassigned_stays ?? []
  const availRoomTypes  = availData?.room_types          ?? []

  // Sync selectedBooking with fresh timeline data after mutations (e.g. move/extend).
  // Without this, the detail panel shows stale balance_amount until manual refresh.
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
        // Subtract unassigned reservations — they consume capacity even without
        // a specific room assigned yet.
        const effectiveAvailable = Math.max(0, physicallyAvailable - (rt.unassigned_count ?? 0))
        return {
          room_type_id:    rt.room_type_id,
          room_type_name:  rt.room_type_name,
          total_rooms:     rt.rooms.length,
          available_rooms: effectiveAvailable,
          occupied_rooms:  rt.rooms.length - effectiveAvailable,
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
    return { roomTypeIdByRoomId: idMap, roomTypeNameByRoomId: nameMap, priceByRoomTypeId: priceMap }
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
    // Count unique physical rooms per booking (not stays — transfers create
    // multiple stays on the same room which shouldn't inflate the count).
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

  // Mobile scrollable date strip — 21 days centered on mobileAnchor
  const mobileStripStart = useMemo(
    () => subDays(mobileAnchor, MOBILE_CENTER),
    [mobileAnchor],
  )
  const mobileDays = useMemo(
    () => Array.from({ length: MOBILE_STRIP_DAYS }, (_, i) => addDays(mobileStripStart, i)),
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

  // Auto-scroll the mobile date strip to center the selected day.
  // `isLoading` is in deps so the effect re-runs when loading finishes
  // and the strip element first mounts in the DOM.
  const mobileStripInitial = useRef(true)
  useEffect(() => {
    const el = mobileStripRef.current
    if (!el) return
    const btnWidth = 48 // w-12 = 3rem = 48px
    const scrollTarget = mobileDayOffset * btnWidth - (el.clientWidth / 2) + (btnWidth / 2)
    el.scrollTo({ left: scrollTarget, behavior: mobileStripInitial.current ? 'instant' : 'smooth' })
    mobileStripInitial.current = false
  }, [mobileDayOffset, mobileAnchor, isLoading])

  const handleMobileDaySelect = useCallback((i: number) => {
    setMobileDayOffset(i)
    if (i <= 2 || i >= MOBILE_STRIP_DAYS - 3) {
      const tappedDate = addDays(mobileStripStart, i)
      setMobileAnchor(tappedDate)
      setMobileDayOffset(MOBILE_CENTER)
    }
  }, [mobileStripStart])

  const todayStr = useMemo(() => todayISO(), [])

  // ── Keyboard help: `?` key opens shortcut help dialog ────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        e.preventDefault()
        setShowKeyboardHelp((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Count pending check-in tasks for today (unassigned + assigned but not yet checked in)
  const todayPendingCheckinCount = useMemo(() => {
    let count = 0
    // Unassigned stays checking in today
    count += unassignedStays.filter(
      (s) => s.check_in.slice(0, 10) === todayStr && s.status !== 'CANCELLED' && s.status !== 'CHECKED_OUT',
    ).length
    // Assigned stays checking in today but not yet checked in
    for (const room of allRooms) {
      for (const b of room.bookings) {
        if (b.check_in.slice(0, 10) === todayStr && (b.status === 'RESERVED' || b.status === 'ASSIGNED')) {
          count++
        }
      }
    }
    return count
  }, [unassignedStays, allRooms, todayStr])

  // ── KPI totals (memoized) ──────────────────────────────────────────────
  const kpiTotals = useMemo(
    () => computeDateKPI(allRooms, timelineData?.unassigned_stays ?? [], availFrom, roomTypeNameByRoomId),
    [allRooms, timelineData, availFrom, roomTypeNameByRoomId],
  )

  const arrivalsDepartures = useMemo(
    () => ({ arrivals: kpiTotals.checkinTotal, departures: kpiTotals.checkoutTotal }),
    [kpiTotals],
  )

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePrev  = useCallback(() => {
    shiftBy(-7) // desktop: shift 7 days
    // mobile: shift 1 day
    const newDate = subDays(mobileSelectedDate, 1)
    setMobileAnchor(newDate)
    setMobileDayOffset(MOBILE_CENTER)
  }, [shiftBy, mobileSelectedDate])
  const handleNext  = useCallback(() => {
    shiftBy(7) // desktop: shift 7 days
    // mobile: shift 1 day
    const newDate = addDays(mobileSelectedDate, 1)
    setMobileAnchor(newDate)
    setMobileDayOffset(MOBILE_CENTER)
  }, [shiftBy, mobileSelectedDate])
  const handleToday = useCallback(() => {
    jumpToToday()
    // Re-center mobile strip on today
    setMobileAnchor(startOfDay(new Date()))
    setMobileDayOffset(MOBILE_CENTER)
  }, [jumpToToday])

  const handleJumpToDate = useCallback((date: Date) => {
    jumpToDate(date)
    // Re-center mobile strip on the picked date
    setMobileAnchor(startOfDay(date))
    setMobileDayOffset(MOBILE_CENTER)
  }, [jumpToDate])

  const handleZoomChange = useCallback((level: ZoomLevel) => {
    setZoomLevel(level)
    const cfg = ZOOM_CONFIG[level]
    document.documentElement.style.setProperty('--timeline-cell-width', cfg.cssWidth)
  }, [])

  const handleRoomTypeSelect     = useCallback((id: string | null) => setSelectedRoomTypeId(id), [])
  const handleSelectBooking      = useCallback((b: TimelineBooking, roomNumbers?: string[]) => {
    const rooms = roomNumbers ?? allRoomsRef.current
      .filter((r) => r.bookings.some((bk) => bk.booking_id === b.booking_id))
      .map((r) => r.room_number)
    // Force a fresh object reference so React.memo always sees the change
    setSelectedBooking({ booking: { ...b }, roomNumbers: rooms })
    // On desktop, open the push drawer in booking-detail mode
    setDrawerMode('booking-detail')
  }, [])
  const handleCloseSheet         = useCallback(() => {
    setSelectedBooking(null as SelectedBookingContext | null)
    // Close drawer if showing booking detail
    setDrawerMode((prev) => prev === 'booking-detail' ? null : prev)
  }, [])
  const handleCloseDrawer        = useCallback(() => {
    setDrawerMode(null)
    // Clear selected booking when drawer closes
    setSelectedBooking(null)
  }, [])
  const handleToggleOpsDrawer    = useCallback(() => {
    setDrawerMode((prev) => prev === 'ops' ? null : 'ops')
  }, [])
  // Drawer quick actions — find roomId from booking data
  const handleDrawerCheckIn = useCallback((b: TimelineBooking) => {
    const room = allRooms.find((r) => r.bookings.some((bk) => bk.room_stay_id === b.room_stay_id))
    if (!room) return
    setCheckInTarget({ booking: b, roomId: room.id })
  }, [allRooms])
  const handleDrawerCheckOut = useCallback((b: TimelineBooking) => {
    setCheckOutTarget(b)
  }, [])
  const handleDoubleClickBooking = useCallback((b: TimelineBooking) => {
    navigate(ROUTES.bookings.detail(b.booking_id))
  }, [navigate])
  // Empty cell click removed — draw-to-create replaces it (avoids accidental taps)

  // ── Context menu + quick actions ────────────────────────────────────────
  const handleOpenContextMenu = useCallback(
    (booking: TimelineBooking, roomId: string, roomNumber: string, x: number, y: number) => {
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

  // ── Virtualisation ──────────────────────────────────────────────────────
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
    count:            filteredRooms.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize:     getRowHeight,
    overscan:         TIMELINE_OVERSCAN_ROWS,
  })

  // Force virtualizer to recalculate row heights when layer counts change
  // (e.g. after early checkout + same-day walk-in creates overlapping layers).
  useEffect(() => {
    rowVirtualizer.measure()
  }, [rowVirtualizer, roomLayerCountMap])

  // ── Room position helpers for drag ────────────────────────────────────
  const gridContainerRef = useRef<HTMLDivElement>(null)

  // Precompute cumulative heights for O(1) getRoomTop and O(log n) getRoomAtY
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

  /** Binary search: given a Y coordinate in virtualizer space, find which room it falls in. */
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

  // ── Drag and drop ──────────────────────────────────────────────────────
  const handleMoveStay = useCallback(
    (payload: {
      bookingId: string
      stayId: string
      newRoomId: string
      newCheckIn: string
      newCheckOut: string
    }) => {
      const targetRoom = allRooms.find((r) => r.id === payload.newRoomId)
      const roomLabel = targetRoom ? `ห้อง ${targetRoom.room_number}` : 'ห้องที่เลือก'

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
            toast.success(`ย้ายไป${roomLabel} (${payload.newCheckIn} → ${payload.newCheckOut}) สำเร็จ`)
          },
          onError: (err: any) => {
            const serverMsg: string = err?.response?.data?.error ?? ''
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
            } else if (serverMsg.includes('CHECKED_OUT') || serverMsg.includes('CANCELLED')) {
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

  // ── Draw to create ──────────────────────────────────────────────────────
  const handleBookingCreated = useCallback(
    (_bookingId: string) => {
      setCreateBookingPrefill(null)
      setDrawerMode(null)
    },
    [],
  )

  const { drawPreview, completedDraw, clearCompletedDraw, handleDrawStart } = useTimelineDraw({
    rooms: filteredRooms,
    windowStart,
    windowDays: zoomDays,
    scrollContainerRef,
    getRoomTop,
    getRoomHeight,
    isDragging,
  })

  // React to completed draw — open create-booking drawer
  useEffect(() => {
    if (!completedDraw) return
    const { roomId, checkIn, checkOut } = completedDraw
    const roomTypeId = roomTypeIdByRoomIdRef.current[roomId] ?? ''
    const room = allRoomsRef.current.find((r) => r.id === roomId)
    setCreateBookingPrefill({
      roomId,
      roomTypeId,
      roomNumber: room?.room_number ?? '',
      roomTypeName: roomTypeNameByRoomIdRef.current[roomId] ?? '',
      pricePerNight: priceByRoomTypeIdRef.current[roomTypeId] ?? 0,
      checkIn,
      checkOut,
    })
    setDrawerMode('create-booking')
    clearCompletedDraw()
  }, [completedDraw, clearCompletedDraw])

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="flex flex-col h-full overflow-hidden bg-background">

        {/* ════════════════════════════════════════════════════════════════
            PROFESSIONAL PMS TIMELINE HEADER — 64px dark SaaS control bar
            LEFT: Property | CENTER: Nav + Zoom + Filter | RIGHT: KPIs + Actions
            ════════════════════════════════════════════════════════════════ */}
        <TimelineToolbar
          visibleStartDate={visibleStartDate}
          zoomLevel={zoomLevel}
          onZoomChange={handleZoomChange}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          onJumpToDate={handleJumpToDate}
          mobileSelectedDate={mobileSelectedDate}
          selectedRoomTypeId={selectedRoomTypeId}
          onRoomTypeSelect={handleRoomTypeSelect}
          roomAvailability={roomAvailability}
          kpiTotals={kpiTotals}
          arrivalsDepartures={arrivalsDepartures}
          availLoading={availLoading}
          onToggleOpsDrawer={handleToggleOpsDrawer}
          drawerMode={drawerMode}
          todayPendingCheckinCount={todayPendingCheckinCount}
        />

        {/* ── Mobile: scrollable date strip + MobileTimelineList (< md) ── */}
        {!isLoading && !isError && !forceSkeleton && (
          <div className="md:hidden flex flex-col flex-1 overflow-hidden">
            <MobileDateStrip
              days={mobileDays}
              selectedIndex={mobileDayOffset}
              todayStr={todayStr}
              stripRef={mobileStripRef}
              onSelectDay={handleMobileDaySelect}
            />

            <MobileTimelineList
              rooms={filteredRooms}
              selectedDateStr={mobileSelectedDateStr}
              bookingColorMap={bookingColorMap}
              roomTypeNameMap={roomTypeNameByRoomId}
              unassignedStays={unassignedStays}
              onSelectBooking={handleSelectBooking}
              onQuickCheckOut={handleDrawerCheckOut}
            />
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            DESKTOP: Timeline + Push Drawer (>= md)
            The scroll container ALWAYS renders so useInfiniteTimeline
            can attach its scroll listener on mount.
            ════════════════════════════════════════════════════════════════ */}
        <div className="hidden md:flex flex-1 overflow-hidden">

          {/* Timeline area — click on empty space to dismiss drawer */}
          <div
            className="flex-1 flex flex-col min-w-0 overflow-hidden"
            onClick={drawerMode ? (e: React.MouseEvent) => {
              // Don't close if clicking a booking block or interactive element
              const target = e.target as HTMLElement
              if (target.closest('.tl-booking-block') || target.closest('button')) return
              handleCloseDrawer()
            } : undefined}
          >

            {/* Timeline grid — ALWAYS mounted for infinite scroll hook */}
            <div ref={scrollContainerRef} className="flex-1 overflow-auto">

              {/* Loading skeleton */}
              {(isLoading || forceSkeleton) && <TimelineSkeleton />}

              {/* Error state */}
              {isError && !isLoading && (
                <div className="flex items-center justify-center py-20 px-6">
                  <ErrorPanel
                    message="โหลดข้อมูลไทม์ไลน์ไม่สำเร็จ"
                    onRetry={() => window.location.reload()}
                  />
                </div>
              )}

              {/* Timeline content */}
              {!isLoading && !isError && !forceSkeleton && (
                <div
                  style={{
                    minWidth:
                      `calc(var(--timeline-room-col-width) + ${zoomDays} * var(--timeline-cell-width))`,
                  }}
                >
                  <TimelineHeader days={days} />

                  {filteredRooms.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <p className="text-body text-muted-foreground">
                        {selectedRoomTypeId ? 'ไม่พบห้องสำหรับประเภทนี้' : 'ไม่มีการจองในช่วงเวลานี้'}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(ROUTES.bookings.new)}
                        className="gap-1.5"
                      >
                        <CalendarPlus size={14} />
                        สร้างการจอง
                      </Button>
                    </div>
                  )}

                  {filteredRooms.length > 0 && (
                    <div
                      ref={gridContainerRef}
                      role="grid"
                      aria-label="Timeline ห้องพัก"
                      style={{
                        height:   rowVirtualizer.getTotalSize(),
                        position: 'relative',
                      }}
                    >
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const room = filteredRooms[virtualRow.index]
                        return (
                          <div
                            key={room.id}
                            style={{
                              position: 'absolute',
                              top:    virtualRow.start,
                              left:   0,
                              right:  0,
                              height: virtualRow.size,
                            }}
                          >
                            <RoomRow
                              room={room}
                              roomTypeName={roomTypeNameByRoomId[room.id]}
                              windowStart={windowStart}
                              windowEnd={windowEnd}
                              rowHeight={virtualRow.size}
                              onSelectBooking={handleSelectBooking}

                              isEven={virtualRow.index % 2 === 0}
                              bookingColorMap={bookingColorMap}
                              bookingRoomCountMap={bookingRoomCountMap}
                              onDragStart={handleDragStart}
                              dragState={dragState}
                              onContextMenu={handleOpenContextMenu}
                              windowDays={zoomDays}
                              onKeyboardMove={handleKeyboardMove}
                              onKeyboardResize={handleKeyboardResize}
                              onDoubleClickBooking={handleDoubleClickBooking}
                              onDrawStart={handleDrawStart}
                            />
                          </div>
                        )
                      })}

                      {isDragging && dragState && previewPos && (
                        <DragPreview
                          dragState={dragState}
                          position={previewPos}
                        />
                      )}

                      {drawPreview && (
                        <div
                          className="absolute pointer-events-none z-30 rounded-lg border-2 border-dashed border-primary/50 bg-primary/10 transition-[left,width] duration-75 ease-out"
                          style={{
                            left: `${drawPreview.left}px`,
                            top: `${drawPreview.top}px`,
                            width: `${drawPreview.width}px`,
                            height: `${drawPreview.height}px`,
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Right Push Drawer ─────────────────────────────────── */}
          <OperationsDrawer
            mode={drawerMode}
            onClose={handleCloseDrawer}
            selectedBooking={selectedBooking}
            onQuickCheckIn={handleDrawerCheckIn}
            onQuickCheckOut={handleDrawerCheckOut}
            onOpenDetail={handleDoubleClickBooking}
            createBookingPrefill={createBookingPrefill}
            onBookingCreated={handleBookingCreated}
            rooms={allRooms}
            todayStr={todayStr}
            roomTypeNameMap={roomTypeNameByRoomId}
            unassignedStays={unassignedStays}
          />
        </div>

        {/* Booking detail bottom sheet — mobile only (Sheet portals ignore CSS hiding) */}
        <MobileOnly>
          <BookingBottomSheet selected={selectedBooking} onClose={handleCloseSheet} />
        </MobileOnly>

        {/* Context menu (portal-rendered) */}
        {contextMenu && (
          <BookingContextMenu
            state={contextMenu}
            onClose={handleCloseContextMenu}
            onCheckIn={handleQuickCheckIn}
            onCheckOut={handleQuickCheckOut}
            onEarlyCheckout={handleContextOpenDetail}
            onOpenDetail={handleContextOpenDetail}
            onCancel={handleContextCancel}
            onTransfer={handleContextTransfer}
          />
        )}

        <KeyboardHelpDialog open={showKeyboardHelp} onOpenChange={setShowKeyboardHelp} />
        <CancelConfirmDialog target={cancelTarget} onClose={() => setCancelTarget(null)} onConfirm={handleConfirmCancel} />
        <CheckInConfirmDialog target={checkInTarget} onClose={() => setCheckInTarget(null)} onConfirm={handleConfirmCheckIn} />
        <CheckOutConfirmDialog target={checkOutTarget} onClose={() => setCheckOutTarget(null)} onConfirm={handleConfirmCheckOut} />
      </div>
    </TooltipProvider>
  )
}
