import { describe, it, expect } from 'vitest'
import type { MonthlyRevenueEntry, OccupancyPressureEntry } from '../types'
import {
  calcYTDCumulative,
  calcYoYPercent,
  calcPressureKPI,
  getTopInsights,
} from './dashboardCalc'

// ── helpers ─────────────────────────────────────────────────────────────────

function makeMonthly(overrides: Partial<MonthlyRevenueEntry> & { month: number }): MonthlyRevenueEntry {
  return { current: 0, previous: 0, target: 0, ...overrides }
}

function makePressure(overrides: Partial<OccupancyPressureEntry>): OccupancyPressureEntry {
  return {
    date: '2025-04-01',
    days_until: 7,
    occupied_rooms: 5,
    total_rooms: 10,
    occupancy_pct: 50,
    target_pct: 80,
    expected_pct: 70,
    curve_sample_size: 30,
    remaining_rooms: 5,
    scarcity_level: 'available',
    date_adr: 1500,
    revenue_at_risk: 0,
    revenue_upside: 0,
    daily_pickup: 1,
    momentum: 'steady',
    pace_vs_normal: 1,
    pace_status: 'normal',
    cancel_risk_pct: 5,
    cancel_risk_level: 'low',
    predicted_walkins: 1,
    walkin_confidence: 0.5,
    price_elasticity: 'medium',
    suggested_adr_change_pct: 0,
    risk_score: 20,
    risk_level: 'low',
    action_priority: 1,
    action_type: 'monitoring',
    insight: '',
    insight_confidence: 0.5,
    confidence_score: 0.5,
    confidence_factors: [],
    zone: 'healthy',
    zone_label: 'ปกติ',
    action: '',
    ...overrides,
  }
}

// ── calcYTDCumulative ───────────────────────────────────────────────────────

describe('calcYTDCumulative', () => {
  it('returns empty array for empty data', () => {
    expect(calcYTDCumulative([])).toEqual([])
  })

  it('returns single entry with ytd equal to current', () => {
    const data = [makeMonthly({ month: 1, current: 50000 })]
    const result = calcYTDCumulative(data)

    expect(result).toHaveLength(1)
    expect(result[0].ytd).toBe(50000)
    expect(result[0].month).toBe(1)
  })

  it('accumulates current values across full year', () => {
    const data = Array.from({ length: 12 }, (_, i) =>
      makeMonthly({ month: i + 1, current: 10000 }),
    )
    const result = calcYTDCumulative(data)

    expect(result).toHaveLength(12)
    expect(result[0].ytd).toBe(10000)
    expect(result[5].ytd).toBe(60000)
    expect(result[11].ytd).toBe(120000)
  })

  it('preserves original fields alongside ytd', () => {
    const data = [makeMonthly({ month: 3, current: 100, previous: 80, target: 120 })]
    const result = calcYTDCumulative(data)

    expect(result[0]).toMatchObject({ month: 3, current: 100, previous: 80, target: 120, ytd: 100 })
  })

  it('handles zero current values correctly', () => {
    const data = [
      makeMonthly({ month: 1, current: 5000 }),
      makeMonthly({ month: 2, current: 0 }),
      makeMonthly({ month: 3, current: 3000 }),
    ]
    const result = calcYTDCumulative(data)

    expect(result[0].ytd).toBe(5000)
    expect(result[1].ytd).toBe(5000)
    expect(result[2].ytd).toBe(8000)
  })
})

// ── calcYoYPercent ──────────────────────────────────────────────────────────

describe('calcYoYPercent', () => {
  it('calculates positive growth', () => {
    expect(calcYoYPercent(120, 100)).toBe(20)
  })

  it('calculates negative decline', () => {
    expect(calcYoYPercent(80, 100)).toBe(-20)
  })

  it('returns null when previous is zero', () => {
    expect(calcYoYPercent(100, 0)).toBeNull()
  })

  it('returns null when previous is negative', () => {
    expect(calcYoYPercent(100, -10)).toBeNull()
  })

  it('returns 0% when current equals previous', () => {
    expect(calcYoYPercent(100, 100)).toBe(0)
  })

  it('returns -100% when current is zero', () => {
    expect(calcYoYPercent(0, 100)).toBe(-100)
  })

  it('returns null when both are zero', () => {
    expect(calcYoYPercent(0, 0)).toBeNull()
  })
})

