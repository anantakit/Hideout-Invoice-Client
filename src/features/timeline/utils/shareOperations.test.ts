import { describe, it, expect } from 'vitest'
import { computeStayingGuests, buildShareText } from './shareOperations'
import type { TimelineRoom, TimelineBooking } from '@/features/bookings/types'
import type { CheckinBooking, CheckoutBooking } from './operationTypes'

// ─── Factories ──────────────────────────────────────────────────────────────

function makeBooking(overrides: Partial<TimelineBooking> = {}): TimelineBooking {
  return {
    room_stay_id: 'rs-1',
    booking_id: 'bk-1',
    guest_name: 'Guest A',
    check_in: '2024-03-14',
    check_out: '2024-03-17',
    status: 'CHECKED_IN',
    balance_amount: 0,
    key_deposit_amount: 200,
    deposit_paid: 200,
    deposit_status: 'COLLECTED',
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

// ─── computeStayingGuests ───────────────────────────────────────────────────

describe('computeStayingGuests', () => {
  it('returns empty array when no rooms', () => {
    expect(computeStayingGuests([], DATE)).toEqual([])
  })

  it('returns empty array when no CHECKED_IN stays overlap date', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [makeBooking({ status: 'RESERVED' })],
      }),
    ]
    expect(computeStayingGuests(rooms, DATE)).toEqual([])
  })

  it('finds guests with CHECKED_IN stay that spans the date (not same-day checkin)', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [makeBooking({
          check_in: '2024-03-13',
          check_out: '2024-03-17',
          status: 'CHECKED_IN',
        })],
      }),
    ]
    const result = computeStayingGuests(rooms, DATE)
    expect(result).toHaveLength(1)
    expect(result[0].guestName).toBe('Guest A')
    expect(result[0].roomNumbers).toEqual(['101'])
    expect(result[0].checkIn).toBe('2024-03-13')
    expect(result[0].checkOut).toBe('2024-03-17')
  })

  it('excludes same-day checkin (ci === dateStr)', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [makeBooking({
          check_in: '2024-03-15', // same as DATE
          check_out: '2024-03-17',
          status: 'CHECKED_IN',
        })],
      }),
    ]
    // ci < dateStr is false → not a staying guest (they're checking in today, not staying)
    expect(computeStayingGuests(rooms, DATE)).toEqual([])
  })

  it('excludes stays where checkout is on or before date', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [makeBooking({
          check_in: '2024-03-13',
          check_out: '2024-03-15', // co === dateStr → co > dateStr is false
          status: 'CHECKED_IN',
        })],
      }),
    ]
    expect(computeStayingGuests(rooms, DATE)).toEqual([])
  })

  it('groups multiple rooms under same booking', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [makeBooking({ booking_id: 'bk-1', check_in: '2024-03-13', check_out: '2024-03-17' })],
      }),
      makeRoom({
        id: 'room-2',
        room_number: '102',
        bookings: [makeBooking({
          room_stay_id: 'rs-2',
          booking_id: 'bk-1',
          check_in: '2024-03-13',
          check_out: '2024-03-17',
        })],
      }),
    ]
    const result = computeStayingGuests(rooms, DATE)
    expect(result).toHaveLength(1)
    expect(result[0].roomNumbers).toEqual(['101', '102'])
  })

  it('skips MAINTENANCE rooms', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        status: 'MAINTENANCE',
        bookings: [makeBooking({ check_in: '2024-03-13', check_out: '2024-03-17' })],
      }),
    ]
    expect(computeStayingGuests(rooms, DATE)).toEqual([])
  })

  it('only includes CHECKED_IN status', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [
          makeBooking({ room_stay_id: 'rs-1', status: 'CHECKED_OUT', check_in: '2024-03-13', check_out: '2024-03-17' }),
          makeBooking({ room_stay_id: 'rs-2', booking_id: 'bk-2', status: 'RESERVED', check_in: '2024-03-13', check_out: '2024-03-17' }),
        ],
      }),
    ]
    expect(computeStayingGuests(rooms, DATE)).toEqual([])
  })
})

// ─── buildShareText ─────────────────────────────────────────────────────────

