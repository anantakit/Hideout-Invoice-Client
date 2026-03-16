import type { TimelineBooking } from '../../types'

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
  booking?: TimelineBooking
  /** For single-room: the room_stay_id from timeline (avoids N+1 useBooking fetch) */
  roomStayId?: string
  /** For single-room: the physical room UUID */
  roomId?: string
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
  checkIn: string
  nights: number
  stays: CheckoutStay[]
  booking?: TimelineBooking
}
