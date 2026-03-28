import { describe, it, expect } from 'vitest'
import { calcNights, calcLineTotal, calcKeyDeposit } from './bookingCalc'
import { KEY_DEPOSIT_PER_ROOM } from '../../constants'

describe('calcNights', () => {
  it('returns 0 for same-day check-in/check-out', () => {
    expect(calcNights('2024-03-01', '2024-03-01')).toBe(0)
  })

  it('returns 1 for consecutive dates', () => {
    expect(calcNights('2024-03-01', '2024-03-02')).toBe(1)
  })

  it('returns correct count for multi-night stay', () => {
    expect(calcNights('2024-03-01', '2024-03-05')).toBe(4)
  })

  it('handles cross-month dates', () => {
    expect(calcNights('2024-01-30', '2024-02-02')).toBe(3)
  })

  it('handles cross-year dates', () => {
    expect(calcNights('2024-12-30', '2025-01-02')).toBe(3)
  })

  it('returns 0 for empty check-in', () => {
    expect(calcNights('', '2024-03-05')).toBe(0)
  })

  it('returns 0 for empty check-out', () => {
    expect(calcNights('2024-03-01', '')).toBe(0)
  })

  it('returns 0 for invalid date strings', () => {
    expect(calcNights('invalid', '2024-03-01')).toBe(0)
  })

  it('returns 0 when check-out is before check-in', () => {
    expect(calcNights('2024-03-05', '2024-03-01')).toBe(0)
  })
})

describe('calcLineTotal', () => {
  it('calculates price × qty × nights', () => {
    expect(calcLineTotal(1000, 2, 3)).toBe(6000)
  })

  it('returns 0 when price is 0', () => {
    expect(calcLineTotal(0, 2, 3)).toBe(0)
  })

  it('returns 0 when qty is 0', () => {
    expect(calcLineTotal(1000, 0, 3)).toBe(0)
  })

  it('returns 0 when nights is 0', () => {
    expect(calcLineTotal(1000, 2, 0)).toBe(0)
  })

  it('handles single room single night', () => {
    expect(calcLineTotal(1500, 1, 1)).toBe(1500)
  })
})

describe('calcKeyDeposit', () => {
  it('calculates deposit for 1 room', () => {
    expect(calcKeyDeposit(1)).toBe(KEY_DEPOSIT_PER_ROOM)
  })

  it('calculates deposit for multiple rooms', () => {
    expect(calcKeyDeposit(3)).toBe(KEY_DEPOSIT_PER_ROOM * 3)
  })

  it('returns 0 for 0 rooms', () => {
    expect(calcKeyDeposit(0)).toBe(0)
  })
})
