import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from './useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 500))
    expect(result.current).toBe('hello')
  })

  it('does NOT update value before delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 500 } },
    )

    rerender({ value: 'world', delay: 500 })

    act(() => {
      vi.advanceTimersByTime(499)
    })

    expect(result.current).toBe('hello')
  })

  it('updates value after delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 500 } },
    )

    rerender({ value: 'world', delay: 500 })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current).toBe('world')
  })

  it('resets timer when value changes before delay completes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 500 } },
    )

    rerender({ value: 'b', delay: 500 })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Change value again before the first timer fires
    rerender({ value: 'c', delay: 500 })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    // 600ms total since 'b', but only 300ms since 'c' — should still be 'a'
    expect(result.current).toBe('a')

    act(() => {
      vi.advanceTimersByTime(200)
    })

    // 500ms since 'c' — now it should update
    expect(result.current).toBe('c')
  })
})
