import React, { useCallback, useMemo } from 'react'
import { addDays, differenceInDays, format, isToday, isSaturday, isSunday, parseISO, max, min, startOfDay } from 'date-fns'
import { cn } from '@/shared/utils'
import type { TimelineRoom, TimelineBooking } from '../../types'
import BookingBlock from './BookingBlock'
import { TIMELINE_CELL_WIDTH_PX, TIMELINE_WINDOW_DAYS } from './tokens'
import { computeRoomLayout } from './bookingLayout'
import type { DragMode, DragState } from './useTimelineDrag'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoomRowProps {
  room: TimelineRoom
  /** Room type name — shown as a label under the room number. */
  roomTypeName?: string
  windowStart: Date
  windowEnd: Date
  /** Pre-computed row height (px) — set by the virtualizer based on layer count. */
  rowHeight: number
  onSelectBooking: (booking: TimelineBooking, roomNumbers?: string[]) => void
  onEmptyCellClick?: (roomId: string, date: Date) => void
  isEven?: boolean
  bookingColorMap: Record<string, string>
  bookingRoomCountMap: Record<string, number>
  /** Called when user starts a drag or resize on a booking block. */
  onDragStart?: (
    e: React.PointerEvent,
    booking: TimelineBooking,
    roomId: string,
    mode: DragMode,
  ) => void
  /** Current drag state — passed through to BookingBlock for visual dimming. */
  dragState?: DragState | null
  /** Called to open context menu on a booking block. */
  onContextMenu?: (
    booking: TimelineBooking,
    roomId: string,
    roomNumber: string,
    x: number,
    y: number,
  ) => void
  /** Quick action: check-in. */
  onQuickCheckIn?: (booking: TimelineBooking, roomId: string) => void
  /** Quick action: check-out. */
  onQuickCheckOut?: (booking: TimelineBooking) => void
  /** Keyboard: move booking. */
  onKeyboardMove?: (booking: TimelineBooking, roomId: string, direction: 'left' | 'right' | 'up' | 'down') => void
  /** Keyboard: resize booking. */
  onKeyboardResize?: (booking: TimelineBooking, roomId: string, edge: 'extend' | 'shrink') => void
  /** Number of days visible in the timeline window. */
  windowDays?: number
  /** Called on pointer down on empty cell — used for draw-to-create. */
  onDrawStart?: (e: React.PointerEvent, roomId: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveDisplayStatus(
  room: TimelineRoom,
): 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE' {
  if (room.status === 'MAINTENANCE') return 'MAINTENANCE'
  if (room.status === 'CLEANING')    return 'CLEANING'
  const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd')
  const isOccupiedToday = room.bookings.some(
    (b) => b.check_in <= todayStr && b.check_out > todayStr,
  )
  if (isOccupiedToday) return 'OCCUPIED'
  return 'AVAILABLE'
}

const STATUS_DOT_CLASS: Record<string, string> = {
  AVAILABLE:   'bg-room-clean',
  OCCUPIED:    'bg-bk-checked-in',
  CLEANING:    'bg-room-dirty',
  MAINTENANCE: 'bg-room-ooo',
}

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE:   'ว่าง',
  OCCUPIED:    'เข้าพัก',
  CLEANING:    'ทำความสะอาด',
  MAINTENANCE: 'ปิดซ่อม',
}

// ─── RoomRow ──────────────────────────────────────────────────────────────────

