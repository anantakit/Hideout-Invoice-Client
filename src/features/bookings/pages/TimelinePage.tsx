import { useState, useMemo, useCallback, useRef } from 'react'
import { addDays, subDays, format, startOfDay } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/app/routes'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronLeft, ChevronRight, CalendarPlus, Footprints, Headset, Globe } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { TooltipProvider } from '@/shared/ui/tooltip'
import toast from 'react-hot-toast'
import { useTimeline, useAvailabilityGrouped, useMoveStay } from '../hooks'
import type { TimelineBooking } from '../types'
import type { SelectedBookingContext } from '../components/timeline/BookingBottomSheet'
import TimelineHeader from '../components/timeline/TimelineHeader'
import RoomRow from '../components/timeline/RoomRow'
import BookingBottomSheet from '../components/timeline/BookingBottomSheet'
import DragPreview from '../components/timeline/DragPreview'
import { AvailabilitySummary } from '../components/timeline/AvailabilitySummary'
import type { RoomAvailability } from '../components/timeline/AvailabilitySummary'
import { PendingAssignmentsPanel } from '../components/timeline/PendingAssignmentsPanel'
import { DesktopOperationsPanel } from '../components/timeline/DesktopOperationsPanel'
import { MobileTimelineList } from '../components/timeline/MobileTimelineList'
import {
  TIMELINE_ROW_HEIGHT_PX,
  TIMELINE_WINDOW_DAYS,
  TIMELINE_OVERSCAN_ROWS,
  computeRowHeight,
} from '../components/timeline/tokens'
import { computeRoomLayout } from '../components/timeline/bookingLayout'
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

// ─── Status-based booking colors ──────────────────────────────────────────────

/**
 * Status-based booking palette — each booking block gets its color from its
 * stay status, not a random hash. This provides instant visual semantics:
 * blue = reserved, green = checked-in, gray = checked-out, etc.
 *
 * Uses design-system tokens (--bk-*) defined in index.css / tailwind.config.js.
 */
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

