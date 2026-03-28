import { describe, it, expect } from 'vitest'
import type { UnassignedStay, TimelineRoom, TimelineBooking } from '@/features/bookings/types'
import type { RoomEntry } from '../utils/classifyRooms'
import { countUnassignedForDate, buildRangeEntries, filterEntriesByStatus } from './roomFiltering'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeStay(overrides: Partial<UnassignedStay> = {}): UnassignedStay {
  return {
    booking_id: 'b1',
    guest_name: 'สมชาย',
    room_type_id: 'rt1',
    room_type_name: 'Standard',
    check_in: '2026-03-28T00:00:00Z',
    check_out: '2026-03-30T00:00:00Z',
    status: 'CONFIRMED',
    key_deposit_amount: 0,
    deposit_status: 'NONE',
    balance_amount: 0,
    ...overrides,
  }
}

function makeBooking(overrides: Partial<TimelineBooking> = {}): TimelineBooking {
  return {
    room_stay_id: 'rs1',
    booking_id: 'b1',
    guest_name: 'สมชาย',
    check_in: '2026-03-28',
    check_out: '2026-03-30',
    status: 'CONFIRMED',
    balance_amount: 0,
    key_deposit_amount: 0,
    deposit_paid: 0,
    deposit_status: 'NONE',
    source: 'walk_in',
    ...overrides,
  }
}

function makeRoom(overrides: Partial<TimelineRoom> = {}): TimelineRoom {
  return {
    id: 'r1',
    room_number: '101',
    status: 'ACTIVE',
    bookings: [],
    ...overrides,
  }
}

function makeEntry(overrides: Partial<RoomEntry> = {}): RoomEntry {
  return {
    room: makeRoom(),
    typeName: 'Standard',
    status: 'available',
    ...overrides,
  }
}

// ── countUnassignedForDate ───────────────────────────────────────────────────

describe('countUnassignedForDate', () => {
  it('counts stays overlapping the given date', () => {
    const stays = [
      makeStay({ check_in: '2026-03-27T00:00:00Z', check_out: '2026-03-29T00:00:00Z' }),
      makeStay({ booking_id: 'b2', check_in: '2026-03-28T00:00:00Z', check_out: '2026-03-30T00:00:00Z' }),
    ]
    expect(countUnassignedForDate(stays, '2026-03-28')).toBe(2)
  })

  it('excludes stays that do not overlap', () => {
    const stays = [
      makeStay({ check_in: '2026-03-25T00:00:00Z', check_out: '2026-03-27T00:00:00Z' }),
    ]
    expect(countUnassignedForDate(stays, '2026-03-28')).toBe(0)
  })

  it('excludes CANCELLED stays', () => {
    const stays = [
      makeStay({ status: 'CANCELLED' }),
    ]
    expect(countUnassignedForDate(stays, '2026-03-28')).toBe(0)
  })

  it('excludes CHECKED_OUT stays', () => {
    const stays = [
      makeStay({ status: 'CHECKED_OUT' }),
    ]
    expect(countUnassignedForDate(stays, '2026-03-28')).toBe(0)
  })

  it('returns 0 for empty array', () => {
    expect(countUnassignedForDate([], '2026-03-28')).toBe(0)
  })

  it('excludes stay where check_out equals dateStr (half-open interval)', () => {
    const stays = [
      makeStay({ check_in: '2026-03-27T00:00:00Z', check_out: '2026-03-28T00:00:00Z' }),
    ]
    expect(countUnassignedForDate(stays, '2026-03-28')).toBe(0)
  })

  it('includes stay where check_in equals dateStr', () => {
    const stays = [
      makeStay({ check_in: '2026-03-28T14:00:00Z', check_out: '2026-03-30T12:00:00Z' }),
    ]
    expect(countUnassignedForDate(stays, '2026-03-28')).toBe(1)
  })
})

// ── buildRangeEntries ────────────────────────────────────────────────────────

describe('buildRangeEntries', () => {
  it('classifies rooms as range_available when no bookings overlap', () => {
    const entries = [makeEntry({ room: makeRoom({ bookings: [] }) })]
    const result = buildRangeEntries(entries, { checkIn: '2026-04-01', checkOut: '2026-04-03' })
    expect(result.entries[0].status).toBe('range_available')
    expect(result.counts.range_available).toBe(1)
    expect(result.counts.range_occupied).toBe(0)
  })

  it('classifies rooms as range_occupied when booking overlaps range', () => {
    const booking = makeBooking({ check_in: '2026-04-01', check_out: '2026-04-03' })
    const entries = [makeEntry({ room: makeRoom({ bookings: [booking] }) })]
    const result = buildRangeEntries(entries, { checkIn: '2026-04-02', checkOut: '2026-04-04' })
    expect(result.entries[0].status).toBe('range_occupied')
    expect(result.counts.range_occupied).toBe(1)
  })

  it('classifies MAINTENANCE rooms as maintenance regardless of bookings', () => {
    const entries = [makeEntry({ room: makeRoom({ status: 'MAINTENANCE', bookings: [] }) })]
    const result = buildRangeEntries(entries, { checkIn: '2026-04-01', checkOut: '2026-04-03' })
    expect(result.entries[0].status).toBe('maintenance')
    expect(result.counts.maintenance).toBe(1)
  })

  it('returns correct mixed counts', () => {
    const entries = [
      makeEntry({ room: makeRoom({ id: 'r1', bookings: [] }) }),
      makeEntry({ room: makeRoom({ id: 'r2', status: 'MAINTENANCE', bookings: [] }) }),
      makeEntry({
        room: makeRoom({
          id: 'r3',
          bookings: [makeBooking({ check_in: '2026-04-01', check_out: '2026-04-05' })],
        }),
      }),
    ]
    const result = buildRangeEntries(entries, { checkIn: '2026-04-02', checkOut: '2026-04-04' })
    expect(result.counts).toEqual({ range_available: 1, range_occupied: 1, maintenance: 1 })
    expect(result.entries).toHaveLength(3)
  })

  it('handles empty entries', () => {
    const result = buildRangeEntries([], { checkIn: '2026-04-01', checkOut: '2026-04-03' })
    expect(result.entries).toEqual([])
    expect(result.counts).toEqual({ range_available: 0, range_occupied: 0, maintenance: 0 })
  })
})

// ── filterEntriesByStatus ────────────────────────────────────────────────────

describe('filterEntriesByStatus', () => {
  const entries: RoomEntry[] = [
    makeEntry({ status: 'available' }),
    makeEntry({ status: 'checked_in' }),
    makeEntry({ status: 'maintenance' }),
    makeEntry({ status: 'available' }),
  ]

  it('returns all entries when filter is "all"', () => {
    expect(filterEntriesByStatus(entries, 'all')).toHaveLength(4)
  })

  it('filters by specific status', () => {
    const result = filterEntriesByStatus(entries, 'available')
    expect(result).toHaveLength(2)
    expect(result.every((e) => e.status === 'available')).toBe(true)
  })

  it('returns empty array when no entries match', () => {
    expect(filterEntriesByStatus(entries, 'reserved')).toEqual([])
  })

  it('handles empty entries', () => {
    expect(filterEntriesByStatus([], 'available')).toEqual([])
  })
})
