export interface DashboardKPI {
  revenue_today: number
  revenue_yesterday: number
  revenue_today_change: number
  earned_revenue_today: number
  revenue_mtd: number
  revenue_prev_mtd: number
  revenue_mtd_change: number
  occupancy_rate: number
  occupied_rooms: number
  total_rooms: number
  adr: number
  revpar: number
  outstanding_balance: number
  outstanding_count: number
  booking_pace_week: number
  booking_pace_prev: number
}

export interface MonthlyRevenueEntry {
  month: number
  current: number
  previous: number
  target: number
}

export interface DailyRevenueEntry {
  day: number
  amount: number
}

export interface PaymentMethodEntry {
  method: string
  amount: number
}

export interface DailyOccupancyEntry {
  date: string
  occupied: number
  earned: number
}

export interface OutstandingBookingEntry {
  booking_id: string
  guest_name: string
  balance: number
  days_overdue: number
}

export interface OwingDepartureEntry {
  booking_id: string
  guest_name: string
  balance: number
}

export interface TodayActions {
  arrivals_total: number
  arrivals_unassigned: number
  departures_today: number
  departures_owing: number
  rooms_cleaning: number
  owing_departures: OwingDepartureEntry[]
  collection_expected: number
  collection_received: number
}

export interface InsightEntry {
  severity: 'critical' | 'warning' | 'info' | 'success'
  message: string
}

export interface OccupancyPressureEntry {
  date: string
  days_until: number
  occupied_rooms: number
  total_rooms: number
  occupancy_pct: number
  target_pct: number
  expected_pct: number
  curve_sample_size: number
  remaining_rooms: number
  scarcity_level: 'last_room' | 'scarce' | 'limited' | 'available' | 'excess'
  date_adr: number
  revenue_at_risk: number
  revenue_upside: number
  daily_pickup: number
  momentum: 'accelerating' | 'steady' | 'slowing' | 'stalled'
  pace_vs_normal: number
  pace_status: 'ahead' | 'normal' | 'behind' | 'far_behind'
  cancel_risk_pct: number
  cancel_risk_level: 'low' | 'medium' | 'high'
  predicted_walkins: number
  walkin_confidence: number
  price_elasticity: 'low' | 'medium' | 'high'
  suggested_adr_change_pct: number
  risk_score: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  action_priority: number
  action_type: 'pricing' | 'marketing' | 'operations' | 'monitoring'
  insight: string
  insight_confidence: number
  confidence_score: number
  confidence_factors: string[]
  zone: 'critical' | 'at_risk' | 'building' | 'healthy' | 'high_demand'
  zone_label: string
  action: string
}

export interface DashboardResponse {
  kpi: DashboardKPI
  today_actions: TodayActions
  insights: InsightEntry[]
  monthly_revenue: MonthlyRevenueEntry[]
  daily_revenue: DailyRevenueEntry[]
  occupancy_trend: DailyOccupancyEntry[]
  payment_method_breakdown: PaymentMethodEntry[]
  outstanding_bookings: OutstandingBookingEntry[]
  occupancy_pressure: OccupancyPressureEntry[]
}
