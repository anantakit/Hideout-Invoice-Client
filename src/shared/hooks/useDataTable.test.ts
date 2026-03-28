import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createQueryWrapper } from '@/test/helpers'
import { useDataTable } from './useDataTable'

describe('useDataTable', () => {

  it('returns empty items and default pagination when queryFn returns no data initially', async () => {
    const queryFn = vi.fn().mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, total_pages: 1 },
    })

    const { result } = renderHook(
      () => useDataTable({ queryKey: 'test', queryFn }),
      { wrapper: createQueryWrapper() },
    )

    // Initially loading
    expect(result.current.items).toEqual([])
    expect(result.current.total).toBe(0)
    expect(result.current.totalPages).toBe(1)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.items).toEqual([])
    expect(result.current.isEmpty).toBe(true)
  })

  it('returns items and meta when queryFn resolves with data', async () => {
    const mockData = [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ]
    const queryFn = vi.fn().mockResolvedValue({
      data: mockData,
      meta: { page: 1, limit: 20, total: 2, total_pages: 1 },
    })

    const { result } = renderHook(
      () => useDataTable({ queryKey: 'test-items', queryFn }),
      { wrapper: createQueryWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.items).toEqual(mockData)
    expect(result.current.total).toBe(2)
    expect(result.current.totalPages).toBe(1)
    expect(result.current.isEmpty).toBe(false)
  })

  it('isEmpty is true when not loading and items array is empty', async () => {
    const queryFn = vi.fn().mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, total_pages: 1 },
    })

    const { result } = renderHook(
      () => useDataTable({ queryKey: 'test-empty', queryFn }),
      { wrapper: createQueryWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isEmpty).toBe(true)
    expect(result.current.items).toEqual([])
  })

  it('paginationProps has correct shape', async () => {
    const queryFn = vi.fn().mockResolvedValue({
      data: [{ id: 1 }],
      meta: { page: 1, limit: 20, total: 50, total_pages: 3 },
    })

    const { result } = renderHook(
      () => useDataTable({ queryKey: 'test-pagination', queryFn }),
      { wrapper: createQueryWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.paginationProps).toEqual({
      page: 1,
      totalPages: 3,
      total: 50,
      limit: 20,
      onPageChange: expect.any(Function),
      onLimitChange: expect.any(Function),
    })
  })

  it('extraParams are included in params', async () => {
    const queryFn = vi.fn().mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, total_pages: 1 },
    })

    const { result } = renderHook(
      () =>
        useDataTable({
          queryKey: 'test-extra',
          queryFn,
          extraParams: { status: 'CONFIRMED', room_type: 'deluxe' },
        }),
      { wrapper: createQueryWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.params).toEqual(
      expect.objectContaining({
        page: 1,
        limit: 20,
        status: 'CONFIRMED',
        room_type: 'deluxe',
      }),
    )

    expect(queryFn).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'CONFIRMED',
        room_type: 'deluxe',
      }),
    )
  })
})
