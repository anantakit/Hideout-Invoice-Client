import { describe, it, expect } from 'vitest'
import { calcLineItems, calcDepositSplit, calcTotalRooms } from './bookingSummaryCalc'
import { KEY_DEPOSIT_PER_ROOM } from '../../constants'

describe('calcLineItems', () => {
  const priceMap: Record<string, number> = {
    rt1: 1000,
    rt2: 2000,
  }
  const nameMap: Record<string, string> = {
    rt1: 'Standard',
    rt2: 'Deluxe',
  }

  it('returns empty array for empty items', () => {
    expect(calcLineItems([], priceMap, nameMap)).toEqual([])
  })

  it('builds single line item with rack price', () => {
    const items = [
      { room_type_id: 'rt1', check_in: '2024-03-01', check_out: '2024-03-03', quantity: 1 },
    ]
    const result = calcLineItems(items, priceMap, nameMap)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      index: 0,
      name: 'Standard',
      quantity: 1,
      nights: 2,
      price: 1000,
      rackPrice: 1000,
      hasDiscount: false,
      subtotal: 2000,
    })
  })

  it('builds multiple items with different prices', () => {
    const items = [
      { room_type_id: 'rt1', check_in: '2024-03-01', check_out: '2024-03-03', quantity: 2 },
      { room_type_id: 'rt2', check_in: '2024-03-01', check_out: '2024-03-04', quantity: 1 },
    ]
    const result = calcLineItems(items, priceMap, nameMap)
    expect(result).toHaveLength(2)
    expect(result[0].subtotal).toBe(1000 * 2 * 2) // 4000
    expect(result[1].subtotal).toBe(2000 * 1 * 3) // 6000
  })

  it('applies charged_price as discount', () => {
    const items = [
      { room_type_id: 'rt1', check_in: '2024-03-01', check_out: '2024-03-03', quantity: 1, charged_price: 800 },
    ]
    const result = calcLineItems(items, priceMap, nameMap)
    expect(result[0].price).toBe(800)
    expect(result[0].rackPrice).toBe(1000)
    expect(result[0].hasDiscount).toBe(true)
    expect(result[0].subtotal).toBe(800 * 1 * 2)
  })

  it('filters out items with unknown room_type_id', () => {
    const items = [
      { room_type_id: 'unknown', check_in: '2024-03-01', check_out: '2024-03-03' },
    ]
    expect(calcLineItems(items, priceMap, nameMap)).toEqual([])
  })

  it('filters out items with 0 nights (same-day)', () => {
    const items = [
      { room_type_id: 'rt1', check_in: '2024-03-01', check_out: '2024-03-01' },
    ]
    expect(calcLineItems(items, priceMap, nameMap)).toEqual([])
  })

  it('defaults quantity to 1 when undefined', () => {
    const items = [
      { room_type_id: 'rt1', check_in: '2024-03-01', check_out: '2024-03-02' },
    ]
    const result = calcLineItems(items, priceMap, nameMap)
    expect(result[0].quantity).toBe(1)
  })

  it('defaults name to ห้อง when room type not in nameMap', () => {
    const items = [
      { room_type_id: 'rt1', check_in: '2024-03-01', check_out: '2024-03-02' },
    ]
    const result = calcLineItems(items, { rt1: 1000 }, {})
    expect(result[0].name).toBe('ห้อง')
  })
})

describe('calcDepositSplit', () => {
  it('includes deposit in payment for full_deposit mode', () => {
    const result = calcDepositSplit('full_deposit', 2)
    expect(result.depositInPayment).toBe(KEY_DEPOSIT_PER_ROOM * 2)
    expect(result.depositToCollect).toBe(0)
  })

  it('puts deposit to collect for other modes', () => {
    const result = calcDepositSplit('partial', 2)
    expect(result.depositInPayment).toBe(0)
    expect(result.depositToCollect).toBe(KEY_DEPOSIT_PER_ROOM * 2)
  })

  it('handles reserve mode (deposit to collect)', () => {
    const result = calcDepositSplit('reserve', 1)
    expect(result.depositInPayment).toBe(0)
    expect(result.depositToCollect).toBe(KEY_DEPOSIT_PER_ROOM)
  })

  it('handles full mode (deposit to collect)', () => {
    const result = calcDepositSplit('full', 3)
    expect(result.depositInPayment).toBe(0)
    expect(result.depositToCollect).toBe(KEY_DEPOSIT_PER_ROOM * 3)
  })
})

describe('calcTotalRooms', () => {
  it('sums quantities from all items', () => {
    expect(calcTotalRooms([{ quantity: 2 }, { quantity: 3 }])).toBe(5)
  })

  it('defaults undefined quantity to 1', () => {
    expect(calcTotalRooms([{}, { quantity: 2 }])).toBe(3)
  })

  it('returns 0 for empty array', () => {
    expect(calcTotalRooms([])).toBe(0)
  })

  it('treats quantity 0 as 1 (Math.max)', () => {
    expect(calcTotalRooms([{ quantity: 0 }])).toBe(1)
  })
})
