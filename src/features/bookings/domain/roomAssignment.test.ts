import { describe, it, expect } from 'vitest'
import { syncItemDates, calculateUnassignedSlots } from './roomAssignment'

// ── syncItemDates ───────────────────────────────────────────────────────────

describe('syncItemDates', () => {
  it('returns empty object for single item', () => {
    const result = syncItemDates(1, '2025-03-01', '2025-03-03')
    expect(result).toEqual({})
  })

  it('syncs items 1+ with given dates and clears assigned_room_ids', () => {
    const result = syncItemDates(3, '2025-03-01', '2025-03-05')
    expect(result).toEqual({
      1: { check_in: '2025-03-01', check_out: '2025-03-05', assigned_room_ids: [] },
      2: { check_in: '2025-03-01', check_out: '2025-03-05', assigned_room_ids: [] },
    })
  })

  it('never includes index 0', () => {
    const result = syncItemDates(5, '2025-06-01', '2025-06-10')
    expect(result).not.toHaveProperty('0')
    expect(Object.keys(result)).toHaveLength(4)
  })

  it('returns empty object for zero items', () => {
    const result = syncItemDates(0, '2025-03-01', '2025-03-03')
    expect(result).toEqual({})
  })
})

// ── calculateUnassignedSlots ────────────────────────────────────────────────

describe('calculateUnassignedSlots', () => {
  it('returns false when all items are fully assigned', () => {
    const items = [
      { room_type_id: 'rt-1', quantity: 2, assigned_room_ids: ['r1', 'r2'] },
      { room_type_id: 'rt-2', quantity: 1, assigned_room_ids: ['r3'] },
    ]
    expect(calculateUnassignedSlots(items)).toBe(false)
  })

  it('returns true when an item has fewer assigned rooms than quantity', () => {
    const items = [
      { room_type_id: 'rt-1', quantity: 2, assigned_room_ids: ['r1'] },
    ]
    expect(calculateUnassignedSlots(items)).toBe(true)
  })

  it('returns true when assigned_room_ids is empty', () => {
    const items = [
      { room_type_id: 'rt-1', quantity: 1, assigned_room_ids: [] },
    ]
    expect(calculateUnassignedSlots(items)).toBe(true)
  })

  it('ignores items without room_type_id', () => {
    const items = [
      { room_type_id: '', quantity: 1, assigned_room_ids: [] },
    ]
    expect(calculateUnassignedSlots(items)).toBe(false)
  })

  it('handles undefined assigned_room_ids', () => {
    const items = [
      { room_type_id: 'rt-1', quantity: 1, assigned_room_ids: undefined as unknown as string[] },
    ]
    expect(calculateUnassignedSlots(items)).toBe(true)
  })

  it('returns false for empty items array', () => {
    expect(calculateUnassignedSlots([])).toBe(false)
  })

  it('returns false when assigned count equals quantity exactly', () => {
    const items = [
      { room_type_id: 'rt-1', quantity: 3, assigned_room_ids: ['r1', 'r2', 'r3'] },
    ]
    expect(calculateUnassignedSlots(items)).toBe(false)
  })

  it('returns false when over-assigned (more rooms than quantity)', () => {
    const items = [
      { room_type_id: 'rt-1', quantity: 1, assigned_room_ids: ['r1', 'r2'] },
    ]
    expect(calculateUnassignedSlots(items)).toBe(false)
  })
})
