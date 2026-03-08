import { useState, useMemo, useCallback, useRef, useEffect, useSyncExternalStore } from 'react'
import { addDays, subDays, format, startOfDay } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/app/routes'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  ChevronLeft,
  ChevronRight,
  CalendarPlus,
  CalendarIcon,
  PanelRight,
  LogIn,
  LogOut,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/shared/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Calendar } from '@/shared/ui/calendar'
import { Separator } from '@/shared/ui/separator'
import toast from 'react-hot-toast'
import { cn } from '@/shared/utils'
import { useTimeline, useAvailabilityGrouped, useMoveStay } from '../hooks'
import type { TimelineBooking } from '../types'
import TimelineHeader from '../components/timeline/TimelineHeader'
import RoomRow from '../components/timeline/RoomRow'
import BookingBottomSheet from '../components/timeline/BookingBottomSheet'
import type { SelectedBookingContext } from '../components/timeline/BookingBottomSheet'
import DragPreview from '../components/timeline/DragPreview'
import type { RoomAvailability } from '../components/timeline/AvailabilitySummary'
import { OperationsDrawer, type DrawerMode } from '../components/timeline/OperationsDrawer'
import { MobileTimelineList } from '../components/timeline/MobileTimelineList'
import {
  TIMELINE_ROW_HEIGHT_PX,
  TIMELINE_WINDOW_DAYS,
  TIMELINE_OVERSCAN_ROWS,
  computeRowHeight,
} from '../components/timeline/tokens'
import { computeRoomLayout } from '../components/timeline/bookingLayout'
import { useInfiniteTimeline } from '../components/timeline/useInfiniteTimeline'
import { useTimelineDrag } from '../components/timeline/useTimelineDrag'
import { useTimelineDraw } from '../components/timeline/useTimelineDraw'
import { useTimelineActions } from '../components/timeline/useTimelineActions'
import BookingContextMenu, { type ContextMenuState } from '../components/timeline/BookingContextMenu'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/shared/ui/alert-dialog'

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

// ─── Status-based booking colors ──────────────────────────────────────────────

const STATUS_COLOR_MAP: Record<string, string> = {
  CONFIRMED:             'bg-bk-reserved text-bk-reserved-foreground',
  RESERVED:              'bg-bk-reserved text-bk-reserved-foreground',
  ASSIGNED:              'bg-bk-reserved text-bk-reserved-foreground',
  PARTIALLY_CHECKED_IN:  'bg-bk-reserved text-bk-reserved-foreground',
  CHECKED_IN:            'bg-bk-checked-in text-bk-checked-in-foreground',
  CHECKED_OUT:           'bg-bk-checked-out text-bk-checked-out-foreground',
  NO_SHOW:               'bg-bk-no-show text-bk-no-show-foreground',
  CANCELLED:             'bg-bk-cancelled/30 text-bk-cancelled-foreground',
}

const FALLBACK_STATUS_COLOR = 'bg-secondary text-secondary-foreground'

