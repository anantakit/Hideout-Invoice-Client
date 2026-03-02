import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client'
import type { ApiResponse } from '@/shared/types/api'

export interface TodayOperationsData {
  date: string
  total_rooms: number
  occupied: number
  available: number
  arrivals_today: number
  departures_today: number
}

async function fetchTodayOperations(): Promise<TodayOperationsData> {
  const { data } = await apiClient.get<ApiResponse<TodayOperationsData>>('/operations/today')
  return data.data
}

export function useTodayOperations() {
  const query = useQuery({
    queryKey: ['operations', 'today'],
    queryFn: fetchTodayOperations,
  })

  return {
    data: query.data,
    loading: query.isLoading,
    error: query.isError ? ((query.error as Error)?.message ?? 'Failed to load') : null,
    refetch: query.refetch,
  }
}
