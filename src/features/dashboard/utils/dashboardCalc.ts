import type { MonthlyRevenueEntry, OccupancyPressureEntry } from '../types'

// ── Revenue ──────────────────────────────────────────────────────────────────

export interface ChartDataEntry extends MonthlyRevenueEntry {
  ytd: number
}

/** Enrich monthly data with YTD cumulative column. */
export function calcYTDCumulative(data: MonthlyRevenueEntry[]): ChartDataEntry[] {
  let cumulative = 0
  return data.map((d) => {
    cumulative += d.current
    return { ...d, ytd: cumulative }
  })
}

/** Calculate YoY percentage change. Returns null if previous is zero. */
export function calcYoYPercent(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return ((current - previous) / previous) * 100
}

// ── Occupancy Pressure ───────────────────────────────────────────────────────

export interface PressureKPI {
  criticalCount: number
  totalAtRisk: number
  totalUpside: number
}

/** Aggregate risk KPIs from pressure data. */
export function calcPressureKPI(data: OccupancyPressureEntry[]): PressureKPI {
  return {
    criticalCount: data.filter((d) => d.zone === 'critical' || d.zone === 'at_risk').length,
    totalAtRisk: data.reduce((s, d) => s + d.revenue_at_risk, 0),
    totalUpside: data.reduce((s, d) => s + d.revenue_upside, 0),
  }
}

/** Get top actionable insights sorted by priority. */
export function getTopInsights(data: OccupancyPressureEntry[], limit: number): OccupancyPressureEntry[] {
  return [...data]
    .filter((d) => d.insight || d.zone === 'critical' || d.zone === 'at_risk' || d.zone === 'high_demand')
    .sort((a, b) => b.action_priority - a.action_priority)
    .slice(0, limit)
}