function getStatusColorClass(status: string): string {
  return STATUS_COLOR_MAP[status] ?? FALLBACK_STATUS_COLOR
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

function fmtThaiDate(d: Date): string {
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`
}

function fmtThaiRange(start: Date, end: Date): string {
  const s = `${start.getDate()} ${THAI_MONTHS_SHORT[start.getMonth()]}`
  const e = `${end.getDate()} ${THAI_MONTHS_SHORT[end.getMonth()]}`
  return `${s} — ${e}`
}

// ─── Zoom presets ─────────────────────────────────────────────────────────────

type ZoomLevel = '3d' | '7d' | '14d'

const ZOOM_CONFIG: Record<ZoomLevel, { label: string; cssWidth: string; pxWidth: number }> = {
  '3d':  { label: '3 วัน',  cssWidth: '16.25rem', pxWidth: 260 },  // 260px
  '7d':  { label: '7 วัน',  cssWidth: '7.5rem',   pxWidth: 120 },  // 120px (default)
  '14d': { label: '14 วัน', cssWidth: '4.375rem',  pxWidth: 70 },   // 70px
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const navigate = useNavigate()

  // ── Virtualisation ──────────────────────────────────────────────────────
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // ── Infinite timeline (replaces fixed window) ──────────────────────────
  const {
    bufferStart,
    bufferEnd,
    totalDays,
    days,
    fromStr,
    toStr,
    visibleStartDate,
    visibleDays,
    jumpToDate,
    jumpToToday,
    shiftBy,
  } = useInfiniteTimeline({ scrollContainerRef })

  // ── Filter state ──────────────────────────────────────────────────────────
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string | null>(null)

  // ── Zoom level ─────────────────────────────────────────────────────────
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('7d')

  // ── Operations drawer state ─────────────────────────────────────────────
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null)

  // ── Date picker state ───────────────────────────────────────────────────
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const datePickerRef = useRef<HTMLDivElement>(null)

  // Close date picker on click-outside
  useEffect(() => {
    if (!datePickerOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setDatePickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [datePickerOpen])

  // ── Bottom-sheet state ────────────────────────────────────────────────────
  const [selectedBooking, setSelectedBooking] = useState<SelectedBookingContext | null>(null)

  // ── Context menu + cancel dialog state ──────────────────────────────────
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [cancelTarget, setCancelTarget] = useState<TimelineBooking | null>(null)

  // ── Mobile single-day offset (0–6 within window) ──────────────────────────
  const [mobileDayOffset, setMobileDayOffset] = useState(3)

  // ── Derived date strings ──────────────────────────────────────────────────
  // These alias the infinite timeline's buffer for backwards compat
  const windowStart = bufferStart
  const windowEnd   = bufferEnd
  const zoomDays    = totalDays

  // ── KPIs are reactive to the visible center date ─────────────────────────
  const visibleCenterDate = useMemo(
    () => addDays(visibleStartDate, Math.floor(visibleDays / 2)),
    [visibleStartDate, visibleDays],
  )
  const availFrom = useMemo(() => format(startOfDay(visibleCenterDate), 'yyyy-MM-dd'), [visibleCenterDate])
  const availTo   = useMemo(() => format(addDays(startOfDay(visibleCenterDate), 1), 'yyyy-MM-dd'), [visibleCenterDate])

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: timelineData, isLoading, isError } = useTimeline(fromStr, toStr)

  const { data: availData, isLoading: availLoading } =
    useAvailabilityGrouped(availFrom, availTo)

  // ── Move stay mutation ──────────────────────────────────────────────────
  const moveStayMutation = useMoveStay()

  // ── Timeline quick actions (check-in / check-out / cancel) ────────────
  const timelineActions = useTimelineActions()

  // ── Derived data ──────────────────────────────────────────────────────────
  const allRooms        = timelineData?.rooms           ?? []
  const unassignedStays = timelineData?.unassigned_stays ?? []
  const availRoomTypes  = availData?.room_types          ?? []

  const roomAvailability = useMemo<RoomAvailability[]>(
    () =>
      availRoomTypes.map((rt) => ({
        room_type_id:    rt.room_type_id,
        room_type_name:  rt.room_type_name,
        total_rooms:     rt.rooms.length,
        available_rooms: rt.rooms.filter((r) => r.available).length,
        occupied_rooms:  rt.rooms.filter((r) => !r.available).length,
      })),
    [availRoomTypes],
  )

  const roomTypeIdByRoomId = useMemo(() => {
    const map: Record<string, string> = {}
    for (const rt of availRoomTypes) {
      for (const r of rt.rooms) map[r.room_id] = rt.room_type_id
    }
    return map
  }, [availRoomTypes])

  const roomTypeNameByRoomId = useMemo(() => {
    const map: Record<string, string> = {}
    for (const rt of availRoomTypes) {
      for (const r of rt.rooms) map[r.room_id] = rt.room_type_name
    }
    return map
  }, [availRoomTypes])

  const filteredRooms = useMemo(() => {
    if (!selectedRoomTypeId) return allRooms
    return allRooms.filter((r) => roomTypeIdByRoomId[r.id] === selectedRoomTypeId)
  }, [allRooms, selectedRoomTypeId, roomTypeIdByRoomId])

  const bookingRoomCountMap = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {}
    for (const room of allRooms) {
      for (const b of room.bookings) {
        counts[b.booking_id] = (counts[b.booking_id] ?? 0) + 1
      }
    }
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

  // Mobile uses a fixed 7-day window anchored at today
  const mobileWindowStart = useMemo(
    () => subDays(startOfDay(new Date()), Math.floor(TIMELINE_WINDOW_DAYS / 2)),
    [],
  )
  const mobileDays = useMemo(
    () => Array.from({ length: TIMELINE_WINDOW_DAYS }, (_, i) => addDays(mobileWindowStart, i)),
    [mobileWindowStart],
  )
  const mobileSelectedDateStr = useMemo(
    () => format(addDays(mobileWindowStart, mobileDayOffset), 'yyyy-MM-dd'),
    [mobileWindowStart, mobileDayOffset],
  )

  const todayStr = useMemo(() => format(startOfDay(new Date()), 'yyyy-MM-dd'), [])

  // ── KPI totals (memoized) ──────────────────────────────────────────────
  const kpiTotals = useMemo(() => {
    const total     = roomAvailability.reduce((s, r) => s + r.total_rooms, 0)
    const occupied  = roomAvailability.reduce((s, r) => s + r.occupied_rooms, 0)
    const available = roomAvailability.reduce((s, r) => s + r.available_rooms, 0)
    const occupancyPct = total > 0 ? Math.round((occupied / total) * 100) : 0
    return { total, occupied, available, occupancyPct }
  }, [roomAvailability])

  // ── KPI: Arrivals / Departures for visible center date ────────────────────
  const centerDateStr = availFrom
  const arrivalsDepartures = useMemo(() => {
    let arrivals = 0
    let departures = 0
    for (const room of allRooms) {
      for (const b of room.bookings) {
        if (b.check_in === centerDateStr) arrivals++
        if (b.check_out === centerDateStr) departures++
      }
    }
    return { arrivals, departures }
  }, [allRooms, centerDateStr])

  // ── Month jump options ────────────────────────────────────────────────────
  const monthOptions = useMemo(() => {
    const now = new Date()
    const result: { value: string; label: string }[] = []
    for (let i = -2; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      result.push({
        value: format(d, 'yyyy-MM-dd'),
        label: `${THAI_MONTHS_FULL[d.getMonth()]} ${d.getFullYear() + 543}`,
      })
    }
    return result
  }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePrev  = useCallback(() => shiftBy(-7), [shiftBy])
  const handleNext  = useCallback(() => shiftBy(7), [shiftBy])
  const handleToday = useCallback(() => {
    jumpToToday()
    setMobileDayOffset(Math.floor(TIMELINE_WINDOW_DAYS / 2))
  }, [jumpToToday])

  const handleJumpToDate = useCallback((date: Date) => {
    jumpToDate(date)
    setDatePickerOpen(false)
  }, [jumpToDate])

  const handleMonthJump = useCallback((isoDate: string) => {
    const [y, m] = isoDate.split('-').map(Number)
    jumpToDate(new Date(y, m - 1, 1))
  }, [jumpToDate])

  const handleZoomChange = useCallback((level: ZoomLevel) => {
    setZoomLevel(level)
    const cfg = ZOOM_CONFIG[level]
    document.documentElement.style.setProperty('--timeline-cell-width', cfg.cssWidth)
  }, [])

  const handleRoomTypeSelect     = useCallback((id: string | null) => setSelectedRoomTypeId(id), [])
  const handleSelectBooking      = useCallback((b: TimelineBooking, roomNumbers?: string[]) => {
    const rooms = roomNumbers ?? allRooms
      .filter((r) => r.bookings.some((bk) => bk.booking_id === b.booking_id))
      .map((r) => r.room_number)
    setSelectedBooking({ booking: b, roomNumbers: rooms })
    // On desktop, open the push drawer in booking-detail mode
    setDrawerMode('booking-detail')
  }, [allRooms])
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
    timelineActions.checkIn({
      bookingId: b.booking_id,
      roomStayId: b.room_stay_id,
      roomId: room.id,
    })
    handleCloseDrawer()
  }, [allRooms, timelineActions, handleCloseDrawer])
  const handleDrawerCheckOut = useCallback((b: TimelineBooking) => {
    timelineActions.checkOut({
      bookingId: b.booking_id,
      roomStayId: b.room_stay_id,
    })
    handleCloseDrawer()
  }, [timelineActions, handleCloseDrawer])
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
      timelineActions.checkIn({
        bookingId: booking.booking_id,
        roomStayId: booking.room_stay_id,
        roomId,
      })
    },
    [timelineActions],
  )

  const handleQuickCheckOut = useCallback(
    (booking: TimelineBooking) => {
      timelineActions.checkOut({
        bookingId: booking.booking_id,
        roomStayId: booking.room_stay_id,
      })
    },
    [timelineActions],
  )

  const handleContextOpenDetail = useCallback(
    (booking: TimelineBooking) => {
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

  // ── Room position helpers for drag ────────────────────────────────────
  const gridContainerRef = useRef<HTMLDivElement>(null)

  const getRoomTop = useCallback(
    (roomId: string): number | undefined => {
      const idx = filteredRooms.findIndex((r) => r.id === roomId)
      if (idx === -1) return undefined
      let top = 0
      for (let i = 0; i < idx; i++) top += getRowHeight(i)
      return top
    },
    [filteredRooms, getRowHeight],
  )

  const getRoomHeight = useCallback(
    (roomId: string): number => {
      const layers = roomLayerCountMap[roomId] ?? 1
      return computeRowHeight(layers)
    },
    [roomLayerCountMap],
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
  })

  // ── Draw to create ──────────────────────────────────────────────────────
  const handleDrawComplete = useCallback(
    (roomId: string, checkIn: string, checkOut: string) => {
      const roomTypeId = roomTypeIdByRoomId[roomId] ?? ''
      const params = new URLSearchParams({ check_in: checkIn, check_out: checkOut, room_id: roomId })
      if (roomTypeId) params.set('room_type_id', roomTypeId)
      navigate(`${ROUTES.bookings.new}?${params.toString()}`)
    },
    [navigate, roomTypeIdByRoomId],
  )

  const { drawPreview, handleDrawStart } = useTimelineDraw({
    rooms: filteredRooms,
    windowStart,
    windowDays: zoomDays,
    scrollContainerRef,
    onDrawComplete: handleDrawComplete,
    getRoomTop,
    getRoomHeight,
    isDragging,
  })

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="flex flex-col h-full overflow-hidden bg-background">

        {/* ════════════════════════════════════════════════════════════════
            UNIFIED HEADER — 48px professional PMS control bar
            LEFT: Today + Date Nav | CENTER: Zoom + Month | RIGHT: KPIs + Actions
            ════════════════════════════════════════════════════════════════ */}
        <div className="h-12 shrink-0 flex items-center gap-1 px-2 border-b border-border-soft bg-sidebar">

          {/* ── LEFT ZONE: Today + Date Navigation ──────────────────── */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="h-7 px-2 text-[11px] shrink-0"
              >
                วันนี้
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">กลับไปวันนี้</TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-0">
            <Button variant="ghost" size="icon" onClick={handlePrev} className="h-7 w-7">
              <ChevronLeft size={14} />
            </Button>

            {/* Clickable center date → calendar popover */}
            <div className="relative" ref={datePickerRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDatePickerOpen((v) => !v)}
                className={cn(
                  'h-7 px-2 text-[11px] font-semibold tabular-nums gap-1.5',
                  datePickerOpen && 'bg-muted',
                )}
              >
                <CalendarIcon size={12} className="text-muted-foreground" />
                <span className="hidden sm:inline">{fmtThaiDate(visibleCenterDate)}</span>
                <span className="sm:hidden">{fmtThaiRange(visibleStartDate, addDays(visibleStartDate, visibleDays - 1))}</span>
              </Button>

              {datePickerOpen && (
                <div className="absolute left-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-popover">
                  <div className="p-3 w-72">
                    <Calendar
                      pendingStart={visibleCenterDate}
                      pendingEnd={null}
                      hoveredDate={null}
                      onDayClick={handleJumpToDate}
                      onDayHover={() => {}}
                      initialViewDate={visibleCenterDate}
                    />
                  </div>
                  {/* Quick month jump grid */}
                  <div className="border-t border-border px-3 pb-2 pt-1.5">
                    <p className="text-[10px] text-muted-foreground mb-1">ข้ามไปเดือน</p>
                    <div className="grid grid-cols-3 gap-1">
                      {monthOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { handleMonthJump(opt.value); setDatePickerOpen(false) }}
                          className="text-[10px] px-1.5 py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-center truncate"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button variant="ghost" size="icon" onClick={handleNext} className="h-7 w-7">
              <ChevronRight size={14} />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-5 hidden md:block mx-0.5" />

          {/* ── CENTER ZONE: Zoom Control ───────────────────────────── */}
          <div className="hidden md:flex items-center bg-muted/50 rounded-md p-0.5">
            {(['3d', '7d', '14d'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => handleZoomChange(level)}
                className={cn(
                  'px-2 py-0.5 text-[11px] font-medium rounded transition-colors',
                  zoomLevel === level
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {ZOOM_CONFIG[level].label}
              </button>
            ))}
          </div>

          {/* Room type filter */}
          <div className="hidden md:block ml-0.5">
            <Select
              value={selectedRoomTypeId ?? '__all__'}
              onValueChange={(v) => handleRoomTypeSelect(v === '__all__' ? null : v)}
            >
              <SelectTrigger className="h-7 w-[110px] text-[11px] border-border-soft">
                <SelectValue placeholder="ทุกประเภท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">ทุกประเภท</SelectItem>
                {roomAvailability.map((rt) => (
                  <SelectItem key={rt.room_type_id} value={rt.room_type_id}>
                    {rt.room_type_name} ({rt.available_rooms})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Spacer ─────────────────────────────────────────────── */}
          <div className="flex-1" />

          {/* ── RIGHT ZONE: Live KPIs (reactive to visible center date) ── */}
          <div className="hidden lg:flex items-center gap-3 text-[11px] tabular-nums mr-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-default">
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    kpiTotals.occupancyPct >= 90 ? 'bg-destructive' : 'bg-info',
                  )} />
                  <span className="text-muted-foreground">OCC</span>
                  <span className="font-semibold text-foreground">
                    {kpiTotals.total > 0 ? `${kpiTotals.occupancyPct}%` : '—'}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Occupancy ({fmtThaiDate(visibleCenterDate)})</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-default">
                  <LogIn size={11} className="text-success shrink-0" />
                  <span className="text-muted-foreground">ARR</span>
                  <span className="font-semibold text-foreground">{arrivalsDepartures.arrivals}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">เช็คอินวันที่ {fmtThaiDate(visibleCenterDate)}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-default">
                  <LogOut size={11} className="text-warning shrink-0" />
                  <span className="text-muted-foreground">DEP</span>
                  <span className="font-semibold text-foreground">{arrivalsDepartures.departures}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">เช็คเอาท์วันที่ {fmtThaiDate(visibleCenterDate)}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-default">
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    kpiTotals.available === 0 ? 'bg-destructive' : 'bg-success',
                  )} />
                  <span className="text-muted-foreground">AVL</span>
                  <span className="font-semibold text-foreground">
                    {availLoading ? '…' : kpiTotals.available}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">ห้องว่าง ({fmtThaiDate(visibleCenterDate)})</TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-5 hidden sm:block" />

          {/* ── Actions ─────────────────────────────────────────────── */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(ROUTES.bookings.new)}
            className="h-7 px-2 text-[11px] gap-1 hidden sm:flex"
          >
            <CalendarPlus size={12} />
            จอง
          </Button>

          <Button
            variant={drawerMode === 'ops' ? 'default' : 'ghost'}
            size="icon"
            onClick={handleToggleOpsDrawer}
            className="h-7 w-7"
            aria-label="เปิดแผงปฏิบัติการ"
          >
            <PanelRight size={14} />
          </Button>
        </div>

        {/* ── Mobile: day selector + MobileTimelineList (< md) ────── */}
        {!isLoading && !isError && (
          <div className="md:hidden flex flex-col flex-1 overflow-hidden">
            <div className="shrink-0 flex border-b border-border-soft bg-sidebar overflow-x-auto">
              {mobileDays.map((day, i) => {
                const isActive = i === mobileDayOffset
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setMobileDayOffset(i)}
                    className={`flex-1 min-w-[3rem] flex flex-col items-center py-2 gap-0.5 text-center transition-colors ${
                      isActive
                        ? 'date-selected'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span className="text-[10px] font-medium leading-none">
                      {['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'][day.getDay()]}
                    </span>
                    <span className="text-sm font-semibold leading-none">
                      {format(day, 'd')}
                    </span>
                  </button>
                )
              })}
            </div>

            <MobileTimelineList
              rooms={filteredRooms}
              selectedDateStr={mobileSelectedDateStr}
              bookingColorMap={bookingColorMap}
              roomTypeNameMap={roomTypeNameByRoomId}
              unassignedStays={unassignedStays}
              onSelectBooking={handleSelectBooking}
            />
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            DESKTOP: Timeline + Push Drawer (>= md)
            The scroll container ALWAYS renders so useInfiniteTimeline
            can attach its scroll listener on mount.
            ════════════════════════════════════════════════════════════════ */}
        <div className="hidden md:flex flex-1 overflow-hidden">

          {/* Timeline area — flex-1 shrinks when drawer opens */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

            {/* Timeline grid — ALWAYS mounted for infinite scroll hook */}
            <div ref={scrollContainerRef} className="flex-1 overflow-auto">

              {/* Loading skeleton */}
              {isLoading && (
                <div>
                  <div className="h-10 flex items-center px-3 border-b border-border-soft bg-card/50">
                    <div className="w-48 h-4 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="flex border-b border-border-soft bg-sidebar">
                    <div
                      className="flex-shrink-0 border-r border-border-soft"
                      style={{ width: 'var(--timeline-room-col-width)' }}
                    />
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex flex-col items-center justify-center gap-1 flex-shrink-0 border-r border-border-soft py-2"
                        style={{ width: 'var(--timeline-cell-width)' }}
                      >
                        <div className="w-6 h-3 bg-muted rounded animate-pulse" />
                        <div className="w-4 h-4 bg-muted rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                  {Array.from({ length: 8 }).map((_, rowIdx) => (
                    <div key={rowIdx} className="flex border-b border-border-soft" style={{ height: 'var(--timeline-row-height)' }}>
                      <div
                        className="flex-shrink-0 border-r border-border-soft flex items-center gap-2 px-3"
                        style={{ width: 'var(--timeline-room-col-width)' }}
                      >
                        <div className="w-2 h-2 rounded-full bg-muted animate-pulse" />
                        <div className="flex flex-col gap-1">
                          <div className="w-8 h-3 bg-muted rounded animate-pulse" />
                          <div className="w-14 h-2 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                      <div className="flex-1 flex items-center px-1">
                        {rowIdx % 3 !== 2 && (
                          <div
                            className="h-[40px] bg-muted/60 rounded-lg animate-pulse"
                            style={{
                              width: `calc(${(rowIdx % 3) + 2} * var(--timeline-cell-width) - 8px)`,
                              marginLeft: `calc(${rowIdx % 4} * var(--timeline-cell-width) + 4px)`,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Error state */}
              {isError && !isLoading && (
                <div className="flex items-center justify-center py-20 px-6">
                  <p className="text-body text-destructive text-center">
                    โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่
                  </p>
                </div>
              )}

              {/* Timeline content */}
              {!isLoading && !isError && (
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
                              onQuickCheckIn={handleQuickCheckIn}
                              onQuickCheckOut={handleQuickCheckOut}
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
            onOpenDetail={handleContextOpenDetail}
            onCancel={handleContextCancel}
          />
        )}

        {/* Cancel confirmation dialog */}
        <AlertDialog open={cancelTarget !== null} onOpenChange={(open) => !open && setCancelTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ยืนยันการยกเลิก</AlertDialogTitle>
              <AlertDialogDescription>
                ต้องการยกเลิกการจองของ <strong>{cancelTarget?.guest_name}</strong>{' '}
                ({cancelTarget?.check_in} → {cancelTarget?.check_out}) ใช่หรือไม่?
                การดำเนินการนี้ไม่สามารถย้อนกลับได้
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmCancel}>
                ยืนยัน ยกเลิกการจอง
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
