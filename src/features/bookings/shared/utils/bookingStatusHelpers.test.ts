import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  bookingStatusVariant,
  stayStatusVariant,
  mapRoomGroups,
  addDaysToISO,
  calcNights,
  isCheckInToday,
  isCheckInOverdue,
} from './bookingStatusHelpers'
import type { RoomGroupSource } from './bookingStatusHelpers'

// ── bookingStatusVariant ────────────────────────────────────────────────────

describe('bookingStatusVariant', () => {
  it('maps CONFIRMED → blue', () => {
    expect(bookingStatusVariant('CONFIRMED')).toBe('blue')
  })

  it('maps PARTIALLY_CHECKED_IN → amber', () => {
    expect(bookingStatusVariant('PARTIALLY_CHECKED_IN')).toBe('amber')
  })

  it('maps CHECKED_IN → green', () => {
    expect(bookingStatusVariant('CHECKED_IN')).toBe('green')
  })

  it('maps CHECKED_OUT → gray', () => {
    expect(bookingStatusVariant('CHECKED_OUT')).toBe('gray')
  })

  it('maps CANCELLED → red', () => {
    expect(bookingStatusVariant('CANCELLED')).toBe('red')
  })

  it('returns default for unknown status', () => {
    expect(bookingStatusVariant('UNKNOWN')).toBe('default')
  })
})

// ── stayStatusVariant ───────────────────────────────────────────────────────

describe('stayStatusVariant', () => {
  it('maps ASSIGNED → default', () => {
    expect(stayStatusVariant('ASSIGNED')).toBe('default')
  })

  it('maps CHECKED_IN → green', () => {
    expect(stayStatusVariant('CHECKED_IN')).toBe('green')
  })

  it('maps CHECKED_OUT → gray', () => {
    expect(stayStatusVariant('CHECKED_OUT')).toBe('gray')
  })

  it('maps CANCELLED → red', () => {
    expect(stayStatusVariant('CANCELLED')).toBe('red')
  })

  it('maps RESERVED (default) → gray', () => {
    expect(stayStatusVariant('RESERVED')).toBe('gray')
  })
})

// ── mapRoomGroups ───────────────────────────────────────────────────────────

describe('mapRoomGroups', () => {
  const source: RoomGroupSource = {
    room_types: [
      {
        room_type_id: 'rt1',
        room_type_name: 'Standard',
        price_per_night: 1000,
        rooms: [
          { room_id: 'r1', room_number: '101', available: true },
          { room_id: 'r2', room_number: '102', available: false },
          { room_id: 'r3', room_number: '103', available: true },
        ],
      },
      {
        room_type_id: 'rt2',
        room_type_name: 'Deluxe',
        price_per_night: 2000,
        rooms: [
          { room_id: 'r4', room_number: '201', available: true },
        ],
      },
    ],
  }

  it('filters to available rooms and marks isSameType', () => {
    const result = mapRoomGroups(source, 'rt1')
    expect(result).toHaveLength(2)
    expect(result[0].isSameType).toBe(true)
    expect(result[0].rooms).toHaveLength(2) // r1, r3 (available)
    expect(result[1].isSameType).toBe(false)
  })

  it('excludes a specific room by excludeRoomId', () => {
    const result = mapRoomGroups(source, 'rt1', 'r1')
    expect(result[0].rooms).toHaveLength(1) // only r3
    expect(result[0].rooms[0].room_id).toBe('r3')
  })

  it('omits room type groups with no available rooms', () => {
    const noAvail: RoomGroupSource = {
      room_types: [
        {
          room_type_id: 'rt1',
          room_type_name: 'Standard',
          price_per_night: 1000,
          rooms: [{ room_id: 'r1', room_number: '101', available: false }],
        },
      ],
    }
    const result = mapRoomGroups(noAvail, 'rt1')
    expect(result).toHaveLength(0)
  })
})

// ── addDaysToISO ────────────────────────────────────────────────────────────

describe('addDaysToISO', () => {
  it('adds days to a date', () => {
    expect(addDaysToISO('2024-03-01', 3)).toBe('2024-03-04')
  })

  it('handles cross-month', () => {
    expect(addDaysToISO('2024-01-30', 3)).toBe('2024-02-02')
  })

  it('handles cross-year', () => {
    expect(addDaysToISO('2024-12-30', 3)).toBe('2025-01-02')
  })

  it('handles adding 0 days', () => {
    expect(addDaysToISO('2024-03-15', 0)).toBe('2024-03-15')
  })

  it('handles negative days', () => {
    expect(addDaysToISO('2024-03-15', -2)).toBe('2024-03-13')
  })
})

// ── calcNights (shared version) ─────────────────────────────────────────────

describe('calcNights', () => {
  it('returns correct night count', () => {
    expect(calcNights('2024-03-01', '2024-03-04')).toBe(3)
  })

  it('returns 0 for same day', () => {
    expect(calcNights('2024-03-01', '2024-03-01')).toBe(0)
  })

  it('returns 0 when check-out before check-in', () => {
    expect(calcNights('2024-03-05', '2024-03-01')).toBe(0)
  })
})

// ── isCheckInToday / isCheckInOverdue ────────────────────────────────────────

describe('isCheckInToday', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-03-15T10:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true when check-in is today', () => {
    expect(isCheckInToday('2024-03-15')).toBe(true)
  })

  it('returns false when check-in is another day', () => {
    expect(isCheckInToday('2024-03-14')).toBe(false)
    expect(isCheckInToday('2024-03-16')).toBe(false)
  })

  it('returns false for invalid date', () => {
    expect(isCheckInToday('invalid')).toBe(false)
  })
})

describe('isCheckInOverdue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-03-15T10:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true when check-in is in the past', () => {
    expect(isCheckInOverdue('2024-03-14')).toBe(true)
  })

  it('returns false when check-in is today', () => {
    expect(isCheckInOverdue('2024-03-15')).toBe(false)
  })

  it('returns false when check-in is in the future', () => {
    expect(isCheckInOverdue('2024-03-16')).toBe(false)
  })

  it('returns false for invalid date', () => {
    expect(isCheckInOverdue('invalid')).toBe(false)
  })
})
