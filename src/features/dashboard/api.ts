import { apiClient } from '../../shared/api/client'
import type { DashboardResponse } from './types'

export const dashboardApi = {
  getDashboard: async (month: string): Promise<DashboardResponse> => {
    const { data } = await apiClient.get('/analytics/dashboard', {
      params: { month },
    })
    return data.data
  },
}