// ── calcPressureKPI ─────────────────────────────────────────────────────────

describe('calcPressureKPI', () => {
  it('returns zeroed KPI for empty data', () => {
    expect(calcPressureKPI([])).toEqual({
      criticalCount: 0,
      totalAtRisk: 0,
      totalUpside: 0,
    })
  })

  it('counts single critical entry', () => {
    const data = [makePressure({ zone: 'critical', revenue_at_risk: 5000, revenue_upside: 1000 })]
    const kpi = calcPressureKPI(data)

    expect(kpi.criticalCount).toBe(1)
    expect(kpi.totalAtRisk).toBe(5000)
    expect(kpi.totalUpside).toBe(1000)
  })

  it('counts both critical and at_risk zones', () => {
    const data = [
      makePressure({ zone: 'critical', revenue_at_risk: 3000, revenue_upside: 500 }),
      makePressure({ zone: 'at_risk', revenue_at_risk: 2000, revenue_upside: 800 }),
      makePressure({ zone: 'healthy', revenue_at_risk: 0, revenue_upside: 200 }),
    ]
    const kpi = calcPressureKPI(data)

    expect(kpi.criticalCount).toBe(2)
    expect(kpi.totalAtRisk).toBe(5000)
    expect(kpi.totalUpside).toBe(1500)
  })

  it('excludes healthy/building/high_demand from critical count', () => {
    const data = [
      makePressure({ zone: 'healthy' }),
      makePressure({ zone: 'building' }),
      makePressure({ zone: 'high_demand' }),
    ]
    expect(calcPressureKPI(data).criticalCount).toBe(0)
  })
})

// ── getTopInsights ──────────────────────────────────────────────────────────

describe('getTopInsights', () => {
  it('returns empty array for empty data', () => {
    expect(getTopInsights([], 5)).toEqual([])
  })

  it('filters entries with insight text', () => {
    const data = [
      makePressure({ insight: 'ราคาต่ำเกินไป', action_priority: 5, zone: 'healthy' }),
      makePressure({ insight: '', zone: 'healthy' }),
    ]
    const result = getTopInsights(data, 10)

    expect(result).toHaveLength(1)
    expect(result[0].insight).toBe('ราคาต่ำเกินไป')
  })

  it('includes critical/at_risk/high_demand zones even without insight text', () => {
    const data = [
      makePressure({ insight: '', zone: 'critical', action_priority: 10 }),
      makePressure({ insight: '', zone: 'at_risk', action_priority: 8 }),
      makePressure({ insight: '', zone: 'high_demand', action_priority: 6 }),
      makePressure({ insight: '', zone: 'healthy', action_priority: 4 }),
      makePressure({ insight: '', zone: 'building', action_priority: 2 }),
    ]
    const result = getTopInsights(data, 10)

    expect(result).toHaveLength(3)
  })

  it('sorts by action_priority descending', () => {
    const data = [
      makePressure({ insight: 'low', action_priority: 1, zone: 'healthy' }),
      makePressure({ insight: 'high', action_priority: 10, zone: 'healthy' }),
      makePressure({ insight: 'mid', action_priority: 5, zone: 'healthy' }),
    ]
    const result = getTopInsights(data, 10)

    expect(result.map((r) => r.insight)).toEqual(['high', 'mid', 'low'])
  })

  it('limits results when limit < matching data', () => {
    const data = [
      makePressure({ insight: 'a', action_priority: 3, zone: 'healthy' }),
      makePressure({ insight: 'b', action_priority: 2, zone: 'healthy' }),
      makePressure({ insight: 'c', action_priority: 1, zone: 'healthy' }),
    ]
    const result = getTopInsights(data, 2)

    expect(result).toHaveLength(2)
    expect(result[0].insight).toBe('a')
    expect(result[1].insight).toBe('b')
  })

  it('returns all matching when limit > data length', () => {
    const data = [makePressure({ insight: 'only one', action_priority: 1, zone: 'healthy' })]
    const result = getTopInsights(data, 100)

    expect(result).toHaveLength(1)
  })

  it('does not mutate original array', () => {
    const data = [
      makePressure({ insight: 'b', action_priority: 1, zone: 'healthy' }),
      makePressure({ insight: 'a', action_priority: 10, zone: 'healthy' }),
    ]
    const originalFirst = data[0]
    getTopInsights(data, 10)

    expect(data[0]).toBe(originalFirst)
  })
})
