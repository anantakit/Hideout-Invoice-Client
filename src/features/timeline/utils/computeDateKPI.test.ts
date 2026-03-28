import { describe, it, expect } from 'vitest'
import { computeDateKPI } from './computeDateKPI'
import type { TimelineRoom, TimelineBooking, UnassignedStay } from '@/features/bookings/types'

// ─── Factories ──────────────────────────────────────────────────────────────

function makeBooking(overrides: Partial<TimelineBooking> = {}): TimelineBooking {
  return {
    room_stay_id: 'rs-1',
    booking_id: 'bk-1',
    guest_name: 'Guest',
    check_in: '2024-03-14',
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
  'room-3': 'เตียงเดี่ยว',
  'room-4': 'เตียงคู่',
}

describe('computeDateKPI', () => {
  it('returns zeros for empty rooms', () => {
    const kpi = computeDateKPI([], [], DATE, TYPE_MAP)
    expect(kpi.total).toBe(0)
    expect(kpi.occupied).toBe(0)
    expect(kpi.available).toBe(0)
    expect(kpi.occupancyPct).toBe(0)
    expect(kpi.byType).toEqual([])
  })

  it('counts all rooms as available when no bookings', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({ id: 'room-1', room_number: '101' }),
      makeRoom({ id: 'room-2', room_number: '102' }),
    ]
    const kpi = computeDateKPI(rooms, [], DATE, TYPE_MAP)
    expect(kpi.total).toBe(2)
    expect(kpi.available).toBe(2)
    expect(kpi.occupied).toBe(0)
    expect(kpi.occupancyPct).toBe(0)
  })

  it('excludes MAINTENANCE rooms from total', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({ id: 'room-1', room_number: '101' }),
      makeRoom({ id: 'room-2', room_number: '102', status: 'MAINTENANCE' }),
    ]
    const kpi = computeDateKPI(rooms, [], DATE, TYPE_MAP)
    expect(kpi.total).toBe(1)
  })

  it('counts occupied rooms correctly', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [makeBooking({ status: 'CHECKED_IN', check_in: '2024-03-14', check_out: '2024-03-17' })],
      }),
      makeRoom({ id: 'room-2', room_number: '102' }),
    ]
    const kpi = computeDateKPI(rooms, [], DATE, TYPE_MAP)
    expect(kpi.total).toBe(2)
    expect(kpi.occupied).toBe(1)
    expect(kpi.available).toBe(1)
    expect(kpi.occupancyPct).toBe(50)
  })

  it('calculates 100% occupancy when all rooms occupied', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [makeBooking({ status: 'CHECKED_IN', check_in: '2024-03-14', check_out: '2024-03-17' })],
      }),
      makeRoom({
        id: 'room-2',
        room_number: '102',
        bookings: [makeBooking({
          room_stay_id: 'rs-2',
          booking_id: 'bk-2',
          status: 'RESERVED',
          check_in: '2024-03-14',
          check_out: '2024-03-17',
        })],
      }),
    ]
    const kpi = computeDateKPI(rooms, [], DATE, TYPE_MAP)
    expect(kpi.occupancyPct).toBe(100)
    expect(kpi.available).toBe(0)
  })

  it('provides breakdown by room type', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({ id: 'room-1', room_number: '101' }), // เตียงเดี่ยว
      makeRoom({ id: 'room-3', room_number: '103' }), // เตียงเดี่ยว
      makeRoom({
        id: 'room-2',
        room_number: '102',
        bookings: [makeBooking({ status: 'CHECKED_IN', check_in: '2024-03-14', check_out: '2024-03-17' })],
      }), // เตียงคู่ - occupied
    ]
    const kpi = computeDateKPI(rooms, [], DATE, TYPE_MAP)
    const single = kpi.byType.find((t) => t.name === 'เตียงเดี่ยว')
    const double = kpi.byType.find((t) => t.name === 'เตียงคู่')
    expect(single?.total).toBe(2)
    expect(single?.available).toBe(2)
    expect(double?.total).toBe(1)
    expect(double?.available).toBe(0)
  })

  it('subtracts unassigned stays from available count', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({ id: 'room-1', room_number: '101' }),
      makeRoom({ id: 'room-3', room_number: '103' }),
    ]
    const unassigned: UnassignedStay[] = [
      makeUnassigned({ room_type_name: 'เตียงเดี่ยว' }),
    ]
    const kpi = computeDateKPI(rooms, unassigned, DATE, TYPE_MAP)
    expect(kpi.available).toBe(1) // 2 physically available - 1 unassigned
    expect(kpi.unassigned).toBe(1)
  })

  it('does not let available go below 0', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({ id: 'room-1', room_number: '101' }),
    ]
    const unassigned: UnassignedStay[] = [
      makeUnassigned({ booking_id: 'u1' }),
      makeUnassigned({ booking_id: 'u2' }),
    ]
    const kpi = computeDateKPI(rooms, unassigned, DATE, TYPE_MAP)
    expect(kpi.available).toBe(0)
  })

  it('counts checkin progress for the date', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [makeBooking({
          status: 'CHECKED_IN',
          check_in: '2024-03-15',
          check_out: '2024-03-17',
        })],
      }),
      makeRoom({
        id: 'room-2',
        room_number: '102',
        bookings: [makeBooking({
          room_stay_id: 'rs-2',
          booking_id: 'bk-2',
          status: 'RESERVED',
          check_in: '2024-03-15',
          check_out: '2024-03-17',
        })],
      }),
    ]
    const kpi = computeDateKPI(rooms, [], DATE, TYPE_MAP)
    expect(kpi.checkinTotal).toBe(2)
    expect(kpi.checkinDone).toBe(1) // only CHECKED_IN counts as done
  })

  it('counts checkout progress for the date', () => {
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
      makeRoom({
        id: 'room-2',
        room_number: '102',
        bookings: [makeBooking({
          room_stay_id: 'rs-2',
          booking_id: 'bk-2',
          status: 'CHECKED_IN',
          check_in: '2024-03-13',
          check_out: '2024-03-15',
        })],
      }),
    ]
    const kpi = computeDateKPI(rooms, [], DATE, TYPE_MAP)
    expect(kpi.checkoutTotal).toBe(2)
    expect(kpi.checkoutDone).toBe(1)
  })

  it('counts unassigned stays in checkin totals', () => {
    const rooms: TimelineRoom[] = []
    const unassigned: UnassignedStay[] = [
      makeUnassigned({ status: 'RESERVED', check_in: '2024-03-15' }),
    ]
    const kpi = computeDateKPI(rooms, unassigned, DATE, TYPE_MAP)
    expect(kpi.checkinTotal).toBe(1)
    expect(kpi.checkinDone).toBe(0)
  })

  it('treats checkout-today room (no new checkin) as available', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [makeBooking({
          status: 'CHECKED_IN',
          check_in: '2024-03-13',
          check_out: '2024-03-15', // checks out today
        })],
      }),
    ]
    const kpi = computeDateKPI(rooms, [], DATE, TYPE_MAP)
    // Room has checkout today with no new incoming → physically available
    expect(kpi.available).toBe(1)
  })

  it('treats turnover room (checkout + different checkin) as NOT available', () => {
    const rooms: TimelineRoom[] = [
      makeRoom({
        id: 'room-1',
        room_number: '101',
        bookings: [
          makeBooking({
            room_stay_id: 'rs-1',
            booking_id: 'bk-1',
            status: 'CHECKED_IN',
            check_in: '2024-03-13',
            check_out: '2024-03-15',
          }),
          makeBooking({
            room_stay_id: 'rs-2',
            booking_id: 'bk-2',
            status: 'RESERVED',
            check_in: '2024-03-15',
            check_out: '2024-03-18',
          }),
        ],
      }),
    ]
    const kpi = computeDateKPI(rooms, [], DATE, TYPE_MAP)
    expect(kpi.available).toBe(0)
    expect(kpi.occupied).toBe(1)
  })
})
