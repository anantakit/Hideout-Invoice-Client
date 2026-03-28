import { describe, it, expect } from 'vitest'
import {
  buildBookingRoomCountMap,
  buildBookingColorMap,
  buildRoomLayerCountMap,
  buildRoomMaps,
  filterRoomsByType,
  buildMobileDateStrip,
  calculateTodayPendingCheckinCount,
} from './computeState'
import type {
  TimelineRoom,
  TimelineBooking,
  UnassignedStay,
  AvailabilityGroupedRoomType,
} from '@/features/bookings/types'

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

function makeRoom(
  id: string,
  roomNumber: string,
  bookings: TimelineBooking[] = [],
): TimelineRoom {
  return { id, room_number: roomNumber, status: 'ACTIVE', bookings }
}

function makeUnassignedStay(
  overrides: Partial<UnassignedStay> & { booking_id: string },
): UnassignedStay {
  return {
    guest_name: 'ทดสอบ',
    room_type_id: 'rt1',
    room_type_name: 'Standard',
    check_in: '2025-03-01',
    check_out: '2025-03-03',
    status: 'RESERVED',
    key_deposit_amount: 0,
    deposit_status: 'NONE',
    balance_amount: 0,
    ...overrides,
  }
}

// ── buildBookingRoomCountMap ─────────────────────────────────────────────────

describe('buildBookingRoomCountMap', () => {
  it('returns empty map for no rooms', () => {
    expect(buildBookingRoomCountMap([])).toEqual({})
  })

  it('returns empty map when rooms have no bookings', () => {
    const rooms = [makeRoom('r1', '101'), makeRoom('r2', '102')]
    expect(buildBookingRoomCountMap(rooms)).toEqual({})
  })

  it('counts single-room booking as 1', () => {
    const b = makeBooking({ room_stay_id: 's1', booking_id: 'b1' })
    const rooms = [makeRoom('r1', '101', [b])]
    expect(buildBookingRoomCountMap(rooms)).toEqual({ b1: 1 })
  })

  it('counts multi-room booking across rooms', () => {
    const b1r1 = makeBooking({ room_stay_id: 's1', booking_id: 'b1' })
    const b1r2 = makeBooking({ room_stay_id: 's2', booking_id: 'b1' })
    const b2r2 = makeBooking({ room_stay_id: 's3', booking_id: 'b2' })
    const rooms = [
      makeRoom('r1', '101', [b1r1]),
      makeRoom('r2', '102', [b1r2, b2r2]),
    ]
    expect(buildBookingRoomCountMap(rooms)).toEqual({ b1: 2, b2: 1 })
  })

  it('does not double-count same room for same booking', () => {
    // Two stays in same room, same booking (e.g. extended stay with transfer)
    const s1 = makeBooking({ room_stay_id: 's1', booking_id: 'b1', check_in: '2025-03-01', check_out: '2025-03-03' })
    const s2 = makeBooking({ room_stay_id: 's2', booking_id: 'b1', check_in: '2025-03-03', check_out: '2025-03-05' })
    const rooms = [makeRoom('r1', '101', [s1, s2])]
    expect(buildBookingRoomCountMap(rooms)).toEqual({ b1: 1 })
  })
})

// ── buildBookingColorMap ─────────────────────────────────────────────────────

describe('buildBookingColorMap', () => {
  it('returns empty map for no rooms', () => {
    expect(buildBookingColorMap([])).toEqual({})
  })

  it('maps room_stay_id to status color class', () => {
    const b1 = makeBooking({ room_stay_id: 's1', booking_id: 'b1', status: 'CHECKED_IN' })
    const b2 = makeBooking({ room_stay_id: 's2', booking_id: 'b2', status: 'RESERVED' })
    const rooms = [makeRoom('r1', '101', [b1, b2])]
    const result = buildBookingColorMap(rooms)
    expect(result['s1']).toContain('bg-bk-checked-in')
    expect(result['s2']).toContain('bg-bk-reserved')
  })

  it('uses fallback color for unknown status', () => {
    const b = makeBooking({ room_stay_id: 's1', booking_id: 'b1', status: 'UNKNOWN' })
    const rooms = [makeRoom('r1', '101', [b])]
    const result = buildBookingColorMap(rooms)
    expect(result['s1']).toContain('bg-secondary')
  })
})

// ── buildRoomLayerCountMap ───────────────────────────────────────────────────

