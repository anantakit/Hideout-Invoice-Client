import React from 'react'
import { differenceInDays, parseISO, max, min } from 'date-fns'
import { cn } from '@/shared/utils'
import type { TimelineRoom, TimelineBooking } from '../../types'
import BookingBlock from './BookingBlock'

interface RoomRowProps {
  room: TimelineRoom
  windowStart: Date
  windowEnd: Date
  onSelectBooking: (booking: TimelineBooking) => void
}

/**
 * Maps the physical room status + booking presence to a display status.
 * The backend returns ACTIVE/CLEANING/MAINTENANCE for the room's physical state.
 * OCCUPIED is derived: ACTIVE room with at least one booking in the window.
 */
function deriveDisplayStatus(
  room: TimelineRoom,
): 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE' {
  if (room.status === 'MAINTENANCE') return 'MAINTENANCE'
  if (room.status === 'CLEANING') return 'CLEANING'
  if (room.bookings.length > 0) return 'OCCUPIED'
  return 'AVAILABLE'
}

/** Maps display status to the dot color via design-system tokens. */
const STATUS_DOT_CLASS: Record<string, string> = {
  AVAILABLE:   'bg-muted-foreground/40',
  OCCUPIED:    'bg-success',
  CLEANING:    'bg-warning',
  MAINTENANCE: 'bg-destructive',
}

/**
 * Memoized row representing one room in the timeline grid.
 *
 * The row consists of:
 *  1. A sticky room-label column (left side) — always visible while scrolling.
 *  2. A horizontally-spanning booking area with absolutely-positioned BookingBlocks.
 *
 * Date math uses date-fns exclusively (per spec). Blocks whose clamped span
 * is ≤ 0 are not rendered.
 */
const RoomRow = React.memo(function RoomRow({
  room,
  windowStart,
  windowEnd,
  onSelectBooking,
}: RoomRowProps) {
  const displayStatus = deriveDisplayStatus(room)

  return (
    <div className="flex h-timeline-row border-b border-border">
      {/* ── Sticky room-label column ─────────────────────────────────────── */}
      <div
        className={cn(
          'sticky left-0 z-10',
          'w-timeline-room-col min-w-timeline-room-col',
          'flex flex-col items-center justify-center gap-0.5',
          'bg-card border-r border-border',
          'flex-shrink-0',
        )}
      >
        <span className="text-xs font-semibold text-foreground leading-none">
          {room.room_number}
        </span>
        {/* Status indicator dot */}
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            STATUS_DOT_CLASS[displayStatus] ?? 'bg-muted-foreground/40',
          )}
          aria-label={displayStatus}
        />
      </div>

      {/* ── Booking area ─────────────────────────────────────────────────── */}
      <div
        className="relative flex-1 min-w-timeline-7"
        style={{ height: 'var(--timeline-row-height)' }}
      >
        {/* Cell grid lines (visual columns separator) */}
        <div className="absolute inset-0 flex pointer-events-none" aria-hidden>
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="border-r border-border/50"
              style={{ width: 'var(--timeline-cell-width)', flexShrink: 0 }}
            />
          ))}
        </div>

        {/* Booking blocks */}
        {room.bookings.map((booking) => {
          // Clamp to window boundaries (check_out is exclusive)
          const checkIn  = parseISO(booking.check_in)
          const checkOut = parseISO(booking.check_out)
          const clampedStart = max([checkIn, windowStart])
          const clampedEnd   = min([checkOut, windowEnd])

          const spanDays   = differenceInDays(clampedEnd, clampedStart)
          const offsetDays = differenceInDays(clampedStart, windowStart)

          // Skip bookings that don't overlap the current window
          if (spanDays <= 0) return null

          return (
            <BookingBlock
              key={booking.booking_id}
              booking={booking}
              offsetDays={offsetDays}
              spanDays={spanDays}
              onTap={onSelectBooking}
            />
          )
        })}
      </div>
    </div>
  )
})

export default RoomRow
