import { useQuery } from '@tanstack/react-query'
import { usePaginatedQuery, type UsePaginatedQueryOptions } from './usePaginatedQuery'
import type { PaginatedResponse, PaginationParams } from '../types/pagination'

type QueryParams = PaginationParams & { search?: string } & Record<string, unknown>

export interface UseDataTableOptions<T> extends UsePaginatedQueryOptions {
  queryKey: string
  queryFn: (params: QueryParams) => Promise<PaginatedResponse<T>>
  extraParams?: Record<string, string>
}

export function useDataTable<T>(options: UseDataTableOptions<T>) {
  const { queryKey, queryFn, extraParams, ...paginationOptions } = options

  const { page, limit, search, searchInput, setPage, setLimit, setSearchInput, resetFilters } =
    usePaginatedQuery(paginationOptions)

  const params: QueryParams = {
    page,
    limit,
    ...(search && { search }),
    ...extraParams,
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [queryKey, params],
    queryFn: () => queryFn(params),
    placeholderData: (prev: PaginatedResponse<T> | undefined) => prev,
  })

  const items = data?.data ?? []
  const total = data?.meta.total ?? 0
  const totalPages = data?.meta.total_pages ?? 1

  return {
    items,
    isLoading,
    isFetching,
    total,
    totalPages,
    isEmpty: !isLoading && items.length === 0,

    // Search
    searchInput,
    setSearchInput,
    resetFilters,

    // Pagination — spreads directly into <Pagination />
    paginationProps: {
      page,
      totalPages,
      total,
      limit,
      onPageChange: setPage,
      onLimitChange: setLimit,
    },

    // Raw access
    page,
    limit,
    setPage,
    setLimit,
    params,
  }
}
