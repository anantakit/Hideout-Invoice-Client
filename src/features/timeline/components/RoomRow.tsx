import React, { useCallback, useMemo } from 'react'
import { addDays, differenceInDays, format, isToday, isSaturday, isSunday, parseISO, max, min, startOfDay } from 'date-fns'
import { cn, todayISO } from '@/shared/utils'
import type { TimelineRoom } from '@/features/bookings/types'
import BookingBlock from './BookingBlock'
import { TIMELINE_WINDOW_DAYS } from '../utils/tokens'
import { computeRoomLayout } from '../utils/bookingLayout'
import { useTimelineContext } from '../context/TimelineContext'
import { useTimelineCallbacks } from '../context/TimelineCallbackContext'
import { useDragStateContext } from '../context/DragStateContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoomRowProps {
  room: TimelineRoom
  /** Room type name — shown as a label under the room number. */
  roomTypeName?: string
  /** Pre-computed row height (px) — set by the virtualizer based on layer count. */
  rowHeight: number
  isEven?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveDisplayStatus(
  room: TimelineRoom,
  todayStr: string,
): 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE' {
  if (room.status === 'MAINTENANCE') return 'MAINTENANCE'
  if (room.status === 'CLEANING')    return 'CLEANING'
  const isOccupiedToday = room.bookings.some(
    (b) => b.check_in.slice(0, 10) <= todayStr && b.check_out.slice(0, 10) > todayStr,
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
  rowHeight,
  isEven = false,
}: RoomRowProps) {
  const { windowStart, windowEnd, zoomDays, bookingColorMap, bookingRoomCountMap } = useTimelineContext()
  const { onDrawStart } = useTimelineCallbacks()
  const { dragState } = useDragStateContext()

  const windowDays = zoomDays ?? TIMELINE_WINDOW_DAYS
  const todayStr = useMemo(() => todayISO(), [])
  const displayStatus = useMemo(() => deriveDisplayStatus(room, todayStr), [room, todayStr])
  const isEmpty = room.bookings.length === 0
  const today = startOfDay(new Date())

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
    // Ignore if the click was on an active booking block (CHECKED_OUT blocks are passthrough)
    const block = (e.target as HTMLElement).closest('.tl-booking-block') as HTMLElement | null
    if (block && block.dataset.stayStatus !== 'CHECKED_OUT') return
  }, [])

  // ── Draw-to-create: pointer down on empty area ────────────────────────
  // Allow draw through CHECKED_OUT blocks (they're history, room is available).
  const handleAreaPointerDown = useCallback((e: React.PointerEvent) => {
    const block = (e.target as HTMLElement).closest('.tl-booking-block') as HTMLElement | null
    if (block && block.dataset.stayStatus !== 'CHECKED_OUT') return
    onDrawStart(e, room.id)
  }, [onDrawStart, room.id])

  return (
    <div
      role="row"
      aria-label={`ห้อง ${room.room_number}`}
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
        {/* Grid lines (visual only — memoized to avoid re-render on drag) */}
        {useMemo(() => (
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
        ), [windowDays, windowStart, isEven])}

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
          const isUpcoming = booking.check_in.slice(0, 10) > todayStr
          const showCheckoutEdge = checkOut > windowStart && checkOut <= windowEnd
          const layerInfo = layout.layers.get(booking.room_stay_id)

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
            />
          )
        })}
      </div>
    </div>
  )
})

export default RoomRow
