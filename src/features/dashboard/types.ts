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
}

export interface RoomTypeRevenueEntry {
  room_type_name: string
  revenue: number
}

export interface DailyRevenueEntry {
  day: number
  amount: number
}

export interface PaymentMethodEntry {
  method: string
  amount: number
}

export interface UpcomingCheckinEntry {
  date: string
  count: number
  booked_rooms: number
}

export interface DailyOccupancyEntry {
  date: string
  occupied: number
  earned: number
}

export interface ForecastRevenueEntry {
  date: string
  amount: number
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

export interface RevenueTrendEntry {
  date: string
  cash: number
  earned: number
}

export interface InsightEntry {
  severity: 'critical' | 'warning' | 'info' | 'success'
  message: string
}

export interface DashboardResponse {
  kpi: DashboardKPI
  today_actions: TodayActions
  insights: InsightEntry[]
  revenue_trend: RevenueTrendEntry[]
  monthly_revenue: MonthlyRevenueEntry[]
  daily_revenue: DailyRevenueEntry[]
  occupancy_trend: DailyOccupancyEntry[]
  revenue_by_room_type: RoomTypeRevenueEntry[]
  payment_method_breakdown: PaymentMethodEntry[]
  upcoming_checkins: UpcomingCheckinEntry[]
  forecast_revenue: ForecastRevenueEntry[]
  outstanding_bookings: OutstandingBookingEntry[]
}
