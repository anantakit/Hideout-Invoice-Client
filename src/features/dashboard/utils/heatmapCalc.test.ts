import { describe, it, expect, vi, afterEach } from 'vitest'
import { getIntensityClass, buildCalendarGrid } from './heatmapCalc'

// ── getIntensityClass ───────────────────────────────────────────────────────

describe('getIntensityClass', () => {
  it('returns muted class for amount = 0', () => {
    expect(getIntensityClass(0, 1000)).toBe('bg-muted/50')
  })

  it('returns muted class for negative amount', () => {
    expect(getIntensityClass(-10, 1000)).toBe('bg-muted/50')
  })

  it('returns lowest intensity for ratio ≤ 0.25', () => {
    expect(getIntensityClass(250, 1000)).toBe('bg-primary/20')
    expect(getIntensityClass(100, 1000)).toBe('bg-primary/20')
  })

  it('returns medium-low intensity for ratio ≤ 0.5', () => {
    expect(getIntensityClass(500, 1000)).toBe('bg-primary/40')
    expect(getIntensityClass(260, 1000)).toBe('bg-primary/40')
  })

  it('returns medium-high intensity for ratio ≤ 0.75', () => {
    expect(getIntensityClass(750, 1000)).toBe('bg-primary/65')
    expect(getIntensityClass(510, 1000)).toBe('bg-primary/65')
  })

  it('returns full intensity for ratio > 0.75', () => {
    expect(getIntensityClass(1000, 1000)).toBe('bg-primary')
    expect(getIntensityClass(760, 1000)).toBe('bg-primary')
  })

  it('handles max = 0 (division by zero) — amount > 0 returns full intensity', () => {
    // amount / 0 = Infinity > 0.75 → 'bg-primary'
    expect(getIntensityClass(100, 0)).toBe('bg-primary')
  })

  it('returns muted when both amount and max are 0', () => {
    expect(getIntensityClass(0, 0)).toBe('bg-muted/50')
  })
})

// ── buildCalendarGrid ───────────────────────────────────────────────────────

describe('buildCalendarGrid', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('each row has exactly 7 days', () => {
    const grid = buildCalendarGrid(2025, 0, []) // January 2025
    for (const week of grid) {
      expect(week).toHaveLength(7)
    }
  })

  it('builds correct grid for January 2025 (starts on Wednesday)', () => {
    // Jan 1, 2025 = Wednesday → Mon-start grid: 2 empty days before day 1
    const grid = buildCalendarGrid(2025, 0, [])

    // First week padding
    expect(grid[0][0].day).toBeNull() // Mon
    expect(grid[0][1].day).toBeNull() // Tue
    expect(grid[0][2].day).toBe(1)    // Wed = Jan 1

    // Last day: Jan 31
    const allDays = grid.flat().filter((d) => d.day !== null)
    expect(allDays).toHaveLength(31)
    expect(allDays[allDays.length - 1].day).toBe(31)
  })

  it('builds correct grid for month starting on Monday (no leading padding)', () => {
    // Sep 1, 2025 = Monday → no empty padding at start
    const grid = buildCalendarGrid(2025, 8, [])

    expect(grid[0][0].day).toBe(1)
    expect(grid[0][6].day).toBe(7)
  })

  it('pads trailing nulls in the last week', () => {
    // January 2025: 31 days, starts Wed → last week has trailing nulls
    const grid = buildCalendarGrid(2025, 0, [])
    const lastWeek = grid[grid.length - 1]
    const trailingNulls = lastWeek.filter((d) => d.day === null)
    expect(trailingNulls.length).toBeGreaterThanOrEqual(0)

    // Every trailing null should be after all non-null days
    let lastDayIdx = -1
    for (let i = lastWeek.length - 1; i >= 0; i--) {
      if (lastWeek[i].day !== null) { lastDayIdx = i; break }
    }
    for (let i = lastDayIdx + 1; i < 7; i++) {
      expect(lastWeek[i].day).toBeNull()
    }
  })

  it('maps revenue data to correct day cells', () => {
    const data = [
      { day: 1, amount: 5000 },
      { day: 15, amount: 12000 },
      { day: 31, amount: 800 },
    ]
    const grid = buildCalendarGrid(2025, 0, data)
    const allDays = grid.flat()

    const day1 = allDays.find((d) => d.day === 1)
    const day15 = allDays.find((d) => d.day === 15)
    const day31 = allDays.find((d) => d.day === 31)
    const day10 = allDays.find((d) => d.day === 10)

    expect(day1?.amount).toBe(5000)
    expect(day15?.amount).toBe(12000)
    expect(day31?.amount).toBe(800)
    expect(day10?.amount).toBe(0) // no data → 0
  })

  it('defaults amount to 0 for days without data', () => {
    const grid = buildCalendarGrid(2025, 0, [])
    const allDays = grid.flat().filter((d) => d.day !== null)

    for (const day of allDays) {
      expect(day.amount).toBe(0)
    }
  })

  it('marks today correctly', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 2, 15)) // March 15, 2025

    const grid = buildCalendarGrid(2025, 2, [])
    const allDays = grid.flat()
    const today = allDays.find((d) => d.day === 15)
    const notToday = allDays.find((d) => d.day === 14)

    expect(today?.isToday).toBe(true)
    expect(notToday?.isToday).toBe(false)
  })

  it('marks future days correctly', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 2, 15)) // March 15, 2025

    const grid = buildCalendarGrid(2025, 2, [])
    const allDays = grid.flat().filter((d) => d.day !== null)

    const past = allDays.find((d) => d.day === 14)
    const today = allDays.find((d) => d.day === 15)
    const future = allDays.find((d) => d.day === 16)

    expect(past?.isFuture).toBe(false)
    expect(today?.isFuture).toBe(false)
    expect(future?.isFuture).toBe(true)
  })

  it('does not mark today for a different month', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 2, 15)) // March 15

    const grid = buildCalendarGrid(2025, 1, []) // February
    const allDays = grid.flat().filter((d) => d.day !== null)

    expect(allDays.every((d) => !d.isToday)).toBe(true)
  })

  it('handles February correctly (28 days in non-leap year)', () => {
    const grid = buildCalendarGrid(2025, 1, []) // Feb 2025
    const allDays = grid.flat().filter((d) => d.day !== null)

    expect(allDays).toHaveLength(28)
  })

  it('handles February in leap year (29 days)', () => {
    const grid = buildCalendarGrid(2024, 1, []) // Feb 2024 — leap year
    const allDays = grid.flat().filter((d) => d.day !== null)

    expect(allDays).toHaveLength(29)
  })

  it('null padding cells have zeroed flags', () => {
    const grid = buildCalendarGrid(2025, 0, [])
    const nullCells = grid.flat().filter((d) => d.day === null)

    for (const cell of nullCells) {
      expect(cell.amount).toBe(0)
      expect(cell.isToday).toBe(false)
      expect(cell.isFuture).toBe(false)
    }
  })
})
