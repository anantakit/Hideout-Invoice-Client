import type { TimelineBooking } from '@/features/bookings/types'

export function toDateStr(s: string): string {
  return s.slice(0, 10)
}

export interface CheckinBooking {
  bookingId: string
  guestName: string
  typeName: string
  nights: number
  assignedRooms: string[]
  unassignedCount: number
  totalStays: number
  /** Collected stay-level statuses for all stays in this booking (used to derive done/pending). */
  stayStatuses: string[]
  /** Per-room nights — tracks individual nights for each assigned room. */
  roomNights: { roomNumber: string; nights: number }[]
  /** Room type names for each unassigned stay (tracks mixed types like 1 single + 1 double). */
  unassignedTypes: string[]
  booking?: TimelineBooking
  /** For single-room: the room_stay_id from timeline (avoids N+1 useBooking fetch) */
  roomStayId?: string
  /** For single-room: the physical room UUID */
  roomId?: string
}

/** Format nights display: single value if all same, breakdown if different. */
export function formatNightsLabel(ci: CheckinBooking): string {
  if (ci.roomNights.length <= 1) return `${ci.nights} คืน`
  const allSame = ci.roomNights.every((r) => r.nights === ci.roomNights[0].nights)
  if (allSame) return `${ci.roomNights[0].nights} คืน`
  // Group rooms by nights
  const byNights = new Map<number, string[]>()
  for (const r of ci.roomNights) {
    const list = byNights.get(r.nights) ?? []
    list.push(r.roomNumber)
    byNights.set(r.nights, list)
  }
  return [...byNights.entries()]
    .map(([n, rooms]) => `${rooms.join(',')}=${n}คืน`)
    .join(' ')
}

export interface CheckoutStay {
  roomStayId: string
  roomNumber: string
  status: string
  booking: TimelineBooking
}

export interface CheckoutBooking {
  bookingId: string
  guestName: string
  roomNumbers: string[]
  balance: number
  keyDepositAmount: number
  depositPaid: number
  depositStatus: string
  checkIn: string
  nights: number
  stays: CheckoutStay[]
  booking?: TimelineBooking
}
