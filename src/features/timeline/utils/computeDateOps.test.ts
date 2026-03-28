import { describe, it, expect } from 'vitest'
import { computeDateOps } from './computeDateOps'
import type { TimelineRoom, TimelineBooking, UnassignedStay } from '@/features/bookings/types'

// ─── Factories ──────────────────────────────────────────────────────────────

function makeBooking(overrides: Partial<TimelineBooking> = {}): TimelineBooking {
  return {
    room_stay_id: 'rs-1',
    booking_id: 'bk-1',
    guest_name: 'Guest A',
    check_in: '2024-03-15',
    check_out: '2024-03-17',
    status: 'RESERVED',
    balance_amount: 0,
    key_deposit_amount: 200,
    deposit_paid: 0,
    deposit_status: 'PENDING',
    source: 'advance',
    ...overrides,
  }
}

function makeRoom(overrides: Partial<TimelineRoom> & { id: string; room_number: string }): TimelineRoom {
  return {
    status: 'ACTIVE',
    bookings: [],
    ...overrides,
  }
}

function makeUnassigned(overrides: Partial<UnassignedStay> = {}): UnassignedStay {
  return {
    booking_id: 'bk-u1',
    guest_name: 'Unassigned Guest',
    room_type_id: 'rt-1',
    room_type_name: 'เตียงเดี่ยว',
    check_in: '2024-03-15',
    check_out: '2024-03-17',
    status: 'RESERVED',
    key_deposit_amount: 200,
    deposit_status: 'PENDING',
    balance_amount: 0,
    ...overrides,
  }
}

const DATE = '2024-03-15'
const TYPE_MAP: Record<string, string> = {
  'room-1': 'เตียงเดี่ยว',
  'room-2': 'เตียงคู่',
}

