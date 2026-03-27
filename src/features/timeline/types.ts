import type { TimelineBooking } from '@/features/bookings/types'

// ─── Shared Timeline Types ──────────────────────────────────────────────────

export interface SelectedBookingContext {
  booking: TimelineBooking
  roomNumbers: string[]
}
