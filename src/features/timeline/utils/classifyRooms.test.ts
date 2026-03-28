import { describe, it, expect } from 'vitest'
import { overlapsRange, classifyRooms } from './classifyRooms'
import type { TimelineRoom, TimelineBooking } from '@/features/bookings/types'

// ─── overlapsRange ──────────────────────────────────────────────────────────

describe('overlapsRange', () => {
  it('returns true when stay is fully inside range', () => {
    expect(overlapsRange({ check_in: '2024-03-02', check_out: '2024-03-04' }, '2024-03-01', '2024-03-05')).toBe(true)
  })

  it('returns true when stay partially overlaps at start', () => {
    expect(overlapsRange({ check_in: '2024-02-28', check_out: '2024-03-02' }, '2024-03-01', '2024-03-05')).toBe(true)
  })

  it('returns true when stay partially overlaps at end', () => {
    expect(overlapsRange({ check_in: '2024-03-04', check_out: '2024-03-06' }, '2024-03-01', '2024-03-05')).toBe(true)
  })

  it('returns true when stay encompasses entire range', () => {
    expect(overlapsRange({ check_in: '2024-02-28', check_out: '2024-03-06' }, '2024-03-01', '2024-03-05')).toBe(true)
  })

  it('returns false when stay ends at range start (touching boundary)', () => {
    // check_out === rangeStart → co > rangeStart is false
    expect(overlapsRange({ check_in: '2024-02-28', check_out: '2024-03-01' }, '2024-03-01', '2024-03-05')).toBe(false)
  })

  it('returns false when stay starts at range end (touching boundary)', () => {
    // check_in === rangeEnd → ci < rangeEnd is false
    expect(overlapsRange({ check_in: '2024-03-05', check_out: '2024-03-07' }, '2024-03-01', '2024-03-05')).toBe(false)
  })

  it('returns false when stay is entirely before range', () => {
    expect(overlapsRange({ check_in: '2024-02-01', check_out: '2024-02-05' }, '2024-03-01', '2024-03-05')).toBe(false)
  })

  it('returns false when stay is entirely after range', () => {
    expect(overlapsRange({ check_in: '2024-04-01', check_out: '2024-04-05' }, '2024-03-01', '2024-03-05')).toBe(false)
  })

  it('handles datetime strings (extracts date portion)', () => {
    expect(overlapsRange(
      { check_in: '2024-03-02T14:00:00Z', check_out: '2024-03-04T12:00:00Z' },
      '2024-03-01', '2024-03-05',
    )).toBe(true)
  })
})

// ─── classifyRooms ──────────────────────────────────────────────────────────