describe('computeDateOps', () => {
  it('returns empty arrays when no rooms', () => {
    const result = computeDateOps([], [], DATE, TYPE_MAP)
    expect(result.checkins).toEqual([])
    expect(result.doneCheckins).toEqual([])
    expect(result.checkouts).toEqual([])
    expect(result.doneCheckouts).toEqual([])
  })

  it('returns empty arrays when no bookings match date', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [makeBooking({ check_in: '2024-03-16', check_out: '2024-03-18' })],
      }),
    ]
    const result = computeDateOps(rooms, [], DATE, TYPE_MAP)
    expect(result.checkins).toEqual([])
    expect(result.checkouts).toEqual([])
  })

  it('detects pending checkins on selected date', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [makeBooking({ status: 'RESERVED', check_in: '2024-03-15', check_out: '2024-03-17' })],
      }),
    ]
    const result = computeDateOps(rooms, [], DATE, TYPE_MAP)
    expect(result.checkins).toHaveLength(1)
    expect(result.checkins[0].guestName).toBe('Guest A')
    expect(result.checkins[0].assignedRooms).toEqual(['101'])
    expect(result.checkins[0].nights).toBe(2)
    expect(result.doneCheckins).toHaveLength(0)
  })

  it('moves fully checked-in bookings to doneCheckins', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [makeBooking({ status: 'CHECKED_IN', check_in: '2024-03-15', check_out: '2024-03-17' })],
      }),
    ]
    const result = computeDateOps(rooms, [], DATE, TYPE_MAP)
    expect(result.checkins).toHaveLength(0)
    expect(result.doneCheckins).toHaveLength(1)
    expect(result.doneCheckins[0].guestName).toBe('Guest A')
  })

  it('detects pending checkouts on selected date', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [makeBooking({
          status: 'CHECKED_IN',
          check_in: '2024-03-13',
          check_out: '2024-03-15',
        })],
      }),
    ]
    const result = computeDateOps(rooms, [], DATE, TYPE_MAP)
    expect(result.checkouts).toHaveLength(1)
    expect(result.checkouts[0].guestName).toBe('Guest A')
    expect(result.checkouts[0].roomNumbers).toEqual(['101'])
    expect(result.doneCheckouts).toHaveLength(0)
  })

  it('moves fully checked-out bookings to doneCheckouts', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [makeBooking({
          status: 'CHECKED_OUT',
          check_in: '2024-03-13',
          check_out: '2024-03-15',
          checked_out_at: '2024-03-15T10:00:00Z',
        })],
      }),
    ]
    const result = computeDateOps(rooms, [], DATE, TYPE_MAP)
    expect(result.checkouts).toHaveLength(0)
    expect(result.doneCheckouts).toHaveLength(1)
  })

  it('uses checked_out_at for early checkout detection', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [makeBooking({
          status: 'CHECKED_OUT',
          check_in: '2024-03-13',
          check_out: '2024-03-17', // scheduled checkout is 17th
          checked_out_at: '2024-03-15T08:00:00Z', // actually checked out 15th
        })],
      }),
    ]
    const result = computeDateOps(rooms, [], DATE, TYPE_MAP)
    expect(result.doneCheckouts).toHaveLength(1)
    expect(result.doneCheckouts[0].guestName).toBe('Guest A')
  })

  it('groups multiple rooms under same booking for checkin', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [makeBooking({
          room_stay_id: 'rs-1',
          booking_id: 'bk-1',
          status: 'RESERVED',
          check_in: '2024-03-15',
          check_out: '2024-03-17',
        })],
      }),
      makeRoom({
        id: 'room-2',
        room_number: '102',
        bookings: [makeBooking({
          room_stay_id: 'rs-2',
          booking_id: 'bk-1', // same booking
          status: 'RESERVED',
          check_in: '2024-03-15',
          check_out: '2024-03-17',
        })],
      }),
    ]
    const result = computeDateOps(rooms, [], DATE, TYPE_MAP)
    expect(result.checkins).toHaveLength(1)
    expect(result.checkins[0].assignedRooms).toEqual(['101', '102'])
    expect(result.checkins[0].totalStays).toBe(2)
  })

  it('groups multiple rooms under same booking for checkout', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [makeBooking({
          room_stay_id: 'rs-1',
          booking_id: 'bk-1',
          status: 'CHECKED_IN',
          check_in: '2024-03-13',
          check_out: '2024-03-15',
        })],
      }),
      makeRoom({
        id: 'room-2',
        room_number: '102',
        bookings: [makeBooking({
          room_stay_id: 'rs-2',
          booking_id: 'bk-1',
          status: 'CHECKED_IN',
          check_in: '2024-03-13',
          check_out: '2024-03-15',
        })],
      }),
    ]
    const result = computeDateOps(rooms, [], DATE, TYPE_MAP)
    expect(result.checkouts).toHaveLength(1)
    expect(result.checkouts[0].roomNumbers).toEqual(['101', '102'])
  })

  it('skips MAINTENANCE rooms', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        status: 'MAINTENANCE',
        bookings: [makeBooking({ check_in: '2024-03-15', check_out: '2024-03-17' })],
      }),
    ]
    const result = computeDateOps(rooms, [], DATE, TYPE_MAP)
    expect(result.checkins).toEqual([])
  })

  it('merges unassigned stays into checkin map', () => {
    const rooms: TimelineRoom[] = []
    const unassigned: UnassignedStay[] = [
      makeUnassigned({ booking_id: 'bk-u1', check_in: '2024-03-15', check_out: '2024-03-17' }),
    ]
    const result = computeDateOps(rooms, unassigned, DATE, TYPE_MAP)
    expect(result.checkins).toHaveLength(1)
    expect(result.checkins[0].guestName).toBe('Unassigned Guest')
    expect(result.checkins[0].unassignedCount).toBe(1)
    expect(result.checkins[0].assignedRooms).toEqual([])
  })

  it('skips cancelled unassigned stays', () => {
    const unassigned: UnassignedStay[] = [
      makeUnassigned({ status: 'CANCELLED', check_in: '2024-03-15' }),
    ]
    const result = computeDateOps([], unassigned, DATE, TYPE_MAP)
    expect(result.checkins).toHaveLength(0)
  })

  it('sorts pending checkouts by balance descending', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [makeBooking({
          room_stay_id: 'rs-1',
          booking_id: 'bk-1',
          status: 'CHECKED_IN',
          check_in: '2024-03-13',
          check_out: '2024-03-15',
          balance_amount: 500,
        })],
      }),
      makeRoom({
        id: 'room-2',
        room_number: '102',
        bookings: [makeBooking({
          room_stay_id: 'rs-2',
          booking_id: 'bk-2',
          guest_name: 'Guest B',
          status: 'CHECKED_IN',
          check_in: '2024-03-13',
          check_out: '2024-03-15',
          balance_amount: 2000,
        })],
      }),
    ]
    const result = computeDateOps(rooms, [], DATE, TYPE_MAP)
    expect(result.checkouts).toHaveLength(2)
    expect(result.checkouts[0].balance).toBe(2000) // higher balance first
    expect(result.checkouts[1].balance).toBe(500)
  })
})
