import { describe, it, expect } from 'vitest'
import { calculateDayClick } from './dateRange'

describe('calculateDayClick', () => {
  const jan1 = new Date(2025, 0, 1)
  const jan3 = new Date(2025, 0, 3)
  const jan5 = new Date(2025, 0, 5)
  const jan7 = new Date(2025, 0, 7)

  it('first click (no pending) → sets start, end null', () => {
    const result = calculateDayClick(null, null, jan3)
    expect(result).toEqual({ start: jan3, end: null })
  })

  it('second click after start → sets end', () => {
    const result = calculateDayClick(jan3, null, jan5)
    expect(result).toEqual({ start: jan3, end: jan5 })
  })

  it('second click before start → resets to new start', () => {
    const result = calculateDayClick(jan5, null, jan1)
    expect(result).toEqual({ start: jan1, end: null })
  })

  it('click same day as start → resets (isBefore is false, no end → sets end same as start)', () => {
    // isBefore(jan3, jan3) = false, pendingEnd = null → sets end
    const result = calculateDayClick(jan3, null, jan3)
    expect(result).toEqual({ start: jan3, end: jan3 })
  })

  it('click when end already set → resets to new start', () => {
    const result = calculateDayClick(jan1, jan5, jan7)
    expect(result).toEqual({ start: jan7, end: null })
  })

  it('click before start when end already set → resets to new start', () => {
    const result = calculateDayClick(jan3, jan5, jan1)
    expect(result).toEqual({ start: jan1, end: null })
  })
})
