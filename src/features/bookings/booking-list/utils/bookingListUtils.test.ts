import { describe, it, expect } from 'vitest'
import { getRoomInfo, getStayRange } from './bookingListUtils'
import type { BookingResponse } from '../../types'

function makeBooking(stays: Partial<BookingResponse['room_stays'][0]>[]): BookingResponse {
  return {
    id: 'b1',
    guest_name: 'Test',
    guest_phone: '0812345678',
    source: 'walk_in',
    status: 'CONFIRMED',
    total_amount: 0,
    discount_amount: 0,
    paid_amount: 0,
    balance_amount: 0,
    deposit_paid: 0,
    key_deposit_amount: 0,
    deposit_status: 'NONE',
    room_stays: stays.map((s, i) => ({
      id: `s${i}`,
      booking_id: 'b1',
      room_type_id: 'rt1',
      room_type_name: s.room_type_name ?? 'Standard',
      check_in: s.check_in ?? '2024-03-01',
      check_out: s.check_out ?? '2024-03-03',
      nights: 2,
      price_per_night: 1000,
      status: s.status ?? 'ASSIGNED',
      created_at: '2024-03-01T00:00:00Z',
      ...s,
    })),
    payments: [],
    invoices: [],
    events: [],
    created_at: '2024-03-01T00:00:00Z',
  } as BookingResponse
}

// ── getRoomInfo ─────────────────────────────────────────────────────────────

describe('getRoomInfo', () => {
  it('returns room numbers for assigned stays', () => {
    const booking = makeBooking([
      { room_number: '101', status: 'ASSIGNED' },
      { room_number: '102', status: 'CHECKED_IN' },
    ])
    const result = getRoomInfo(booking)
    expect(result.label).toBe('101, 102')
    expect(result.count).toBe(2)
  })

  it('returns dash for no active stays', () => {
    const booking = makeBooking([{ status: 'CANCELLED' }])
    const result = getRoomInfo(booking)
    expect(result.label).toBe('—')
    expect(result.count).toBe(0)
  })

  it('groups unassigned stays by room type name', () => {
    const booking = makeBooking([
      { room_number: undefined, room_type_name: 'Deluxe', status: 'ASSIGNED' },
      { room_number: undefined, room_type_name: 'Deluxe', status: 'ASSIGNED' },
    ])
    const result = getRoomInfo(booking)
    expect(result.label).toBe('Deluxe x 2')
    expect(result.count).toBe(2)
  })

  it('combines assigned and unassigned stays', () => {
    const booking = makeBooking([
      { room_number: '101', status: 'ASSIGNED' },
      { room_number: undefined, room_type_name: 'Standard', status: 'ASSIGNED' },
    ])
    const result = getRoomInfo(booking)
    expect(result.label).toBe('101, Standard')
    expect(result.count).toBe(2)
  })

  it('shows single unassigned without count suffix', () => {
    const booking = makeBooking([
      { room_number: undefined, room_type_name: 'Suite', status: 'ASSIGNED' },
    ])
    const result = getRoomInfo(booking)
    expect(result.label).toBe('Suite')
  })
})

// ── getStayRange ────────────────────────────────────────────────────────────

describe('getStayRange', () => {
  it('returns earliest check-in and latest check-out', () => {
    const booking = makeBooking([
      { check_in: '2024-03-05', check_out: '2024-03-07' },
      { check_in: '2024-03-01', check_out: '2024-03-10' },
      { check_in: '2024-03-03', check_out: '2024-03-06' },
    ])
    const result = getStayRange(booking)
    expect(result).toEqual({ checkIn: '2024-03-01', checkOut: '2024-03-10' })
  })

  it('returns single stay range', () => {
    const booking = makeBooking([
      { check_in: '2024-03-01', check_out: '2024-03-03' },
    ])
    const result = getStayRange(booking)
    expect(result).toEqual({ checkIn: '2024-03-01', checkOut: '2024-03-03' })
  })

  it('returns null when no stays', () => {
    const booking = makeBooking([])
    const result = getStayRange(booking)
    expect(result).toBeNull()
  })
})
