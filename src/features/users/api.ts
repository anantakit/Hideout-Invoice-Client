import { apiClient } from '../../shared/api/client'
import type { User, UserListResponse, CreateUserPayload, UpdateUserPayload } from '../../shared/types/auth'
import type { ApiResponse } from '../../shared/types/api'
import type { PaginationParams } from '../../shared/types/pagination'

export interface UserQueryParams extends PaginationParams {
  search?: string
}

export const adminApi = {
  listUsers: async (params?: UserQueryParams): Promise<UserListResponse> => {
    const { data } = await apiClient.get<ApiResponse<UserListResponse>>('/admin/users', { params })
    return data.data
  },

  createUser: async (payload: CreateUserPayload): Promise<User> => {
    const res = await apiClient.post<User>('/admin/users', payload)
    return res.data
  },

  updateUser: async (id: string, payload: UpdateUserPayload): Promise<User> => {
    const res = await apiClient.patch<User>(`/admin/users/${id}`, payload)
    return res.data
  },

  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${id}`)
  },
}
