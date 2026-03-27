import { apiClient } from '@/shared/api/client'
import type { LoginPayload, LoginResponse, ChangePasswordPayload, RefreshResponse } from '@/shared/types/auth'

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/auth/login', payload)
    return res.data
  },

  // Refresh token is sent automatically via httpOnly cookie
  refresh: async (): Promise<RefreshResponse> => {
    const res = await apiClient.post<RefreshResponse>('/auth/refresh')
    return res.data
  },

  // Logout revokes refresh token cookie server-side
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<void> => {
    await apiClient.post('/auth/change-password', payload)
  },
}