function fmtThaiRange(start: Date, end: Date): string {
  const s = `${start.getDate()} ${THAI_MONTHS_SHORT[start.getMonth()]}`
  const e = `${end.getDate()} ${THAI_MONTHS_SHORT[end.getMonth()]} ${(end.getFullYear() + 543).toString()}`
  return `${s} — ${e}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const navigate = useNavigate()

  // ── Window state ─────────────────────────────────────────────────────────
  const [zoomDays, setZoomDays] = useState(TIMELINE_WINDOW_DAYS)
  const [windowStart, setWindowStart] = useState<Date>(() =>
    subDays(startOfDay(new Date()), Math.floor(TIMELINE_WINDOW_DAYS / 2)),
  )

  // ── Filter state ──────────────────────────────────────────────────────────
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string | null>(null)

  // ── Bottom-sheet state ────────────────────────────────────────────────────
  const [selectedBooking, setSelectedBooking] = useState<SelectedBookingContext | null>(null)

  // ── Context menu + cancel dialog state ──────────────────────────────────
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [cancelTarget, setCancelTarget] = useState<TimelineBooking | null>(null)

  // ── Mobile single-day offset (0–6 within window) ──────────────────────────
  const [mobileDayOffset, setMobileDayOffset] = useState(3) // start on "today"

  // ── Derived date strings ──────────────────────────────────────────────────
  const windowEnd = useMemo(
    () => addDays(windowStart, zoomDays),
    [windowStart, zoomDays],
  )

  const fromStr = useMemo(() => format(windowStart, 'yyyy-MM-dd'), [windowStart])
  const toStr   = useMemo(() => format(windowEnd,   'yyyy-MM-dd'), [windowEnd])

  const availTo = useMemo(
    () => format(addDays(windowStart, 1), 'yyyy-MM-dd'),
    [windowStart],
  )

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: timelineData, isLoading, isError } = useTimeline(fromStr, toStr)

  const { data: availData, isLoading: availLoading } =
    useAvailabilityGrouped(fromStr, availTo)

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

  // Precompute per-room layer count for dynamic row heights
  const roomLayerCountMap = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    const wsStr = format(windowStart, 'yyyy-MM-dd')
    const weStr = format(addDays(windowStart, zoomDays), 'yyyy-MM-dd')
    for (const room of allRooms) {
      if (room.bookings.length <= 1) {
        map[room.id] = room.bookings.length
      } else {
        const layout = computeRoomLayout(room.bookings, wsStr, weStr)
        map[room.id] = layout.totalLayers
      }
    }
    return map
  }, [allRooms, windowStart, zoomDays])

  const days = useMemo(
    () => Array.from({ length: zoomDays }, (_, i) => addDays(windowStart, i)),
    [windowStart, zoomDays],
  )

  const mobileSelectedDateStr = useMemo(
    () => format(addDays(windowStart, mobileDayOffset), 'yyyy-MM-dd'),
    [windowStart, mobileDayOffset],
  )

  // Desktop operations panel uses today's date by default
  const todayStr = useMemo(() => format(startOfDay(new Date()), 'yyyy-MM-dd'), [])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePrev = useCallback(() => {
    setWindowStart((d) => subDays(d, zoomDays))
    setMobileDayOffset(Math.floor(zoomDays / 2))
  }, [zoomDays])
  const handleNext = useCallback(() => {
    setWindowStart((d) => addDays(d, zoomDays))
    setMobileDayOffset(Math.floor(zoomDays / 2))
  }, [zoomDays])
  const handleToday = useCallback(() => {
    setWindowStart(subDays(startOfDay(new Date()), Math.floor(zoomDays / 2)))
    setMobileDayOffset(Math.floor(zoomDays / 2))
  }, [zoomDays])

  const handleRoomTypeSelect     = useCallback((id: string | null) => setSelectedRoomTypeId(id), [])
  const handleSelectBooking      = useCallback((b: TimelineBooking, roomNumbers?: string[]) => {
    const rooms = roomNumbers ?? allRooms
      .filter((r) => r.bookings.some((bk) => bk.booking_id === b.booking_id))
      .map((r) => r.room_number)
    setSelectedBooking({ booking: b, roomNumbers: rooms })
  }, [allRooms])
  const handleCloseSheet         = useCallback(() => setSelectedBooking(null as SelectedBookingContext | null), [])
  const handleEmptyCellClick     = useCallback((roomId: string, date: Date) => {
    const checkIn = format(date, 'yyyy-MM-dd')
    const roomTypeId = roomTypeIdByRoomId[roomId] ?? ''
    const params = new URLSearchParams({ check_in: checkIn, room_id: roomId })
    if (roomTypeId) params.set('room_type_id', roomTypeId)
    navigate(`${ROUTES.bookings.new}?${params.toString()}`)
  }, [navigate, roomTypeIdByRoomId])

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
  const scrollContainerRef = useRef<HTMLDivElement>(null)

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
      // Compute cumulative height so this works for ALL rooms,
      // not just ones currently visible in the virtualizer
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
            HEADER — shared between desktop and mobile
            ════════════════════════════════════════════════════════════════ */}
        <div className="shrink-0 bg-sidebar border-b border-border-soft px-4 py-2.5">
          <div className="flex items-center justify-between">
            <h1 className="text-section text-base">Timeline</h1>

            <div className="flex items-center gap-2">
              <span className="text-helper font-medium tabular-nums hidden sm:inline">
                {fmtThaiRange(windowStart, subDays(windowEnd, 1))}
              </span>

              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrev}
                  className="h-7 w-7"
                  aria-label="สัปดาห์ก่อนหน้า"
                >
                  <ChevronLeft size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToday}
                  className="h-6 px-2.5 text-[11px]"
                >
                  วันนี้
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  className="h-7 w-7"
                  aria-label="สัปดาห์ถัดไป"
                >
                  <ChevronRight size={14} />
                </Button>
              </div>

              {/* Zoom levels */}
              <div className="hidden md:flex items-center gap-0.5 ml-2 border-l border-border pl-2">
                {([3, 7, 14] as const).map((d) => (
                  <Button
                    key={d}
                    variant={zoomDays === d ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setZoomDays(d)
                      setWindowStart(subDays(startOfDay(new Date()), Math.floor(d / 2)))
                    }}
                    className="h-6 px-2 text-[11px]"
                  >
                    {d}D
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            LOADING / ERROR
            ════════════════════════════════════════════════════════════════ */}
        {isLoading && (
          <div className="flex-1 overflow-hidden">
            {/* Skeleton header */}
            <div className="flex border-b border-border-soft bg-sidebar">
              <div
                className="flex-shrink-0 border-r border-border-soft"
                style={{ width: 'var(--timeline-room-col-width)' }}
              />
              {Array.from({ length: zoomDays }).map((_, i) => (
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
            {/* Skeleton rows */}
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

        {isError && !isLoading && (
          <div className="flex-1 flex items-center justify-center px-6">
            <p className="text-body text-destructive text-center">
              โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่
            </p>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            MAIN CONTENT
            ════════════════════════════════════════════════════════════════ */}
        {!isLoading && !isError && (
          <>
            {/* ── Mobile: day selector + MobileTimelineList (< md) ────── */}
            <div className="md:hidden flex flex-col flex-1 overflow-hidden">
              {/* Day picker tabs */}
              <div className="shrink-0 flex border-b border-border-soft bg-sidebar overflow-x-auto">
                {days.map((day, i) => {
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

              {/* Mobile card list */}
              <MobileTimelineList
                rooms={filteredRooms}
                selectedDateStr={mobileSelectedDateStr}
                bookingColorMap={bookingColorMap}
                roomTypeNameMap={roomTypeNameByRoomId}
                unassignedStays={unassignedStays}
                onSelectBooking={handleSelectBooking}
              />
            </div>

            {/* ── Desktop: Operations panel + Timeline grid (>= md) ───── */}
            <div className="hidden md:flex flex-1 overflow-hidden">

              {/* Left: Operations Panel */}
              <div
                className="shrink-0 border-r border-border-soft bg-card overflow-hidden"
                style={{ width: 'var(--timeline-ops-panel-width)' }}
              >
                <DesktopOperationsPanel
                  rooms={allRooms}
                  selectedDateStr={todayStr}
                  roomTypeNameMap={roomTypeNameByRoomId}
                  unassignedStays={unassignedStays}
                />
              </div>

              {/* Right: Timeline grid */}
              <div className="flex-1 flex flex-col overflow-hidden">

                {/* Availability summary (room type filter) */}
                <AvailabilitySummary
                  date={windowStart}
                  roomTypes={roomAvailability}
                  selectedRoomTypeId={selectedRoomTypeId}
                  onSelect={handleRoomTypeSelect}
                  isLoading={availLoading}
                />

                {/* Status color legend + source icons */}
                <div className="shrink-0 flex items-center gap-5 px-4 py-1.5 border-b border-border-soft bg-sidebar">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded-sm bg-bk-reserved" />
                    <span className="text-[10px] text-muted-foreground">จอง</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded-sm bg-bk-checked-in" />
                    <span className="text-[10px] text-muted-foreground">เข้าพัก</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded-sm bg-bk-checked-out opacity-45" />
                    <span className="text-[10px] text-muted-foreground">เช็คเอาท์</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded-sm border border-dashed border-bk-cancelled/50 opacity-50" />
                    <span className="text-[10px] text-muted-foreground">ยกเลิก</span>
                  </div>
                  <span className="w-px h-3 bg-border-soft" />
                  <div className="flex items-center gap-1.5">
                    <Footprints className="w-3 h-3 text-muted-foreground/60" />
                    <span className="text-[10px] text-muted-foreground/60">Walk-in</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Headset className="w-3 h-3 text-muted-foreground/60" />
                    <span className="text-[10px] text-muted-foreground/60">Staff</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-muted-foreground/60" />
                    <span className="text-[10px] text-muted-foreground/60">Online</span>
                  </div>
                </div>

                {/* Pending assignments (collapsible) */}
                <PendingAssignmentsPanel stays={unassignedStays} />

                {/* Timeline grid with virtualisation */}
                <div ref={scrollContainerRef} className="flex-1 overflow-auto">
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
                                onEmptyCellClick={handleEmptyCellClick}
                                isEven={virtualRow.index % 2 === 0}
                                bookingColorMap={bookingColorMap}
                                bookingRoomCountMap={bookingRoomCountMap}
                                onDragStart={handleDragStart}
                                dragState={dragState}
                                onContextMenu={handleOpenContextMenu}
                                windowDays={zoomDays}
                                onKeyboardMove={handleKeyboardMove}
                                onKeyboardResize={handleKeyboardResize}
                                onQuickCheckIn={handleQuickCheckIn}
                                onQuickCheckOut={handleQuickCheckOut}
                                onDrawStart={handleDrawStart}
                              />
                            </div>
                          )
                        })}

                        {/* Drag preview overlay */}
                        {isDragging && dragState && previewPos && (
                          <DragPreview
                            dragState={dragState}
                            position={previewPos}
                          />
                        )}

                        {/* Draw-to-create preview */}
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
                </div>
              </div>
            </div>
          </>
        )}

        {/* Booking detail bottom sheet */}
        <BookingBottomSheet selected={selectedBooking} onClose={handleCloseSheet} />

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
