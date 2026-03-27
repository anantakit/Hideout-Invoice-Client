import { apiClient } from '@/shared/api/client'
import type {
  Customer,
  CustomerListResponse,
  CreateCustomerPayload,
  UpdateCustomerPayload,
} from './types'
import type { ApiResponse } from '@/shared/types/api'

export interface CustomerQueryParams {
  search?: string
  page?: number
  limit?: number
}

export const customersApi = {
  list: async (params?: CustomerQueryParams): Promise<CustomerListResponse> => {
    const { data } = await apiClient.get<ApiResponse<CustomerListResponse>>(
      '/customers',
      { params }
    )
    return data.data
  },

  getById: async (id: string): Promise<Customer> => {
    const { data } = await apiClient.get<ApiResponse<Customer>>(
      `/customers/${id}`
    )
    return data.data
  },

  create: async (payload: CreateCustomerPayload): Promise<Customer> => {
    const { data } = await apiClient.post<ApiResponse<Customer>>(
      '/customers',
      payload
    )
    return data.data
  },

  update: async (id: string, payload: UpdateCustomerPayload): Promise<Customer> => {
    const { data } = await apiClient.put<ApiResponse<Customer>>(
      `/customers/${id}`,
      payload
    )
    return data.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/customers/${id}`)
  },
}
