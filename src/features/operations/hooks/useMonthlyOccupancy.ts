import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client'
import type { ApiResponse } from '@/shared/types/api'

export interface OccupancyDay {
  date: string
  booked: number
  remaining: number
}

export interface OccupancyRoomType {
  id: string
  name: string
  capacity: number
  days: OccupancyDay[]
}

export interface MonthlyOccupancyData {
  year: number
  month: number
  room_types: OccupancyRoomType[]
}

async function fetchMonthlyOccupancy(year: number, month: number): Promise<MonthlyOccupancyData> {
  const { data } = await apiClient.get<ApiResponse<MonthlyOccupancyData>>('/occupancy/month', {
    params: { year, month },
  })
  return data.data
}

export function useMonthlyOccupancy(year: number, month: number) {
  const query = useQuery({
    queryKey: ['occupancy', 'month', year, month],
    queryFn: () => fetchMonthlyOccupancy(year, month),
    enabled: year >= 2000 && month >= 1 && month <= 12,
  })

  return {
    data: query.data,
    loading: query.isLoading,
    error: query.isError ? ((query.error as Error)?.message ?? 'Failed to load') : null,
    refetch: query.refetch,
  }
}
