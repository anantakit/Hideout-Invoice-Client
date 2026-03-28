import { describe, it, expect } from 'vitest'
import { calcAvailableCount } from './availabilityCalc'

describe('calcAvailableCount', () => {
  it('returns physical minus unassigned', () => {
    expect(calcAvailableCount(10, 3)).toBe(7)
  })

  it('returns 0 when all rooms are booked', () => {
    expect(calcAvailableCount(5, 5)).toBe(0)
  })

  it('returns 0 when unassigned exceeds physical (clamped)', () => {
    expect(calcAvailableCount(3, 5)).toBe(0)
  })

  it('returns full count when no unassigned', () => {
    expect(calcAvailableCount(8, 0)).toBe(8)
  })

  it('returns 0 when physical is 0', () => {
    expect(calcAvailableCount(0, 0)).toBe(0)
  })
})
