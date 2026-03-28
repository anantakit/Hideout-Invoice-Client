import { describe, it, expect } from 'vitest'
import type { RoomStayResponse, AvailabilityGroupedResponse } from '../types'
import { extractDateRange, buildRoomsByTypeMap, extractSelectedRoomIds } from './checkInAvailability'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeStay(overrides: Partial<RoomStayResponse> = {}): RoomStayResponse {
  return {
    id: 'stay-1',
    booking_id: 'b-1',
    room_type_id: 'rt-1',
    room_type_name: 'Deluxe',
    check_in: '2025-03-01',
    check_out: '2025-03-03',
    nights: 2,
    price_per_night: 1000,
    status: 'CONFIRMED',
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

// ── extractDateRange ────────────────────────────────────────────────────────

describe('extractDateRange', () => {
  it('returns the single stay dates when only one stay', () => {
    const stays = [makeStay({ check_in: '2025-04-10', check_out: '2025-04-12' })]
    expect(extractDateRange(stays)).toEqual({ checkIn: '2025-04-10', checkOut: '2025-04-12' })
  })

  it('returns earliest check-in and latest check-out across multiple stays', () => {
    const stays = [
      makeStay({ id: 's1', check_in: '2025-03-05', check_out: '2025-03-08' }),
      makeStay({ id: 's2', check_in: '2025-03-01', check_out: '2025-03-10' }),
      makeStay({ id: 's3', check_in: '2025-03-03', check_out: '2025-03-06' }),
    ]
    expect(extractDateRange(stays)).toEqual({ checkIn: '2025-03-01', checkOut: '2025-03-10' })
  })

  it('handles stays with identical dates', () => {
    const stays = [
      makeStay({ id: 's1', check_in: '2025-06-01', check_out: '2025-06-03' }),
      makeStay({ id: 's2', check_in: '2025-06-01', check_out: '2025-06-03' }),
    ]
    expect(extractDateRange(stays)).toEqual({ checkIn: '2025-06-01', checkOut: '2025-06-03' })
  })
})

// ── buildRoomsByTypeMap ─────────────────────────────────────────────────────

describe('buildRoomsByTypeMap', () => {
  it('returns empty map when no room types', () => {
    const availability: AvailabilityGroupedResponse = {
      check_in: '2025-03-01',
      check_out: '2025-03-03',
      room_types: [],
    }
    const result = buildRoomsByTypeMap(availability)
    expect(result.size).toBe(0)
  })

  it('maps room_type_id to rooms with only room_id, room_number, available', () => {
    const availability: AvailabilityGroupedResponse = {
      check_in: '2025-03-01',
      check_out: '2025-03-03',
      room_types: [
        {
          room_type_id: 'rt-1',
          room_type_name: 'Deluxe',
          price_per_night: 1500,
          unassigned_count: 0,
          rooms: [
            { room_id: 'r-1', room_number: '101', available: true, coord_x: 0, coord_y: 0 },
            { room_id: 'r-2', room_number: '102', available: false, coord_x: 1, coord_y: 0 },
          ],
        },
      ],
    }
    const result = buildRoomsByTypeMap(availability)
    expect(result.get('rt-1')).toEqual([
      { room_id: 'r-1', room_number: '101', available: true },
      { room_id: 'r-2', room_number: '102', available: false },
    ])
  })

  it('handles multiple room types', () => {
    const availability: AvailabilityGroupedResponse = {
      check_in: '2025-03-01',
      check_out: '2025-03-03',
      room_types: [
        {
          room_type_id: 'rt-1',
          room_type_name: 'Deluxe',
          price_per_night: 1500,
          unassigned_count: 0,
          rooms: [{ room_id: 'r-1', room_number: '101', available: true, coord_x: 0, coord_y: 0 }],
        },
        {
          room_type_id: 'rt-2',
          room_type_name: 'Superior',
          price_per_night: 2000,
          unassigned_count: 1,
          rooms: [{ room_id: 'r-3', room_number: '201', available: true, coord_x: 0, coord_y: 1 }],
        },
      ],
    }
    const result = buildRoomsByTypeMap(availability)
    expect(result.size).toBe(2)
    expect(result.has('rt-1')).toBe(true)
    expect(result.has('rt-2')).toBe(true)
  })
})

// ── extractSelectedRoomIds ──────────────────────────────────────────────────

describe('extractSelectedRoomIds', () => {
  it('returns empty set when no stays have rooms and no selections', () => {
    const stays = [makeStay({ id: 's1', room_id: undefined })]
    const result = extractSelectedRoomIds(stays, {})
    expect(result.size).toBe(0)
  })

  it('uses existing room_id when no explicit selection', () => {
    const stays = [makeStay({ id: 's1', room_id: 'r-1' })]
    const result = extractSelectedRoomIds(stays, {})
    expect(result).toEqual(new Set(['r-1']))
  })

  it('prefers explicit selection over room_id', () => {
    const stays = [makeStay({ id: 's1', room_id: 'r-1' })]
    const result = extractSelectedRoomIds(stays, { 's1': 'r-99' })
    expect(result).toEqual(new Set(['r-99']))
  })

  it('collects unique room IDs across multiple stays', () => {
    const stays = [
      makeStay({ id: 's1', room_id: 'r-1' }),
      makeStay({ id: 's2', room_id: 'r-2' }),
      makeStay({ id: 's3', room_id: undefined }),
    ]
    const result = extractSelectedRoomIds(stays, { 's3': 'r-3' })
    expect(result).toEqual(new Set(['r-1', 'r-2', 'r-3']))
  })

  it('deduplicates when selection and room_id point to the same room', () => {
    const stays = [
      makeStay({ id: 's1', room_id: 'r-1' }),
      makeStay({ id: 's2', room_id: undefined }),
    ]
    const result = extractSelectedRoomIds(stays, { 's2': 'r-1' })
    expect(result).toEqual(new Set(['r-1']))
    expect(result.size).toBe(1)
  })
})
