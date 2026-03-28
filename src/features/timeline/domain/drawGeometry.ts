// timeline/domain/drawGeometry.ts — pure draw-to-create geometry computations
// No React imports. No DOM access.

import { addDays } from 'date-fns'
import type { TimelineBooking } from '@/features/bookings/types'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Fast ISO date formatter — avoids date-fns format() overhead. */
function formatDateISO(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// ── 1. Day index from pointer position ───────────────────────────────────────

/**
 * Calculate which day column the pointer is over.
 * relativeX = clientX - containerRect.left - roomColPx + scrollLeft
 */
export function getDayIndex(
  relativeX: number,
  cellWidth: number,
  windowDays: number,
): number {
  return Math.max(0, Math.min(Math.floor(relativeX / cellWidth), windowDays - 1))
}

// ── 2. Draw date range ───────────────────────────────────────────────────────

export interface DrawDateRange {
  checkIn: string
  checkOut: string
}

/**
 * Calculate the check-in/check-out date range from a draw gesture.
 * Handles both left-to-right and right-to-left drags.
 */
export function calculateDrawDateRange(
  startDayIndex: number,
  currentDayIndex: number,
  windowStart: Date,
): DrawDateRange {
  const minDay = Math.min(startDayIndex, currentDayIndex)
  const maxDay = Math.max(startDayIndex, currentDayIndex)
  return {
    checkIn: formatDateISO(addDays(windowStart, minDay)),
    checkOut: formatDateISO(addDays(windowStart, maxDay + 1)),
  }
}

// ── 3. Cell empty check ──────────────────────────────────────────────────────

/**
 * Check if a date range is free of active bookings in a room.
 * Returns true when no non-cancelled/non-checked-out booking overlaps the range.
 */
export function isCellRangeEmpty(
  bookings: ReadonlyArray<TimelineBooking>,
  checkIn: string,
  checkOut: string,
): boolean {
  return !bookings.some(
    (b) =>
      b.status !== 'CANCELLED' &&
      b.status !== 'CHECKED_OUT' &&
      b.check_in.slice(0, 10) < checkOut &&
      b.check_out.slice(0, 10) > checkIn,
  )
}
