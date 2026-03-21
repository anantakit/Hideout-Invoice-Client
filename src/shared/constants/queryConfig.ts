/** Centralized staleTime constants for TanStack Query */
export const STALE_TIMES = {
  /** Real-time data: availability, room status (30s) */
  REALTIME: 30 * 1000,
  /** Dashboard charts and KPIs (2min) */
  DASHBOARD: 2 * 60 * 1000,
  /** Standard pages: bookings, customers, receipts (5min — matches default) */
  DEFAULT: 5 * 60 * 1000,
  /** Timeline overview — less frequent updates (10min) */
  TIMELINE: 10 * 60 * 1000,
  /** Search/autocomplete dropdowns (10s) */
  SEARCH: 10 * 1000,
} as const
