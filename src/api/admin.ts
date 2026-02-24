import { apiClient } from './client'
import type { User, CreateUserPayload, UpdateUserPayload } from '../types/auth'

export const adminApi = {
  listUsers: async (): Promise<User[]> => {
    const res = await apiClient.get<{ data: User[] }>('/admin/users')
    return res.data.data
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
