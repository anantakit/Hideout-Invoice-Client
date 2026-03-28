import { describe, it, expect } from 'vitest'
import { getStatusColorClass } from './statusColors'

describe('getStatusColorClass', () => {
  it.each([
    ['CONFIRMED', 'bg-bk-reserved text-bk-reserved-foreground'],
    ['RESERVED', 'bg-bk-reserved text-bk-reserved-foreground'],
    ['ASSIGNED', 'bg-bk-reserved text-bk-reserved-foreground'],
    ['PARTIALLY_CHECKED_IN', 'bg-bk-reserved text-bk-reserved-foreground'],
    ['CHECKED_IN', 'bg-bk-checked-in text-bk-checked-in-foreground'],
    ['CHECKED_OUT', 'bg-bk-checked-out text-bk-checked-out-foreground'],
    ['NO_SHOW', 'bg-bk-no-show text-bk-no-show-foreground'],
    ['CANCELLED', 'bg-bk-cancelled/30 text-bk-cancelled-foreground'],
  ])('returns correct class for %s', (status, expected) => {
    expect(getStatusColorClass(status)).toBe(expected)
  })

  it('returns fallback for unknown status', () => {
    expect(getStatusColorClass('UNKNOWN')).toBe('bg-secondary text-secondary-foreground')
  })

  it('returns fallback for empty string', () => {
    expect(getStatusColorClass('')).toBe('bg-secondary text-secondary-foreground')
  })
})
