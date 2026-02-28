import { apiClient } from '../../shared/api/client'
import type { LoginPayload, LoginResponse, ChangePasswordPayload } from '../../shared/types/auth'

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/auth/login', payload)
    return res.data
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<void> => {
    await apiClient.post('/auth/change-password', payload)
  },
}
