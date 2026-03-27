import type { TimelineBooking } from '../types'

// ─── Shared Timeline Types ──────────────────────────────────────────────────

export interface SelectedBookingContext {
  booking: TimelineBooking
  roomNumbers: string[]
}