describe('buildRoomLayerCountMap', () => {
  it('returns empty map for no rooms', () => {
    expect(buildRoomLayerCountMap([], '2025-03-01', '2025-03-10')).toEqual({})
  })

  it('returns 0 for room with no bookings', () => {
    const rooms = [makeRoom('r1', '101')]
    expect(buildRoomLayerCountMap(rooms, '2025-03-01', '2025-03-10')).toEqual({ r1: 0 })
  })

  it('returns 1 for room with single booking', () => {
    const b = makeBooking({ room_stay_id: 's1', booking_id: 'b1' })
    const rooms = [makeRoom('r1', '101', [b])]
    expect(buildRoomLayerCountMap(rooms, '2025-03-01', '2025-03-10')).toEqual({ r1: 1 })
  })

  it('returns correct layer count for overlapping bookings', () => {
    const b1 = makeBooking({
      room_stay_id: 's1', booking_id: 'b1',
      check_in: '2025-03-01', check_out: '2025-03-05',
      created_at: '2025-02-28T00:00:00Z',
    })
    const b2 = makeBooking({
      room_stay_id: 's2', booking_id: 'b2',
      check_in: '2025-03-03', check_out: '2025-03-07',
      created_at: '2025-02-28T01:00:00Z',
    })
    const rooms = [makeRoom('r1', '101', [b1, b2])]
    const result = buildRoomLayerCountMap(rooms, '2025-03-01', '2025-03-10')
    expect(result['r1']).toBe(2)
  })

  it('returns 1 for non-overlapping sequential bookings', () => {
    const b1 = makeBooking({
      room_stay_id: 's1', booking_id: 'b1',
      check_in: '2025-03-01', check_out: '2025-03-03',
      created_at: '2025-02-28T00:00:00Z',
    })
    const b2 = makeBooking({
      room_stay_id: 's2', booking_id: 'b2',
      check_in: '2025-03-03', check_out: '2025-03-05',
      created_at: '2025-02-28T01:00:00Z',
    })
    const rooms = [makeRoom('r1', '101', [b1, b2])]
    const result = buildRoomLayerCountMap(rooms, '2025-03-01', '2025-03-10')
    expect(result['r1']).toBe(1)
  })
})

// ── buildRoomMaps ────────────────────────────────────────────────────────────

describe('buildRoomMaps', () => {
  const roomTypes: AvailabilityGroupedRoomType[] = [
    {
      room_type_id: 'rt1',
      room_type_name: 'Standard',
      price_per_night: 1500,
      unassigned_count: 0,
      rooms: [
        { room_id: 'r1', room_number: '101', available: true, coord_x: 0, coord_y: 0 },
        { room_id: 'r2', room_number: '102', available: false, coord_x: 0, coord_y: 0 },
      ],
    },
    {
      room_type_id: 'rt2',
      room_type_name: 'Deluxe',
      price_per_night: 3000,
      unassigned_count: 1,
      rooms: [
        { room_id: 'r3', room_number: '201', available: true, coord_x: 0, coord_y: 0 },
      ],
    },
  ]

  it('builds roomTypeIdByRoomId correctly', () => {
    const { roomTypeIdByRoomId } = buildRoomMaps(roomTypes)
    expect(roomTypeIdByRoomId).toEqual({ r1: 'rt1', r2: 'rt1', r3: 'rt2' })
  })

  it('builds roomTypeNameByRoomId correctly', () => {
    const { roomTypeNameByRoomId } = buildRoomMaps(roomTypes)
    expect(roomTypeNameByRoomId).toEqual({ r1: 'Standard', r2: 'Standard', r3: 'Deluxe' })
  })

  it('builds priceByRoomTypeId correctly', () => {
    const { priceByRoomTypeId } = buildRoomMaps(roomTypes)
    expect(priceByRoomTypeId).toEqual({ rt1: 1500, rt2: 3000 })
  })

  it('returns empty maps for empty input', () => {
    const result = buildRoomMaps([])
    expect(result.roomTypeIdByRoomId).toEqual({})
    expect(result.roomTypeNameByRoomId).toEqual({})
    expect(result.priceByRoomTypeId).toEqual({})
  })
})

// ── filterRoomsByType ────────────────────────────────────────────────────────

describe('filterRoomsByType', () => {
  const rooms: TimelineRoom[] = [
    makeRoom('r1', '101'),
    makeRoom('r2', '102'),
    makeRoom('r3', '201'),
  ]
  const typeMap: Record<string, string> = { r1: 'rt1', r2: 'rt1', r3: 'rt2' }

  it('returns all rooms when selectedTypeId is null', () => {
    expect(filterRoomsByType(rooms, null, typeMap)).toEqual(rooms)
  })

  it('filters to matching room type', () => {
    const result = filterRoomsByType(rooms, 'rt1', typeMap)
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.id)).toEqual(['r1', 'r2'])
  })

  it('returns empty array when no rooms match', () => {
    expect(filterRoomsByType(rooms, 'rt99', typeMap)).toEqual([])
  })

  it('handles empty rooms array', () => {
    expect(filterRoomsByType([], 'rt1', typeMap)).toEqual([])
  })
})

// ── buildMobileDateStrip ─────────────────────────────────────────────────────