describe('buildShareText', () => {
  const baseKPI = { total: 10, available: 5, byType: [{ name: 'เตียงเดี่ยว', total: 6, available: 3 }, { name: 'เตียงคู่', total: 4, available: 2 }] }

  function makeCheckin(overrides: Partial<CheckinBooking> = {}): CheckinBooking {
    return {
      bookingId: 'bk-1',
      guestName: 'Guest A',
      typeName: 'เตียงเดี่ยว',
      nights: 2,
      assignedRooms: ['101'],
      unassignedCount: 0,
      totalStays: 1,
      stayStatuses: ['RESERVED'],
      roomNights: [{ roomNumber: '101', nights: 2 }],
      unassignedTypes: [],
      booking: makeBooking({ balance_amount: 0, deposit_paid: 0, deposit_status: 'NONE', key_deposit_amount: 0 }),
      ...overrides,
    }
  }

  function makeCheckout(overrides: Partial<CheckoutBooking> = {}): CheckoutBooking {
    return {
      bookingId: 'bk-2',
      guestName: 'Guest B',
      roomNumbers: ['102'],
      balance: 0,
      keyDepositAmount: 200,
      depositPaid: 200,
      depositStatus: 'COLLECTED',
      checkIn: '2024-03-13',
      nights: 2,
      stays: [{ roomStayId: 'rs-2', roomNumber: '102', status: 'CHECKED_IN', booking: makeBooking() }],
      ...overrides,
    }
  }

  it('includes header with date and availability', () => {
    const text = buildShareText(DATE, [], [], [], [], [], baseKPI)
    expect(text).toContain('📋')
    expect(text).toContain('ว่าง 5/10')
  })

  it('includes room type breakdown in header', () => {
    const text = buildShareText(DATE, [], [], [], [], [], baseKPI)
    // shortType strips เตียง prefix
    expect(text).toContain('เดี่ยว 3')
    expect(text).toContain('คู่ 2')
  })

  it('includes checkout section when checkouts present', () => {
    const checkouts = [makeCheckout()]
    const text = buildShareText(DATE, checkouts, [], [], [], [], baseKPI)
    expect(text).toContain('ออก 1 ห้อง')
    expect(text).toContain('Guest B')
  })

  it('includes checkin section when checkins present', () => {
    const checkins = [makeCheckin()]
    const text = buildShareText(DATE, [], [], checkins, [], [], baseKPI)
    expect(text).toContain('เข้า 1 ห้อง')
    expect(text).toContain('Guest A')
    expect(text).toContain('2 คืน')
  })

  it('includes staying guests section', () => {
    const staying = [{ guestName: 'Guest C', roomNumbers: ['103'], checkIn: '2024-03-13', checkOut: '2024-03-17' }]
    const text = buildShareText(DATE, [], [], [], [], staying, baseKPI)
    expect(text).toContain('พักต่อ 1')
    expect(text).toContain('103 Guest C')
  })

  it('omits sections when empty', () => {
    const text = buildShareText(DATE, [], [], [], [], [], baseKPI)
    expect(text).not.toContain('ออก')
    expect(text).not.toContain('เข้า')
    expect(text).not.toContain('พักต่อ')
  })

  it('marks done checkouts with ✅', () => {
    const doneCheckouts = [makeCheckout({
      stays: [{ roomStayId: 'rs-2', roomNumber: '102', status: 'CHECKED_OUT', booking: makeBooking() }],
    })]
    const text = buildShareText(DATE, [], doneCheckouts, [], [], [], baseKPI)
    expect(text).toContain('✅')
  })

  it('shows balance for pending checkouts', () => {
    const checkouts = [makeCheckout({ balance: 1500 })]
    const text = buildShareText(DATE, checkouts, [], [], [], [], baseKPI)
    expect(text).toContain('Guest B')
    expect(text).toContain('ค้าง')
  })

  it('includes all sections in full report', () => {
    const checkouts = [makeCheckout()]
    const checkins = [makeCheckin()]
    const staying = [{ guestName: 'Guest C', roomNumbers: ['103'], checkIn: '2024-03-13', checkOut: '2024-03-17' }]
    const text = buildShareText(DATE, checkouts, [], checkins, [], staying, baseKPI)

    // Verify sections appear in order: header, checkouts, checkins, staying
    const headerIdx = text.indexOf('📋')
    const checkoutIdx = text.indexOf('ออก')
    const checkinIdx = text.indexOf('เข้า')
    const stayingIdx = text.indexOf('พักต่อ')

    expect(headerIdx).toBeLessThan(checkoutIdx)
    expect(checkoutIdx).toBeLessThan(checkinIdx)
    expect(checkinIdx).toBeLessThan(stayingIdx)
  })

  it('handles unassigned checkin with ⏳ prefix', () => {
    const checkins = [makeCheckin({
      assignedRooms: [],
      unassignedCount: 1,
      roomNights: [],
    })]
    const text = buildShareText(DATE, [], [], checkins, [], [], baseKPI)
    expect(text).toContain('⏳')
    expect(text).toContain('Guest A')
  })

  it('does not go below 0 for available in header', () => {
    const negativeKPI = { total: 2, available: -1, byType: [] }
    const text = buildShareText(DATE, [], [], [], [], [], negativeKPI)
    expect(text).toContain('ว่าง 0/2')
  })
})