const RoomRow = React.memo(function RoomRow({
  room,
  roomTypeName,
  windowStart,
  windowEnd,
  rowHeight,
  onSelectBooking,
  onEmptyCellClick,
  isEven = false,
  bookingColorMap,
  bookingRoomCountMap,
  onDragStart,
  dragState,
  onContextMenu,
  onQuickCheckIn,
  onQuickCheckOut,
  onKeyboardMove,
  onKeyboardResize,
  windowDays: windowDaysProp,
  onDrawStart,
}: RoomRowProps) {
  const windowDays = windowDaysProp ?? TIMELINE_WINDOW_DAYS
  const displayStatus = deriveDisplayStatus(room)
  const isEmpty = room.bookings.length === 0
  const today = startOfDay(new Date())
  const todayStr = format(today, 'yyyy-MM-dd')

  // Today indicator offset (column index within window, -1 if not visible)
  const todayOffset = useMemo(() => {
    const diff = differenceInDays(today, windowStart)
    return diff >= 0 && diff < windowDays ? diff : -1
  }, [today, windowStart, windowDays])

  const windowStartStr = format(windowStart, 'yyyy-MM-dd')
  const windowEndStr   = format(windowEnd, 'yyyy-MM-dd')

  // Compute booking layer assignments for overlap handling
  const layout = useMemo(
    () => computeRoomLayout(room.bookings, windowStartStr, windowEndStr),
    [room.bookings, windowStartStr, windowEndStr],
  )

  // Drag-target row highlight — shows green/red tint when a booking is being dragged onto this row
  const isDragTarget = dragState?.newRoomId === room.id
  const dragTargetClass = isDragTarget
    ? dragState?.hasConflict || dragState?.isMaintenanceRoom
      ? 'bg-destructive/8'
      : 'bg-success/8'
    : ''

  // ── Single click handler for the entire booking area ──────────────────
  // Converts pixel coordinates → dayIndex → date.
  // Booking blocks handle their own clicks; this only fires for empty areas.
  const handleAreaClick = useCallback((e: React.MouseEvent) => {
    // Ignore if the click was on a booking block (they handle their own clicks)
    if ((e.target as HTMLElement).closest('.tl-booking-block')) return
    if (!onEmptyCellClick) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x    = e.clientX - rect.left
    const dayIndex = Math.floor(x / TIMELINE_CELL_WIDTH_PX)
    if (dayIndex < 0 || dayIndex >= windowDays) return

    const clickedDate = addDays(windowStart, dayIndex)
    onEmptyCellClick(room.id, clickedDate)
  }, [onEmptyCellClick, room.id, windowStart, windowDays])

  // ── Draw-to-create: pointer down on empty area ────────────────────────
  const handleAreaPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.tl-booking-block')) return
    if (!onDrawStart) return
    onDrawStart(e, room.id)
  }, [onDrawStart, room.id])

  return (
    <div
      className={cn(
        'flex border-b border-border-soft group/row',
        isEmpty && 'hover:bg-muted/30 transition-colors',
        dragTargetClass,
      )}
      style={{ height: `${rowHeight}px` }}
    >

      {/* ── Sticky room-label column ─────────────────────────────────────── */}
      <div
        className={cn(
          'sticky left-0 z-10',
          'w-timeline-room-col min-w-timeline-room-col max-w-timeline-room-col',
          'flex items-center gap-2 px-3',
          'bg-sidebar border-r border-border-soft',
          'flex-shrink-0',
        )}
      >
        {/* Status dot */}
        <span
          className={cn(
            'w-2 h-2 rounded-full shrink-0',
            STATUS_DOT_CLASS[displayStatus] ?? 'bg-muted-foreground/40',
          )}
          aria-label={displayStatus}
        />
        {/* Room number + type + status */}
        <div className="min-w-0 flex flex-col">
          <span className="text-sm font-semibold text-foreground leading-none tabular-nums">
            {room.room_number}
          </span>
          {roomTypeName && (
            <span className="text-[10px] text-muted-foreground leading-tight truncate mt-0.5">
              {roomTypeName}
            </span>
          )}
          <span className={cn(
            'text-[9px] leading-tight mt-0.5',
            displayStatus === 'AVAILABLE' ? 'text-room-clean/80' : 'text-muted-foreground/60',
          )}>
            {STATUS_LABEL[displayStatus]}
          </span>
        </div>
      </div>

      {/* ── Booking area — single click handler, no per-cell elements ──── */}
      <div
        className="relative flex-1 bg-timeline-bg cursor-pointer"
        style={{ height: `${rowHeight}px`, minWidth: `calc(${windowDays} * var(--timeline-cell-width))` }}
        onClick={handleAreaClick}
        onPointerDown={handleAreaPointerDown}
      >
        {/* Grid lines (visual only) */}
        <div className="absolute inset-0 flex pointer-events-none" aria-hidden>
          {Array.from({ length: windowDays }).map((_, i) => {
            const cellDate  = addDays(windowStart, i)
            const todayCell = isToday(cellDate)
            const isWeekend = isSaturday(cellDate) || isSunday(cellDate)
            return (
              <div
                key={i}
                className={cn(
                  'border-r border-timeline-grid/50 flex-shrink-0',
                  todayCell
                    ? 'bg-primary/8'
                    : isWeekend
                      ? 'bg-muted/20'
                      : isEven && 'bg-accent/[0.04]',
                )}
                style={{ width: 'var(--timeline-cell-width)' }}
              />
            )
          })}
        </div>

        {/* Today vertical indicator line */}
        {todayOffset >= 0 && (
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-timeline-today/60 z-20 pointer-events-none"
            style={{ left: `calc(${todayOffset} * var(--timeline-cell-width))` }}
          />
        )}

        {/* Booking blocks — absolutely positioned, handle their own pointer events */}
        {room.bookings.map((booking) => {
          const checkIn      = parseISO(booking.check_in)
          const checkOut     = parseISO(booking.check_out)
          const clampedStart = max([checkIn, windowStart])
          const clampedEnd   = min([checkOut, windowEnd])

          const spanDays   = differenceInDays(clampedEnd, clampedStart)
          const offsetDays = differenceInDays(clampedStart, windowStart)

          if (spanDays <= 0) return null

          const colorClass = bookingColorMap[booking.room_stay_id]  ?? 'bg-secondary text-secondary-foreground'
          const roomCount  = bookingRoomCountMap[booking.booking_id] ?? 1
          const isUpcoming = booking.check_in > todayStr
          const showCheckoutEdge = checkOut > windowStart && checkOut <= windowEnd
          const layerInfo = layout.layers.get(booking.booking_id)

          return (
            <BookingBlock
              key={booking.room_stay_id}
              booking={booking}
              roomId={room.id}
              roomNumber={room.room_number}
              roomCount={roomCount}
              offsetDays={offsetDays}
              spanDays={spanDays}
              colorClass={colorClass}
              isUpcoming={isUpcoming}
              showCheckoutEdge={showCheckoutEdge}
              layerIndex={layerInfo?.layerIndex ?? 0}
              totalLayers={layout.totalLayers}
              onTap={onSelectBooking}
              onDragStart={onDragStart}
              dragState={dragState}
              onContextMenu={onContextMenu}
              onQuickCheckIn={onQuickCheckIn}
              onQuickCheckOut={onQuickCheckOut}
              onKeyboardMove={onKeyboardMove}
              onKeyboardResize={onKeyboardResize}
            />
          )
        })}
      </div>
    </div>
  )
})

export default RoomRow
