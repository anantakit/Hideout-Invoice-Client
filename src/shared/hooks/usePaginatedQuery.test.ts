import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePaginatedQuery } from './usePaginatedQuery'

describe('usePaginatedQuery', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('has correct defaults: page=1, limit=20, search="", searchInput=""', () => {
    const { result } = renderHook(() => usePaginatedQuery())

    expect(result.current.page).toBe(1)
    expect(result.current.limit).toBe(20)
    expect(result.current.search).toBe('')
    expect(result.current.searchInput).toBe('')
  })

  it('setPage updates page', () => {
    const { result } = renderHook(() => usePaginatedQuery())

    act(() => {
      result.current.setPage(3)
    })

    expect(result.current.page).toBe(3)
  })

  it('setLimit updates limit AND resets page to 1', () => {
    const { result } = renderHook(() => usePaginatedQuery())

    act(() => {
      result.current.setPage(5)
    })
    expect(result.current.page).toBe(5)

    act(() => {
      result.current.setLimit(50)
    })

    expect(result.current.limit).toBe(50)
    expect(result.current.page).toBe(1)
  })

  it('setSearchInput updates searchInput, debounced search updates after delay', () => {
    const { result } = renderHook(() => usePaginatedQuery({ debounceMs: 300 }))

    act(() => {
      result.current.setSearchInput('hello')
    })

    expect(result.current.searchInput).toBe('hello')
    expect(result.current.search).toBe('')

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.search).toBe('hello')
  })

  it('search change resets page to 1', () => {
    const { result } = renderHook(() => usePaginatedQuery({ debounceMs: 300 }))

    act(() => {
      result.current.setPage(3)
    })
    expect(result.current.page).toBe(3)

    act(() => {
      result.current.setSearchInput('test')
    })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.search).toBe('test')
    expect(result.current.page).toBe(1)
  })

  it('resetFilters clears searchInput and resets page to 1', () => {
    const { result } = renderHook(() => usePaginatedQuery({ debounceMs: 300 }))

    act(() => {
      result.current.setSearchInput('query')
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    act(() => {
      result.current.setPage(4)
    })

    expect(result.current.searchInput).toBe('query')
    expect(result.current.page).toBe(4)

    act(() => {
      result.current.resetFilters()
    })

    expect(result.current.searchInput).toBe('')
    expect(result.current.page).toBe(1)
  })

  it('custom defaultLimit works', () => {
    const { result } = renderHook(() => usePaginatedQuery({ defaultLimit: 50 }))
    expect(result.current.limit).toBe(50)
  })

  it('params object reflects current state (includes search only when non-empty)', () => {
    const { result } = renderHook(() => usePaginatedQuery({ debounceMs: 300 }))

    // Initially no search key
    expect(result.current.params).toEqual({ page: 1, limit: 20 })
    expect(result.current.params).not.toHaveProperty('search')

    act(() => {
      result.current.setSearchInput('foo')
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.params).toEqual({ page: 1, limit: 20, search: 'foo' })
  })
})