describe('buildMobileDateStrip', () => {
  it('builds correct number of days', () => {
    const anchor = new Date('2025-03-15')
    const result = buildMobileDateStrip(anchor, 21, 10)
    expect(result).toHaveLength(21)
  })

  it('centers anchor at the offset position', () => {
    const anchor = new Date('2025-03-15')
    const result = buildMobileDateStrip(anchor, 21, 10)
    // Element at index 10 should be the anchor date
    expect(result[10].toISOString().slice(0, 10)).toBe('2025-03-15')
  })

  it('first date is anchor minus centerOffset', () => {
    const anchor = new Date('2025-03-15')
    const result = buildMobileDateStrip(anchor, 21, 10)
    expect(result[0].toISOString().slice(0, 10)).toBe('2025-03-05')
  })

  it('last date is correct', () => {
    const anchor = new Date('2025-03-15')
    const result = buildMobileDateStrip(anchor, 21, 10)
    expect(result[20].toISOString().slice(0, 10)).toBe('2025-03-25')
  })

  it('handles small strip', () => {
    const anchor = new Date('2025-03-15')
    const result = buildMobileDateStrip(anchor, 3, 1)
    expect(result).toHaveLength(3)
    expect(result[1].toISOString().slice(0, 10)).toBe('2025-03-15')
  })
})

// ── calculateTodayPendingCheckinCount ────────────────────────────────────────

describe('calculateTodayPendingCheckinCount', () => {
  const todayStr = '2025-03-15'

  it('returns 0 when no data', () => {
    expect(calculateTodayPendingCheckinCount([], [], todayStr)).toBe(0)
  })

  it('counts unassigned stays checking in today', () => {
    const stays: UnassignedStay[] = [
      makeUnassignedStay({ booking_id: 'b1', check_in: '2025-03-15', status: 'RESERVED' }),
      makeUnassignedStay({ booking_id: 'b2', check_in: '2025-03-16', status: 'RESERVED' }),
    ]
    expect(calculateTodayPendingCheckinCount(stays, [], todayStr)).toBe(1)
  })

  it('excludes CANCELLED unassigned stays', () => {
    const stays: UnassignedStay[] = [
      makeUnassignedStay({ booking_id: 'b1', check_in: '2025-03-15', status: 'CANCELLED' }),
    ]
    expect(calculateTodayPendingCheckinCount(stays, [], todayStr)).toBe(0)
  })

  it('excludes CHECKED_OUT unassigned stays', () => {
    const stays: UnassignedStay[] = [
      makeUnassignedStay({ booking_id: 'b1', check_in: '2025-03-15', status: 'CHECKED_OUT' }),
    ]
    expect(calculateTodayPendingCheckinCount(stays, [], todayStr)).toBe(0)
  })

  it('counts assigned bookings with RESERVED status checking in today', () => {
    const b = makeBooking({
      room_stay_id: 's1', booking_id: 'b1',
      check_in: '2025-03-15', status: 'RESERVED',
    })
    const rooms = [makeRoom('r1', '101', [b])]
    expect(calculateTodayPendingCheckinCount([], rooms, todayStr)).toBe(1)
  })

  it('counts assigned bookings with ASSIGNED status checking in today', () => {
    const b = makeBooking({
      room_stay_id: 's1', booking_id: 'b1',
      check_in: '2025-03-15', status: 'ASSIGNED',
    })
    const rooms = [makeRoom('r1', '101', [b])]
    expect(calculateTodayPendingCheckinCount([], rooms, todayStr)).toBe(1)
  })

  it('excludes CHECKED_IN bookings (already checked in)', () => {
    const b = makeBooking({
      room_stay_id: 's1', booking_id: 'b1',
      check_in: '2025-03-15', status: 'CHECKED_IN',
    })
    const rooms = [makeRoom('r1', '101', [b])]
    expect(calculateTodayPendingCheckinCount([], rooms, todayStr)).toBe(0)
  })

  it('excludes bookings checking in on a different day', () => {
    const b = makeBooking({
      room_stay_id: 's1', booking_id: 'b1',
      check_in: '2025-03-14', status: 'RESERVED',
    })
    const rooms = [makeRoom('r1', '101', [b])]
    expect(calculateTodayPendingCheckinCount([], rooms, todayStr)).toBe(0)
  })

  it('combines unassigned and assigned counts', () => {
    const stays: UnassignedStay[] = [
      makeUnassignedStay({ booking_id: 'b1', check_in: '2025-03-15', status: 'RESERVED' }),
    ]
    const b = makeBooking({
      room_stay_id: 's1', booking_id: 'b2',
      check_in: '2025-03-15', status: 'ASSIGNED',
    })
    const rooms = [makeRoom('r1', '101', [b])]
    expect(calculateTodayPendingCheckinCount(stays, rooms, todayStr)).toBe(2)
  })

  it('handles check_in with datetime suffix (slices to date only)', () => {
    const b = makeBooking({
      room_stay_id: 's1', booking_id: 'b1',
      check_in: '2025-03-15T14:00:00Z', status: 'RESERVED',
    })
    const rooms = [makeRoom('r1', '101', [b])]
    expect(calculateTodayPendingCheckinCount([], rooms, todayStr)).toBe(1)
  })
})
