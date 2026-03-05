import React, { type CSSProperties } from 'react'
import { cn } from '@/shared/utils'
import type { TimelineBooking } from '../../types'

interface BookingBlockProps {
  booking: TimelineBooking
  /** Days from windowStart where this block starts (≥ 0). */
  offsetDays: number
  /** Number of days this block spans within the window (≥ 1). */
  spanDays: number
  onTap: (booking: TimelineBooking) => void
}

/**
 * Absolutely-positioned block representing one booking inside a RoomRow.
 *
 * Positioning is driven by CSS custom property math so that the cell-width
 * token stays as the single source of truth:
 *   left  = offsetDays × --timeline-cell-width
 *   width = spanDays   × --timeline-cell-width  (minus a small gutter)
 *
 * Color semantics:
 *   balance > 0  → warning  (outstanding balance)
 *   balance == 0 → primary  (fully settled)
 */
const BookingBlock = React.memo(function BookingBlock({
  booking,
  offsetDays,
  spanDays,
  onTap,
}: BookingBlockProps) {
  const hasBalance = Number(booking.balance_amount) > 0

  // CSS custom properties used by the .tl-booking-block class in index.css.
  // These drive the calc() expressions for left and width — never hardcoded.
  const positionVars = {
    '--tl-offset': offsetDays,
    '--tl-span': spanDays,
  } as CSSProperties

  return (
    <button
      type="button"
      className={cn(
        // Positioning class defined in @layer components (index.css).
        // Uses --tl-offset and --tl-span with --timeline-cell-width token.
        'tl-booking-block',
        // Vertical inset: design-system spacing-1 (0.25rem)
        'absolute inset-y-1',
        // Visual style
        'rounded-md overflow-hidden',
        'flex items-center px-2',
        'text-xs font-medium leading-tight text-white',
        'cursor-pointer select-none',
        'transition-opacity active:opacity-70',
        // Color token: warning when balance > 0, primary when settled
        hasBalance ? 'bg-warning' : 'bg-primary',
      )}
      style={positionVars}
      onClick={() => onTap(booking)}
      aria-label={`Booking ${booking.guest_name}`}
    >
      <span className="truncate">{booking.guest_name}</span>
    </button>
  )
})

export default BookingBlock
