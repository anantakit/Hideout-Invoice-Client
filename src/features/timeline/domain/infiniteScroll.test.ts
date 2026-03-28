import { describe, it, expect } from 'vitest'
import { format } from 'date-fns'
import {
  calculateBufferStart,
  calculateVisibleRange,
  shouldShiftBuffer,
  calculateJumpScrollLeft,
} from './infiniteScroll'

/** Format date in local timezone (avoids UTC offset issues with toISOString). */
const toDateStr = (d: Date) => format(d, 'yyyy-MM-dd')

// ── calculateBufferStart ─────────────────────────────────────────────────────

describe('calculateBufferStart', () => {
  it('returns target date minus bufferDays', () => {
    const target = new Date('2025-03-20T15:30:00')
    const result = calculateBufferStart(target, 14)
    expect(toDateStr(result)).toBe('2025-03-06')
  })

  it('normalizes to start of day', () => {
    const target = new Date('2025-03-20T23:59:59')
    const result = calculateBufferStart(target, 0)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
  })

  it('handles zero buffer days', () => {
    const target = new Date('2025-03-20')
    const result = calculateBufferStart(target, 0)
    expect(toDateStr(result)).toBe('2025-03-20')
  })

  it('crosses month boundary correctly', () => {
    const target = new Date(2025, 2, 5) // March 5 local
    const result = calculateBufferStart(target, 14)
    expect(toDateStr(result)).toBe('2025-02-19')
  })

  it('crosses year boundary correctly', () => {
    const target = new Date(2025, 0, 3) // Jan 3 local
    const result = calculateBufferStart(target, 14)
    expect(toDateStr(result)).toBe('2024-12-20')
  })
})

// ── calculateVisibleRange ────────────────────────────────────────────────────

describe('calculateVisibleRange', () => {
  const cellWidth = 120
  const roomColWidth = 140
  const bufferStart = new Date(2025, 2, 1) // March 1 local

  it('calculates correct day offset from scroll position', () => {
    const result = calculateVisibleRange(360, cellWidth, 1000, roomColWidth, bufferStart)
    expect(result.dayOffset).toBe(3) // 360 / 120 = 3
  })

  it('rounds day offset to nearest integer', () => {
    const result = calculateVisibleRange(300, cellWidth, 1000, roomColWidth, bufferStart)
    expect(result.dayOffset).toBe(3) // 300 / 120 = 2.5 → rounds to 3 (Math.round)
  })

  it('calculates visible days from viewport width minus room column', () => {
    // (1000 - 140) / 120 = 7.17 → ceil = 8
    const result = calculateVisibleRange(0, cellWidth, 1000, roomColWidth, bufferStart)
    expect(result.visibleDays).toBe(8)
  })

  it('computes visibleStartDate by adding dayOffset to bufferStart', () => {
    const result = calculateVisibleRange(600, cellWidth, 1000, roomColWidth, bufferStart)
    expect(result.dayOffset).toBe(5)
    expect(toDateStr(result.visibleStartDate)).toBe('2025-03-06')
  })

  it('handles zero scroll position', () => {
    const result = calculateVisibleRange(0, cellWidth, 1000, roomColWidth, bufferStart)
    expect(result.dayOffset).toBe(0)
    expect(toDateStr(result.visibleStartDate)).toBe('2025-03-01')
  })
})

// ── shouldShiftBuffer ────────────────────────────────────────────────────────

describe('shouldShiftBuffer', () => {
  const totalWidth = 5040 // 42 days * 120px
  const viewportWidth = 1000
  const roomColWidth = 140
  const thresholdPx = 600 // 5 days * 120px

  it('returns null when scroll is in the middle', () => {
    expect(shouldShiftBuffer(2000, totalWidth, viewportWidth, roomColWidth, thresholdPx)).toBeNull()
  })

  it('returns "right" when near right edge', () => {
    // rightRemaining = 5040 - 4200 - 1000 + 140 = -20 < 600
    expect(shouldShiftBuffer(4200, totalWidth, viewportWidth, roomColWidth, thresholdPx)).toBe('right')
  })

  it('returns "left" when near left edge', () => {
    expect(shouldShiftBuffer(100, totalWidth, viewportWidth, roomColWidth, thresholdPx)).toBe('left')
  })

  it('returns null when exactly at threshold boundary on right', () => {
    // rightRemaining = totalWidth - scrollLeft - viewportWidth + roomColWidth = thresholdPx
    // scrollLeft = totalWidth - viewportWidth + roomColWidth - thresholdPx
    const scrollLeft = totalWidth - viewportWidth + roomColWidth - thresholdPx
    expect(shouldShiftBuffer(scrollLeft, totalWidth, viewportWidth, roomColWidth, thresholdPx)).toBeNull()
  })

  it('returns "left" when scrollLeft is exactly 0', () => {
    expect(shouldShiftBuffer(0, totalWidth, viewportWidth, roomColWidth, thresholdPx)).toBe('left')
  })

  it('prefers right when both thresholds would trigger (tiny viewport)', () => {
    // With a very small totalWidth, both conditions could be true.
    // Right is checked first, so it should return 'right'.
    const smallTotal = 500
    expect(shouldShiftBuffer(0, smallTotal, 1000, 0, 600)).toBe('right')
  })
})

// ── calculateJumpScrollLeft ──────────────────────────────────────────────────

describe('calculateJumpScrollLeft', () => {
  it('returns bufferDays * cellWidth', () => {
    expect(calculateJumpScrollLeft(14, 120)).toBe(1680)
  })

  it('returns 0 when bufferDays is 0', () => {
    expect(calculateJumpScrollLeft(0, 120)).toBe(0)
  })

  it('handles non-standard cell widths', () => {
    expect(calculateJumpScrollLeft(14, 80)).toBe(1120)
  })
})
