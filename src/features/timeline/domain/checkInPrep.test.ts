import { describe, it, expect } from 'vitest'
import type { RoomStayResponse, AvailabilityGroupedResponse } from '@/features/bookings/types'
import {
  partitionStaysByStatus,
  extractCheckInCheckOutDates,
  extractAssignedRoomIds,
  buildAvailableRoomsByType,
} from './checkInPrep'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeStay(overrides: Partial<RoomStayResponse> = {}): RoomStayResponse {
  return {
    id: 'stay-1',
    booking_id: 'b-1',
    room_type_id: 'rt-1',
    room_type_name: 'Standard',
    check_in: '2025-03-01',
    check_out: '2025-03-03',
    nights: 2,
    price_per_night: 1000,
    status: 'RESERVED',
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

// ── partitionStaysByStatus ───────────────────────────────────────────────────

describe('partitionStaysByStatus', () => {
  it('partitions stays into unassigned, assigned, and checkedIn', () => {
    const stays = [
      makeStay({ id: 's1', status: 'RESERVED', room_id: undefined }),
      makeStay({ id: 's2', status: 'RESERVED', room_id: 'r-1' }),
      makeStay({ id: 's3', status: 'ASSIGNED', room_id: 'r-2' }),
      makeStay({ id: 's4', status: 'CHECKED_IN', room_id: 'r-3' }),
    ]

    const result = partitionStaysByStatus(stays)

    expect(result.unassignedStays).toHaveLength(1)
    expect(result.unassignedStays[0].id).toBe('s1')
    expect(result.assignedStays).toHaveLength(2)
    expect(result.checkedInStays).toHaveLength(1)
    expect(result.totalActive).toBe(4)
  })

  it('excludes CANCELLED and CHECKED_OUT stays', () => {
    const stays = [
      makeStay({ id: 's1', status: 'CANCELLED' }),
      makeStay({ id: 's2', status: 'CHECKED_OUT', room_id: 'r-1' }),
      makeStay({ id: 's3', status: 'RESERVED', room_id: undefined }),
    ]

    const result = partitionStaysByStatus(stays)

    expect(result.totalActive).toBe(1)
    expect(result.unassignedStays).toHaveLength(1)
    expect(result.assignedStays).toHaveLength(0)
    expect(result.checkedInStays).toHaveLength(0)
  })

  it('returns empty arrays for empty input', () => {
    const result = partitionStaysByStatus([])

    expect(result.unassignedStays).toHaveLength(0)
    expect(result.assignedStays).toHaveLength(0)
    expect(result.checkedInStays).toHaveLength(0)
    expect(result.totalActive).toBe(0)
  })

  it('classifies ASSIGNED with room_id as assigned', () => {
    const stays = [makeStay({ status: 'ASSIGNED', room_id: 'r-1' })]
    const result = partitionStaysByStatus(stays)

    expect(result.assignedStays).toHaveLength(1)
    expect(result.unassignedStays).toHaveLength(0)
  })
})

// ── extractCheckInCheckOutDates ──────────────────────────────────────────────

describe('extractCheckInCheckOutDates', () => {
  it('returns dates from first unassigned stay', () => {
    const unassigned = [makeStay({ check_in: '2025-03-01T14:00:00Z', check_out: '2025-03-03T12:00:00Z' })]
    const assigned = [makeStay({ check_in: '2025-04-01', check_out: '2025-04-03' })]

    const result = extractCheckInCheckOutDates(unassigned, assigned, [])

    expect(result.checkIn).toBe('2025-03-01')
    expect(result.checkOut).toBe('2025-03-03')
  })

  it('falls back to assigned when no unassigned', () => {
    const assigned = [makeStay({ check_in: '2025-04-01', check_out: '2025-04-05' })]

    const result = extractCheckInCheckOutDates([], assigned, [])

    expect(result.checkIn).toBe('2025-04-01')
    expect(result.checkOut).toBe('2025-04-05')
  })

  it('falls back to checkedIn when no unassigned or assigned', () => {
    const checkedIn = [makeStay({ check_in: '2025-05-10', check_out: '2025-05-12' })]

    const result = extractCheckInCheckOutDates([], [], checkedIn)

    expect(result.checkIn).toBe('2025-05-10')
    expect(result.checkOut).toBe('2025-05-12')
  })

  it('returns empty strings when all arrays are empty', () => {
    const result = extractCheckInCheckOutDates([], [], [])

    expect(result.checkIn).toBe('')
    expect(result.checkOut).toBe('')
  })

  it('slices ISO datetime to date-only', () => {
    const stay = makeStay({ check_in: '2025-06-15T14:00:00+07:00', check_out: '2025-06-18T12:00:00+07:00' })

    const result = extractCheckInCheckOutDates([stay], [], [])

    expect(result.checkIn).toBe('2025-06-15')
    expect(result.checkOut).toBe('2025-06-18')
  })
})

// ── extractAssignedRoomIds ───────────────────────────────────────────────────

describe('extractAssignedRoomIds', () => {
  it('collects room IDs from stays that have rooms', () => {
    const stays = [
      makeStay({ room_id: 'r-1' }),
      makeStay({ room_id: undefined }),
      makeStay({ room_id: 'r-3' }),
    ]

    const result = extractAssignedRoomIds(stays)

    expect(result).toEqual(new Set(['r-1', 'r-3']))
  })

  it('returns empty set for empty input', () => {
    expect(extractAssignedRoomIds([])).toEqual(new Set())
  })

  it('deduplicates room IDs', () => {
    const stays = [
      makeStay({ room_id: 'r-1' }),
      makeStay({ room_id: 'r-1' }),
    ]

    expect(extractAssignedRoomIds(stays).size).toBe(1)
  })
})

// ── buildAvailableRoomsByType ────────────────────────────────────────────────

describe('buildAvailableRoomsByType', () => {
  const availability: AvailabilityGroupedResponse = {
    check_in: '2025-03-01',
    check_out: '2025-03-03',
    room_types: [
      {
        room_type_id: 'rt-1',
        room_type_name: 'Standard',
        price_per_night: 1000,
        unassigned_count: 0,
        rooms: [
          { room_id: 'r-1', room_number: '101', available: true, coord_x: 0, coord_y: 0 },
          { room_id: 'r-2', room_number: '102', available: false, coord_x: 0, coord_y: 0 },
          { room_id: 'r-3', room_number: '103', available: true, coord_x: 0, coord_y: 0 },
        ],
      },
      {
        room_type_id: 'rt-2',
        room_type_name: 'Deluxe',
        price_per_night: 2000,
        unassigned_count: 0,
        rooms: [
          { room_id: 'r-4', room_number: '201', available: true, coord_x: 0, coord_y: 0 },
        ],
      },
    ],
  }

  it('filters to needed room types only', () => {
    const needed = new Set(['rt-1'])
    const result = buildAvailableRoomsByType(availability, needed, new Set())

    expect(result).toHaveLength(1)
    expect(result[0].typeId).toBe('rt-1')
  })

  it('excludes unavailable rooms', () => {
    const needed = new Set(['rt-1'])
    const result = buildAvailableRoomsByType(availability, needed, new Set())

    // r-2 is unavailable
    expect(result[0].rooms).toHaveLength(2)
    expect(result[0].rooms.map((r) => r.room_id)).toEqual(['r-1', 'r-3'])
  })

  it('excludes already-assigned rooms', () => {
    const needed = new Set(['rt-1'])
    const assigned = new Set(['r-1'])
    const result = buildAvailableRoomsByType(availability, needed, assigned)

    expect(result[0].rooms).toHaveLength(1)
    expect(result[0].rooms[0].room_id).toBe('r-3')
  })

  it('omits room type group when all rooms are filtered out', () => {
    const needed = new Set(['rt-2'])
    const assigned = new Set(['r-4'])
    const result = buildAvailableRoomsByType(availability, needed, assigned)

    expect(result).toHaveLength(0)
  })

  it('returns empty array when availability is undefined', () => {
    const result = buildAvailableRoomsByType(undefined, new Set(['rt-1']), new Set())

    expect(result).toEqual([])
  })

  it('returns empty array when no needed types match', () => {
    const result = buildAvailableRoomsByType(availability, new Set(['rt-999']), new Set())

    expect(result).toEqual([])
  })

  it('includes multiple needed types', () => {
    const needed = new Set(['rt-1', 'rt-2'])
    const result = buildAvailableRoomsByType(availability, needed, new Set())

    expect(result).toHaveLength(2)
    expect(result.map((g) => g.typeId)).toEqual(['rt-1', 'rt-2'])
  })
})
