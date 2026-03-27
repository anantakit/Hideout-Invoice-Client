import { apiClient } from '@/shared/api/client'
import type { DashboardResponse } from './types'

export interface RevenueTargetEntry {
  month: number
  amount: number
}

export const dashboardApi = {
  getDashboard: async (month: string): Promise<DashboardResponse> => {
    const { data } = await apiClient.get('/analytics/dashboard', {
      params: { month },
    })
    return data.data
  },

  upsertRevenueTarget: async (year: number, month: number, amount: number): Promise<void> => {
    await apiClient.put('/revenue-targets', { year, month, amount })
  },
}
