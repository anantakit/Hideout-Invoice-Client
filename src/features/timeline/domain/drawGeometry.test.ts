import { describe, it, expect } from 'vitest'
import {
  getDayIndex,
  calculateDrawDateRange,
  isCellRangeEmpty,
} from './drawGeometry'
import type { TimelineBooking } from '@/features/bookings/types'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeBooking(
  overrides: Partial<TimelineBooking> & { room_stay_id: string; booking_id: string },
): TimelineBooking {
  return {
    guest_name: 'ทดสอบ',
    check_in: '2025-03-01',
    check_out: '2025-03-03',
    status: 'RESERVED',
    balance_amount: 0,
    key_deposit_amount: 0,
    deposit_paid: 0,
    deposit_status: 'NONE',
    source: 'walk_in',
    created_at: '2025-03-01T00:00:00Z',
    ...overrides,
  }
}

// ── getDayIndex ──────────────────────────────────────────────────────────────

describe('getDayIndex', () => {
  const cellWidth = 120

  it('returns 0 for position in first cell', () => {
    expect(getDayIndex(60, cellWidth, 42)).toBe(0)
  })

  it('returns correct day for mid-grid position', () => {
    expect(getDayIndex(360, cellWidth, 42)).toBe(3) // 360/120 = 3
  })

  it('clamps to 0 for negative relativeX', () => {
    expect(getDayIndex(-100, cellWidth, 42)).toBe(0)
  })

  it('clamps to windowDays - 1 for position past end', () => {
    expect(getDayIndex(10000, cellWidth, 42)).toBe(41)
  })

  it('handles exact cell boundary', () => {
    expect(getDayIndex(240, cellWidth, 42)).toBe(2) // exactly at cell 2 start
  })

  it('handles fractional position within a cell', () => {
    expect(getDayIndex(250, cellWidth, 42)).toBe(2) // 250/120 = 2.08 → floor = 2
  })
})

// ── calculateDrawDateRange ───────────────────────────────────────────────────

describe('calculateDrawDateRange', () => {
  const windowStart = new Date(2025, 2, 1) // March 1 local

  it('returns correct range for left-to-right drag', () => {
    const result = calculateDrawDateRange(2, 5, windowStart)
    expect(result.checkIn).toBe('2025-03-03')
    expect(result.checkOut).toBe('2025-03-07') // day 5 + 1
  })

  it('returns correct range for right-to-left drag', () => {
    const result = calculateDrawDateRange(5, 2, windowStart)
    expect(result.checkIn).toBe('2025-03-03')
    expect(result.checkOut).toBe('2025-03-07')
  })

  it('returns single-day range when start equals current', () => {
    const result = calculateDrawDateRange(3, 3, windowStart)
    expect(result.checkIn).toBe('2025-03-04')
    expect(result.checkOut).toBe('2025-03-05')
  })

  it('returns range starting from day 0', () => {
    const result = calculateDrawDateRange(0, 2, windowStart)
    expect(result.checkIn).toBe('2025-03-01')
    expect(result.checkOut).toBe('2025-03-04')
  })
})

// ── isCellRangeEmpty ─────────────────────────────────────────────────────────

describe('isCellRangeEmpty', () => {
  it('returns true for empty bookings array', () => {
    expect(isCellRangeEmpty([], '2025-03-01', '2025-03-05')).toBe(true)
  })

  it('returns false when active booking overlaps range', () => {
    const bookings = [
      makeBooking({
        room_stay_id: 's1', booking_id: 'b1',
        check_in: '2025-03-02', check_out: '2025-03-04',
        status: 'RESERVED',
      }),
    ]
    expect(isCellRangeEmpty(bookings, '2025-03-01', '2025-03-05')).toBe(false)
  })

  it('returns true when only CANCELLED booking overlaps', () => {
    const bookings = [
      makeBooking({
        room_stay_id: 's1', booking_id: 'b1',
        check_in: '2025-03-02', check_out: '2025-03-04',
        status: 'CANCELLED',
      }),
    ]
    expect(isCellRangeEmpty(bookings, '2025-03-01', '2025-03-05')).toBe(true)
  })

  it('returns true when only CHECKED_OUT booking overlaps', () => {
    const bookings = [
      makeBooking({
        room_stay_id: 's1', booking_id: 'b1',
        check_in: '2025-03-02', check_out: '2025-03-04',
        status: 'CHECKED_OUT',
      }),
    ]
    expect(isCellRangeEmpty(bookings, '2025-03-01', '2025-03-05')).toBe(true)
  })

  it('returns true when booking is entirely before range', () => {
    const bookings = [
      makeBooking({
        room_stay_id: 's1', booking_id: 'b1',
        check_in: '2025-02-25', check_out: '2025-03-01',
        status: 'RESERVED',
      }),
    ]
    expect(isCellRangeEmpty(bookings, '2025-03-01', '2025-03-05')).toBe(true)
  })

  it('returns true when booking is entirely after range', () => {
    const bookings = [
      makeBooking({
        room_stay_id: 's1', booking_id: 'b1',
        check_in: '2025-03-05', check_out: '2025-03-08',
        status: 'RESERVED',
      }),
    ]
    expect(isCellRangeEmpty(bookings, '2025-03-01', '2025-03-05')).toBe(true)
  })

  it('returns false when booking touches range start (overlap by 1 day)', () => {
    const bookings = [
      makeBooking({
        room_stay_id: 's1', booking_id: 'b1',
        check_in: '2025-02-28', check_out: '2025-03-02',
        status: 'CHECKED_IN',
      }),
    ]
    // check_out 03-02 > checkIn 03-01 → overlap
    expect(isCellRangeEmpty(bookings, '2025-03-01', '2025-03-05')).toBe(false)
  })

  it('handles datetime suffix in booking dates (slices to date)', () => {
    const bookings = [
      makeBooking({
        room_stay_id: 's1', booking_id: 'b1',
        check_in: '2025-03-02T14:00:00Z', check_out: '2025-03-04T12:00:00Z',
        status: 'ASSIGNED',
      }),
    ]
    expect(isCellRangeEmpty(bookings, '2025-03-01', '2025-03-05')).toBe(false)
  })
})
