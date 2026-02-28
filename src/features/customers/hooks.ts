import { useQuery } from '@tanstack/react-query'
import { customersApi } from './api'

export interface UseCustomersParams {
  search?: string
  page?: number
  limit?: number
  enabled?: boolean
}

/**
 * useCustomers wraps customer list fetching with caching.
 * Default: latest 20 customers ordered by created_at DESC.
 */
export function useCustomers(params?: UseCustomersParams) {
  const { search, page = 1, limit = 20, enabled = true } = params ?? {}

  return useQuery({
    queryKey: ['customers', { search, page, limit }],
    queryFn: () =>
      customersApi.list({
        ...(search && { search }),
        page,
        limit,
      }),
    enabled,
  })
}
