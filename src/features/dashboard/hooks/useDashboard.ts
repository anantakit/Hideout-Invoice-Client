import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../api'

export function useDashboard(month: string) {
  return useQuery({
    queryKey: ['dashboard', month],
    queryFn: () => dashboardApi.getDashboard(month),
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  })
}
