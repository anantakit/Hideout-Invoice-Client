import { describe, it, expect } from 'vitest'
import { expandGroupedStays } from './expandGroupedStays'
import type { RoomTypeBookingItemForm } from './createBookingSchema'

// Helper to build a valid item (satisfies zod inferred type)
function makeItem(overrides: Partial<RoomTypeBookingItemForm> & { room_type_id: string; quantity: number; check_in: string; check_out: string }): RoomTypeBookingItemForm {
  return {
    assigned_room_ids: [],
    ...overrides,
  } as RoomTypeBookingItemForm
}

describe('expandGroupedStays', () => {
  it('expands single room type with qty 1 and no assignment', () => {
    const items = [makeItem({ room_type_id: 'rt1', quantity: 1, check_in: '2024-03-01', check_out: '2024-03-03' })]
    const result = expandGroupedStays(items)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      room_type_id: 'rt1',
      room_id: null,
      check_in: '2024-03-01',
      check_out: '2024-03-03',
    })
  })

  it('expands qty 3 into 3 individual stays', () => {
    const items = [makeItem({ room_type_id: 'rt1', quantity: 3, check_in: '2024-03-01', check_out: '2024-03-03' })]
    const result = expandGroupedStays(items)
    expect(result).toHaveLength(3)
    result.forEach((stay) => {
      expect(stay.room_type_id).toBe('rt1')
      expect(stay.room_id).toBeNull()
    })
  })

  it('assigns room_ids to first N slots when partially assigned', () => {
    const items = [makeItem({
      room_type_id: 'rt1',
      quantity: 3,
      check_in: '2024-03-01',
      check_out: '2024-03-03',
      assigned_room_ids: ['room-a', 'room-b'],
    })]
    const result = expandGroupedStays(items)
    expect(result).toHaveLength(3)
    expect(result[0].room_id).toBe('room-a')
    expect(result[1].room_id).toBe('room-b')
    expect(result[2].room_id).toBeNull()
  })

  it('expands multiple room types', () => {
    const items = [
      makeItem({ room_type_id: 'rt1', quantity: 2, check_in: '2024-03-01', check_out: '2024-03-03' }),
      makeItem({ room_type_id: 'rt2', quantity: 1, check_in: '2024-03-05', check_out: '2024-03-07' }),
    ]
    const result = expandGroupedStays(items)
    expect(result).toHaveLength(3)
    expect(result[0].room_type_id).toBe('rt1')
    expect(result[1].room_type_id).toBe('rt1')
    expect(result[2].room_type_id).toBe('rt2')
    expect(result[2].check_in).toBe('2024-03-05')
  })

  it('includes charged_price when set', () => {
    const items = [makeItem({
      room_type_id: 'rt1',
      quantity: 1,
      check_in: '2024-03-01',
      check_out: '2024-03-03',
      charged_price: 800,
    })]
    const result = expandGroupedStays(items)
    expect(result[0].charged_price).toBe(800)
  })

  it('omits charged_price when not set', () => {
    const items = [makeItem({ room_type_id: 'rt1', quantity: 1, check_in: '2024-03-01', check_out: '2024-03-03' })]
    const result = expandGroupedStays(items)
    expect(result[0]).not.toHaveProperty('charged_price')
  })
})
