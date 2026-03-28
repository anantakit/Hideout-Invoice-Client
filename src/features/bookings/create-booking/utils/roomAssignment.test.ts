import { describe, it, expect } from 'vitest'
import { proximityAutoAssignAll } from './roomAssignment'
import type { AvailabilityGroupedResponse } from '../../types'
import type { CreateBookingFormValues } from './createBookingSchema'

type Items = CreateBookingFormValues['items']

function makeAvailData(roomTypes: AvailabilityGroupedResponse['room_types']): AvailabilityGroupedResponse {
  return { check_in: '2024-03-01', check_out: '2024-03-03', room_types: roomTypes }
}

describe('proximityAutoAssignAll', () => {
  it('assigns available rooms to items', () => {
    const items: Items = [
      { room_type_id: 'rt1', quantity: 2, check_in: '2024-03-01', check_out: '2024-03-03', assigned_room_ids: [], payment_mode: 'full', payment_method: 'CASH' } as unknown as Items[0],
    ]
    const avail = makeAvailData([
      {
        room_type_id: 'rt1',
        room_type_name: 'Standard',
        price_per_night: 1000,
        unassigned_count: 0,
        rooms: [
          { room_id: 'r1', room_number: '101', available: true, coord_x: 0, coord_y: 0 },
          { room_id: 'r2', room_number: '102', available: true, coord_x: 1, coord_y: 0 },
          { room_id: 'r3', room_number: '103', available: true, coord_x: 2, coord_y: 0 },
        ],
      },
    ])

    const result = proximityAutoAssignAll(items, avail)
    expect(result[0]).toHaveLength(2)
    // All assigned rooms should be from available rooms
    for (const id of result[0]) {
      expect(['r1', 'r2', 'r3']).toContain(id)
    }
    // No duplicate assignments
    expect(new Set(result[0]).size).toBe(2)
  })

  it('returns empty array when no rooms available', () => {
    const items: Items = [
      { room_type_id: 'rt1', quantity: 2, check_in: '2024-03-01', check_out: '2024-03-03', assigned_room_ids: [] } as unknown as Items[0],
    ]
    const avail = makeAvailData([
      {
        room_type_id: 'rt1',
        room_type_name: 'Standard',
        price_per_night: 1000,
        unassigned_count: 0,
        rooms: [
          { room_id: 'r1', room_number: '101', available: false, coord_x: 0, coord_y: 0 },
        ],
      },
    ])

    const result = proximityAutoAssignAll(items, avail)
    expect(result[0]).toEqual([])
  })

  it('preserves already-assigned rooms', () => {
    const items: Items = [
      { room_type_id: 'rt1', quantity: 2, check_in: '2024-03-01', check_out: '2024-03-03', assigned_room_ids: ['r1'] } as unknown as Items[0],
    ]
    const avail = makeAvailData([
      {
        room_type_id: 'rt1',
        room_type_name: 'Standard',
        price_per_night: 1000,
        unassigned_count: 0,
        rooms: [
          { room_id: 'r1', room_number: '101', available: true, coord_x: 0, coord_y: 0 },
          { room_id: 'r2', room_number: '102', available: true, coord_x: 1, coord_y: 0 },
        ],
      },
    ])

    const result = proximityAutoAssignAll(items, avail)
    expect(result[0]).toContain('r1')
    expect(result[0]).toHaveLength(2)
  })

  it('skips assignment when quantity already met', () => {
    const items: Items = [
      { room_type_id: 'rt1', quantity: 1, check_in: '2024-03-01', check_out: '2024-03-03', assigned_room_ids: ['r1'] } as unknown as Items[0],
    ]
    const avail = makeAvailData([
      {
        room_type_id: 'rt1',
        room_type_name: 'Standard',
        price_per_night: 1000,
        unassigned_count: 0,
        rooms: [
          { room_id: 'r1', room_number: '101', available: true, coord_x: 0, coord_y: 0 },
          { room_id: 'r2', room_number: '102', available: true, coord_x: 1, coord_y: 0 },
        ],
      },
    ])

    const result = proximityAutoAssignAll(items, avail)
    expect(result[0]).toEqual(['r1'])
  })

  it('prefers rooms closer to anchors (proximity scoring)', () => {
    // Item 0 has 1 room already assigned at coord (0,0)
    // Item 1 needs 1 room — should prefer coord (1,0) over (5,5)
    const items: Items = [
      { room_type_id: 'rt1', quantity: 1, check_in: '2024-03-01', check_out: '2024-03-03', assigned_room_ids: ['r1'] } as unknown as Items[0],
      { room_type_id: 'rt2', quantity: 1, check_in: '2024-03-01', check_out: '2024-03-03', assigned_room_ids: [] } as unknown as Items[0],
    ]
    const avail = makeAvailData([
      {
        room_type_id: 'rt1',
        room_type_name: 'Standard',
        price_per_night: 1000,
        unassigned_count: 0,
        rooms: [
          { room_id: 'r1', room_number: '101', available: true, coord_x: 0, coord_y: 0 },
        ],
      },
      {
        room_type_id: 'rt2',
        room_type_name: 'Deluxe',
        price_per_night: 2000,
        unassigned_count: 0,
        rooms: [
          { room_id: 'r-far', room_number: '201', available: true, coord_x: 5, coord_y: 5 },
          { room_id: 'r-near', room_number: '202', available: true, coord_x: 1, coord_y: 0 },
        ],
      },
    ])

    const result = proximityAutoAssignAll(items, avail)
    expect(result[1]).toEqual(['r-near'])
  })

  it('gives same-side bonus (same y-coordinate)', () => {
    // Anchor at (0,0). r-same-side at (3,0) same y. r-other-side at (2,1) closer manhattan but different y.
    // Manhattan: r-other-side = 3, r-same-side = 3 — tied on distance
    // Same-side bonus: r-same-side gets +20, r-other-side gets 0
    const items: Items = [
      { room_type_id: 'rt1', quantity: 1, check_in: '2024-03-01', check_out: '2024-03-03', assigned_room_ids: ['anchor'] } as unknown as Items[0],
      { room_type_id: 'rt2', quantity: 1, check_in: '2024-03-01', check_out: '2024-03-03', assigned_room_ids: [] } as unknown as Items[0],
    ]
    const avail = makeAvailData([
      {
        room_type_id: 'rt1',
        room_type_name: 'Standard',
        price_per_night: 1000,
        unassigned_count: 0,
        rooms: [
          { room_id: 'anchor', room_number: '100', available: true, coord_x: 0, coord_y: 0 },
        ],
      },
      {
        room_type_id: 'rt2',
        room_type_name: 'Deluxe',
        price_per_night: 2000,
        unassigned_count: 0,
        rooms: [
          { room_id: 'r-other-side', room_number: '201', available: true, coord_x: 2, coord_y: 1 },
          { room_id: 'r-same-side', room_number: '202', available: true, coord_x: 3, coord_y: 0 },
        ],
      },
    ])

    const result = proximityAutoAssignAll(items, avail)
    expect(result[1]).toEqual(['r-same-side'])
  })

  it('does not double-assign rooms across items', () => {
    const items: Items = [
      { room_type_id: 'rt1', quantity: 1, check_in: '2024-03-01', check_out: '2024-03-03', assigned_room_ids: [] } as unknown as Items[0],
      { room_type_id: 'rt1', quantity: 1, check_in: '2024-03-01', check_out: '2024-03-03', assigned_room_ids: [] } as unknown as Items[0],
    ]
    const avail = makeAvailData([
      {
        room_type_id: 'rt1',
        room_type_name: 'Standard',
        price_per_night: 1000,
        unassigned_count: 0,
        rooms: [
          { room_id: 'r1', room_number: '101', available: true, coord_x: 0, coord_y: 0 },
          { room_id: 'r2', room_number: '102', available: true, coord_x: 1, coord_y: 0 },
        ],
      },
    ])

    const result = proximityAutoAssignAll(items, avail)
    const allAssigned = [...(result[0] ?? []), ...(result[1] ?? [])]
    expect(new Set(allAssigned).size).toBe(allAssigned.length)
  })
})
