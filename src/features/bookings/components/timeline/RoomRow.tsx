import React, { useCallback, useMemo } from 'react'
import { addDays, differenceInDays, format, isToday, isSaturday, isSunday, parseISO, max, min, startOfDay } from 'date-fns'
import { cn } from '@/shared/utils'
import type { TimelineRoom, TimelineBooking } from '../../types'
import BookingBlock from './BookingBlock'
import { TIMELINE_WINDOW_DAYS } from './tokens'
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
  AVAILABLE:   'bg-success/60',
  OCCUPIED:    'bg-info',
  CLEANING:    'bg-warning',
  MAINTENANCE: 'bg-destructive',
}

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE:   'ว่าง',
  OCCUPIED:    'เข้าพัก',
  CLEANING:    'ทำความสะอาด',
  MAINTENANCE: 'ปิดซ่อม',
}

// ─── TimelineCell ─────────────────────────────────────────────────────────────

interface TimelineCellProps {
  roomId: string
  roomNumber: string
  cellDate: Date
  cellDateStr: string
  hasCoverage: boolean
  onEmptyCellClick?: (roomId: string, date: Date) => void
}

const TimelineCell = React.memo(function TimelineCell({
  roomId,
  roomNumber,
  cellDate,
  cellDateStr,
  hasCoverage,
  onEmptyCellClick,
}: TimelineCellProps) {
  const handleClick = useCallback(() => {
    onEmptyCellClick?.(roomId, cellDate)
  }, [onEmptyCellClick, roomId, cellDate])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onEmptyCellClick?.(roomId, cellDate)
    }
  }, [onEmptyCellClick, roomId, cellDate])

  if (hasCoverage) {
    return (
      <div
        className="flex-shrink-0 pointer-events-none"
        style={{ width: 'var(--timeline-cell-width)' }}
      />
    )
  }

  return (
    <button
      type="button"
      tabIndex={0}
      className={cn(
        'flex-shrink-0 cursor-pointer transition-colors',
        'hover:bg-primary/8',
        'focus-visible:outline-none focus-visible:bg-primary/10 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/30',
      )}
      style={{ width: 'var(--timeline-cell-width)' }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`จองห้อง ${roomNumber} วันที่ ${cellDateStr}`}
    />
  )
})

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
}: RoomRowProps) {
  const displayStatus = deriveDisplayStatus(room)
  const isEmpty = room.bookings.length === 0
  const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd')

  const windowStartStr = format(windowStart, 'yyyy-MM-dd')
  const windowEndStr   = format(windowEnd, 'yyyy-MM-dd')

  // Compute booking layer assignments for overlap handling
  const layout = useMemo(
    () => computeRoomLayout(room.bookings, windowStartStr, windowEndStr),
    [room.bookings, windowStartStr, windowEndStr],
  )

  return (
    <div
      className={cn(
        'flex border-b border-border/60',
        isEmpty && 'hover:bg-muted/30 transition-colors',
      )}
      style={{ height: `${rowHeight}px` }}
    >

      {/* ── Sticky room-label column ─────────────────────────────────────── */}
      <div
        className={cn(
          'sticky left-0 z-10',
          'w-timeline-room-col min-w-timeline-room-col max-w-timeline-room-col',
          'flex items-center gap-2 px-3',
          'bg-card border-r border-border',
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
            displayStatus === 'AVAILABLE' ? 'text-success/70' : 'text-muted-foreground/60',
          )}>
            {STATUS_LABEL[displayStatus]}
          </span>
        </div>
      </div>

      {/* ── Booking area ─────────────────────────────────────────────────── */}
      <div
        className="relative flex-1 min-w-timeline-7"
        style={{ height: `${rowHeight}px` }}
      >
        {/* Column grid lines + today highlight + weekend highlight + alternating row stripe */}
        <div className="absolute inset-0 flex pointer-events-none" aria-hidden>
          {Array.from({ length: TIMELINE_WINDOW_DAYS }).map((_, i) => {
            const cellDate  = addDays(windowStart, i)
            const todayCell = isToday(cellDate)
            const isWeekend = isSaturday(cellDate) || isSunday(cellDate)
            return (
              <div
                key={i}
                className={cn(
                  'border-r border-border/40 flex-shrink-0',
                  todayCell
                    ? 'bg-accent/60'
                    : isWeekend
                      ? 'bg-muted/30'
                      : isEven && 'bg-muted/15',
                )}
                style={{ width: 'var(--timeline-cell-width)' }}
              />
            )
          })}
        </div>

        {/* Clickable empty cells — interactive layer */}
        {onEmptyCellClick && (
          <div className="absolute inset-0 flex">
            {Array.from({ length: TIMELINE_WINDOW_DAYS }).map((_, i) => {
              const cellDate = addDays(windowStart, i)
              const cellDateStr = format(cellDate, 'yyyy-MM-dd')
              const hasCoverage = room.bookings.some(
                (b) => b.check_in <= cellDateStr && b.check_out > cellDateStr,
              )
              return (
                <TimelineCell
                  key={i}
                  roomId={room.id}
                  roomNumber={room.room_number}
                  cellDate={cellDate}
                  cellDateStr={cellDateStr}
                  hasCoverage={hasCoverage}
                  onEmptyCellClick={onEmptyCellClick}
                />
              )
            })}
          </div>
        )}

        {/* Booking blocks — positioned per layer assignment */}
        {room.bookings.map((booking) => {
          const checkIn      = parseISO(booking.check_in)
          const checkOut     = parseISO(booking.check_out)
          const clampedStart = max([checkIn, windowStart])
          const clampedEnd   = min([checkOut, windowEnd])

          const spanDays   = differenceInDays(clampedEnd, clampedStart)
          const offsetDays = differenceInDays(clampedStart, windowStart)

          if (spanDays <= 0) return null

          const colorClass = bookingColorMap[booking.booking_id]   ?? 'bg-secondary text-secondary-foreground'
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
            />
          )
        })}
      </div>
    </div>
  )
})

export default RoomRow