function makeBooking(overrides: Partial<TimelineBooking> = {}): TimelineBooking {
  return {
    room_stay_id: 'rs-1',
    booking_id: 'bk-1',
    guest_name: 'Guest A',
    check_in: '2024-03-15',
    check_out: '2024-03-17',
    status: 'RESERVED',
    balance_amount: 0,
    key_deposit_amount: 0,
    deposit_paid: 0,
    deposit_status: 'NONE',
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

const DATE = '2024-03-15'
const ROOM_TYPE_MAP: Record<string, string> = {
  'room-1': 'เตียงเดี่ยว',
  'room-2': 'เตียงคู่',
  'room-3': 'เตียงเดี่ยว',
}

describe('classifyRooms', () => {
  it('classifies empty rooms as available', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({ id: 'room-1', room_number: '101', bookings: [] }),
    ]
    const { entries, counts } = classifyRooms(rooms, DATE, ROOM_TYPE_MAP)
    expect(entries).toHaveLength(1)
    expect(entries[0].status).toBe('available')
    expect(counts.available).toBe(1)
  })

  it('classifies MAINTENANCE rooms', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({ id: 'room-1', room_number: '101', status: 'MAINTENANCE', bookings: [] }),
    ]
    const { entries, counts } = classifyRooms(rooms, DATE, ROOM_TYPE_MAP)
    expect(entries[0].status).toBe('maintenance')
    expect(counts.maintenance).toBe(1)
  })

  it('classifies room with CHECKED_IN stay overlapping date', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [makeBooking({ status: 'CHECKED_IN', check_in: '2024-03-14', check_out: '2024-03-17' })],
      }),
    ]
    const { entries, counts } = classifyRooms(rooms, DATE, ROOM_TYPE_MAP)
    expect(entries[0].status).toBe('checked_in')
    expect(entries[0].guestName).toBe('Guest A')
    expect(counts.checked_in).toBe(1)
  })

  it('classifies room with RESERVED stay overlapping date', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [makeBooking({ status: 'RESERVED', check_in: '2024-03-14', check_out: '2024-03-17' })],
      }),
    ]
    const { entries, counts } = classifyRooms(rooms, DATE, ROOM_TYPE_MAP)
    expect(entries[0].status).toBe('reserved')
    expect(counts.reserved).toBe(1)
  })

  it('classifies room with ASSIGNED stay overlapping date', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [makeBooking({ status: 'ASSIGNED', check_in: '2024-03-14', check_out: '2024-03-17' })],
      }),
    ]
    const { entries, counts } = classifyRooms(rooms, DATE, ROOM_TYPE_MAP)
    expect(entries[0].status).toBe('reserved')
    expect(counts.reserved).toBe(1)
  })

  it('classifies checkout_today when stay checks out on date', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [makeBooking({
          status: 'CHECKED_IN',
          check_in: '2024-03-13',
          check_out: '2024-03-15', // checkout = date
        })],
      }),
    ]
    const { entries, counts } = classifyRooms(rooms, DATE, ROOM_TYPE_MAP)
    expect(entries[0].status).toBe('checkout_today')
    expect(counts.checkout_today).toBe(1)
  })

  it('classifies turnover when checkout and different checkin on same day', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [
          makeBooking({
            room_stay_id: 'rs-1',
            booking_id: 'bk-1',
            guest_name: 'Outgoing Guest',
            status: 'CHECKED_IN',
            check_in: '2024-03-13',
            check_out: '2024-03-15',
          }),
          makeBooking({
            room_stay_id: 'rs-2',
            booking_id: 'bk-2',
            guest_name: 'Incoming Guest',
            status: 'RESERVED',
            check_in: '2024-03-15',
            check_out: '2024-03-18',
          }),
        ],
      }),
    ]
    const { entries, counts } = classifyRooms(rooms, DATE, ROOM_TYPE_MAP)
    expect(entries[0].status).toBe('turnover')
    expect(entries[0].guestName).toBe('Incoming Guest')
    expect(entries[0].checkoutGuestName).toBe('Outgoing Guest')
    expect(counts.turnover).toBe(1)
  })

  it('ignores CANCELLED bookings for classification', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [makeBooking({ status: 'CANCELLED', check_in: '2024-03-14', check_out: '2024-03-17' })],
      }),
    ]
    const { entries, counts } = classifyRooms(rooms, DATE, ROOM_TYPE_MAP)
    expect(entries[0].status).toBe('available')
    expect(counts.available).toBe(1)
  })

  it('handles mixed statuses across multiple rooms', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({ id: 'room-1', room_number: '101', bookings: [] }),
      makeRoom({
        id: 'room-2',
        room_number: '102',
        bookings: [makeBooking({ status: 'CHECKED_IN', check_in: '2024-03-14', check_out: '2024-03-17' })],
      }),
      makeRoom({ id: 'room-3', room_number: '103', status: 'MAINTENANCE', bookings: [] }),
    ]
    const { entries, counts } = classifyRooms(rooms, DATE, ROOM_TYPE_MAP)
    expect(entries).toHaveLength(3)
    expect(counts.available).toBe(1)
    expect(counts.checked_in).toBe(1)
    expect(counts.maintenance).toBe(1)
  })

  it('maps room type name from roomTypeNameMap', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({ id: 'room-1', room_number: '101', bookings: [] }),
    ]
    const { entries } = classifyRooms(rooms, DATE, ROOM_TYPE_MAP)
    expect(entries[0].typeName).toBe('เตียงเดี่ยว')
  })

  it('uses empty string for unknown room type', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({ id: 'unknown-room', room_number: '999', bookings: [] }),
    ]
    const { entries } = classifyRooms(rooms, DATE, ROOM_TYPE_MAP)
    expect(entries[0].typeName).toBe('')
  })

  it('classifies all rooms as available when no bookings exist', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({ id: 'room-1', room_number: '101', bookings: [] }),
      makeRoom({ id: 'room-2', room_number: '102', bookings: [] }),
      makeRoom({ id: 'room-3', room_number: '103', bookings: [] }),
    ]
    const { counts } = classifyRooms(rooms, DATE, ROOM_TYPE_MAP)
    expect(counts.available).toBe(3)
    expect(counts.reserved).toBe(0)
    expect(counts.checked_in).toBe(0)
    expect(counts.checkout_today).toBe(0)
    expect(counts.turnover).toBe(0)
    expect(counts.maintenance).toBe(0)
  })

  it('uses checked_out_at for checkout date when status is CHECKED_OUT', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [makeBooking({
          status: 'CHECKED_OUT',
          check_in: '2024-03-13',
          check_out: '2024-03-16', // scheduled checkout is tomorrow
          checked_out_at: '2024-03-15T10:00:00Z', // but actually checked out today
        })],
      }),
    ]
    // CHECKED_OUT stay with checked_out_at matching dateStr still counts as coStay
    // but since status=CHECKED_OUT, it won't trigger checkout_today (coStay.status !== 'CHECKED_OUT' is false)
    const { entries } = classifyRooms(rooms, DATE, ROOM_TYPE_MAP)
    expect(entries[0].status).toBe('available')
  })
})
