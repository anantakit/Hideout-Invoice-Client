import { useState, useEffect } from 'react'
import { useDebounce } from './useDebounce'
import type { PaginationParams } from '../types/pagination'

export interface UsePaginatedQueryOptions {
  defaultLimit?: number
  debounceMs?: number
}

export interface UsePaginatedQueryResult {
  page: number
  limit: number
  search: string
  searchInput: string
  params: PaginationParams & { search?: string }
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setSearchInput: (value: string) => void
  resetFilters: () => void
}

/**
 * usePaginatedQuery manages page, limit, and debounced search state for
 * server-side paginated list endpoints.
 *
 * Usage:
 *   const { page, limit, searchInput, params, setPage, setLimit, setSearchInput } =
 *     usePaginatedQuery({ defaultLimit: 20 })
 *
 *   // Use params as query parameters directly:
 *   useQuery({ queryKey: ['items', params], queryFn: () => api.list(params) })
 */
export function usePaginatedQuery(options?: UsePaginatedQueryOptions): UsePaginatedQueryResult {
  const { defaultLimit = 20, debounceMs = 300 } = options ?? {}

  const [page, setPageState] = useState(1)
  const [limit, setLimitState] = useState(defaultLimit)
  const [searchInput, setSearchInputState] = useState('')

  const search = useDebounce(searchInput, debounceMs)

  // Reset to page 1 whenever the debounced search term changes.
  useEffect(() => {
    setPageState(1)
  }, [search])

  const setPage = (p: number) => setPageState(p)

  const setLimit = (l: number) => {
    setLimitState(l)
    setPageState(1)
  }

  const setSearchInput = (value: string) => setSearchInputState(value)

  const resetFilters = () => {
    setSearchInputState('')
    setPageState(1)
  }

  const params: PaginationParams & { search?: string } = {
    page,
    limit,
    ...(search && { search }),
  }

  return { page, limit, search, searchInput, params, setPage, setLimit, setSearchInput, resetFilters }
}
