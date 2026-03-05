import React from 'react'
import { addDays, differenceInDays, format, isToday, parseISO, max, min, startOfDay } from 'date-fns'
import { cn } from '@/shared/utils'
import type { TimelineRoom, TimelineBooking } from '../../types'
import BookingBlock from './BookingBlock'
import { TIMELINE_WINDOW_DAYS } from './tokens'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoomRowProps {
  room: TimelineRoom
  /** Room type name — shown as a label under the room number. */
  roomTypeName?: string
  windowStart: Date
  windowEnd: Date
  onSelectBooking: (booking: TimelineBooking, roomNumbers?: string[]) => void
  isEven?: boolean
  bookingColorMap: Record<string, string>
  bookingRoomCountMap: Record<string, number>
  hoveredBookingId: string | null
  onBookingHoverStart: (bookingId: string) => void
  onBookingHoverEnd: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveDisplayStatus(
  room: TimelineRoom,
): 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE' {
  if (room.status === 'MAINTENANCE') return 'MAINTENANCE'
  if (room.status === 'CLEANING')    return 'CLEANING'
  // Check if any booking covers today (not just "has bookings in window")
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

// ─── RoomRow ──────────────────────────────────────────────────────────────────

const RoomRow = React.memo(function RoomRow({
  room,
  roomTypeName,
  windowStart,
  windowEnd,
  onSelectBooking,
  isEven = false,
  bookingColorMap,
  bookingRoomCountMap,
  hoveredBookingId,
  onBookingHoverStart,
  onBookingHoverEnd,
}: RoomRowProps) {
  const displayStatus = deriveDisplayStatus(room)
  const isEmpty = room.bookings.length === 0
  const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd')

  return (
    <div className={cn(
      'flex h-timeline-row border-b border-border/60',
      isEmpty && 'hover:bg-muted/30 transition-colors',
    )}>

      {/* ── Sticky room-label column ─────────────────────────────────────── */}
      <div
        className={cn(
          'sticky left-0 z-10',
          'w-timeline-room-col min-w-timeline-room-col max-w-timeline-room-col',
          'flex items-center gap-1.5 px-2',
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
        {/* Room number + type */}
        <div className="min-w-0 flex flex-col">
          <span className="text-xs font-semibold text-foreground leading-none">
            {room.room_number}
          </span>
          {roomTypeName && (
            <span className="text-[9px] text-muted-foreground leading-tight truncate mt-0.5">
              {roomTypeName}
            </span>
          )}
        </div>
      </div>

      {/* ── Booking area ─────────────────────────────────────────────────── */}
      <div
        className="relative flex-1 min-w-timeline-7"
        style={{ height: 'var(--timeline-row-height)' }}
      >
        {/* Column grid lines + today highlight + alternating row stripe */}
        <div className="absolute inset-0 flex pointer-events-none" aria-hidden>
          {Array.from({ length: TIMELINE_WINDOW_DAYS }).map((_, i) => {
            const cellDate  = addDays(windowStart, i)
            const todayCell = isToday(cellDate)
            return (
              <div
                key={i}
                className={cn(
                  'border-r border-border/40 flex-shrink-0',
                  todayCell ? 'bg-accent/50' : isEven && 'bg-muted/15',
                )}
                style={{ width: 'var(--timeline-cell-width)' }}
              />
            )
          })}
        </div>

        {/* Booking blocks */}
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
          const isHighlighted: boolean | null =
            hoveredBookingId === null
              ? null
              : hoveredBookingId === booking.booking_id
          const isUpcoming = booking.check_in > todayStr
          // Show checkout edge when checkout falls within the visible window
          const showCheckoutEdge = checkOut > windowStart && checkOut <= windowEnd

          return (
            <BookingBlock
              key={booking.booking_id}
              booking={booking}
              roomNumber={room.room_number}
              roomCount={roomCount}
              offsetDays={offsetDays}
              spanDays={spanDays}
              colorClass={colorClass}
              isHighlighted={isHighlighted}
              isUpcoming={isUpcoming}
              showCheckoutEdge={showCheckoutEdge}
              onHoverStart={() => onBookingHoverStart(booking.booking_id)}
              onHoverEnd={onBookingHoverEnd}
              onTap={onSelectBooking}
            />
          )
        })}
      </div>
    </div>
  )
})

export default RoomRow
