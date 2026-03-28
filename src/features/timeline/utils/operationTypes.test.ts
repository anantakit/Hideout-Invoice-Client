import { describe, it, expect } from 'vitest'
import { toDateStr, formatNightsLabel, type CheckinBooking } from './operationTypes'

// ─── toDateStr ──────────────────────────────────────────────────────────────

describe('toDateStr', () => {
  it('extracts date from ISO datetime string', () => {
    expect(toDateStr('2024-03-15T14:30:00Z')).toBe('2024-03-15')
  })

  it('returns date-only string unchanged', () => {
    expect(toDateStr('2024-03-15')).toBe('2024-03-15')
  })

  it('handles datetime with timezone offset', () => {
    expect(toDateStr('2024-12-31T23:59:59+07:00')).toBe('2024-12-31')
  })
})

// ─── formatNightsLabel ──────────────────────────────────────────────────────

function makeCheckin(overrides: Partial<CheckinBooking> = {}): CheckinBooking {
  return {
    bookingId: 'b1',
    guestName: 'Test',
    typeName: '',
    nights: 2,
    assignedRooms: [],
    unassignedCount: 0,
    totalStays: 1,
    stayStatuses: [],
    roomNights: [],
    unassignedTypes: [],
    ...overrides,
  }
}

describe('formatNightsLabel', () => {
  it('returns "N คืน" for no roomNights (unassigned)', () => {
    const ci = makeCheckin({ nights: 3, roomNights: [] })
    expect(formatNightsLabel(ci)).toBe('3 คืน')
  })

  it('returns "N คืน" for single room', () => {
    const ci = makeCheckin({
      nights: 2,
      roomNights: [{ roomNumber: '101', nights: 2 }],
    })
    expect(formatNightsLabel(ci)).toBe('2 คืน')
  })

  it('returns "N คืน" when multiple rooms have same nights', () => {
    const ci = makeCheckin({
      nights: 3,
      roomNights: [
        { roomNumber: '101', nights: 3 },
        { roomNumber: '102', nights: 3 },
      ],
    })
    expect(formatNightsLabel(ci)).toBe('3 คืน')
  })

  it('returns breakdown when rooms have different nights', () => {
    const ci = makeCheckin({
      nights: 3,
      roomNights: [
        { roomNumber: '101', nights: 2 },
        { roomNumber: '102', nights: 3 },
      ],
    })
    // Groups by nights: 101=2คืน 102=3คืน
    expect(formatNightsLabel(ci)).toBe('101=2คืน 102=3คืน')
  })

  it('groups multiple rooms with same nights in breakdown', () => {
    const ci = makeCheckin({
      nights: 2,
      roomNights: [
        { roomNumber: '101', nights: 2 },
        { roomNumber: '102', nights: 3 },
        { roomNumber: '103', nights: 2 },
      ],
    })
    expect(formatNightsLabel(ci)).toBe('101,103=2คืน 102=3คืน')
  })
})
