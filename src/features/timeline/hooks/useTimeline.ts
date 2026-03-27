import { useQuery } from '@tanstack/react-query'
import { bookingsApi } from '@/features/bookings/api'

/**
 * Fetch the 7-day rolling timeline.
 * Re-fetches when the window changes. Stale time is short (30 s) because
 * room status can change frequently during operations hours.
 *
 * @param from YYYY-MM-DD inclusive
 * @param to   YYYY-MM-DD exclusive
 */
export function useTimeline(from: string, to: string) {
  return useQuery({
    queryKey: ['timeline', from, to] as const,
    queryFn: () => bookingsApi.getTimeline(from, to),
    enabled: Boolean(from && to),
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  })
}
