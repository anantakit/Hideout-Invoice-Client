import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { createQueryWrapper } from '@/test/helpers'
import { useDeleteReceipt } from './useDeleteReceipt'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

import toast from 'react-hot-toast'

vi.mock('../api', () => ({
  receiptsApi: {
    delete: vi.fn(),
  },
}))

import { receiptsApi } from '../api'

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useDeleteReceipt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns mutate function and isPending state', () => {
    const { result } = renderHook(() => useDeleteReceipt(), {
      wrapper: createQueryWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.isPending).toBe(false)
  })

  it('calls receiptsApi.delete and shows success toast', async () => {
    vi.mocked(receiptsApi.delete).mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteReceipt(), {
      wrapper: createQueryWrapper(),
    })

    act(() => {
      result.current.mutate('receipt-123')
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('ลบใบเสร็จสำเร็จ')
    })
  })

  it('navigates to specified path on success when navigateTo is provided', async () => {
    vi.mocked(receiptsApi.delete).mockResolvedValue(undefined)

    const { result } = renderHook(
      () => useDeleteReceipt({ navigateTo: '/receipts' }),
      { wrapper: createQueryWrapper() },
    )

    act(() => {
      result.current.mutate('receipt-456')
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('ลบใบเสร็จสำเร็จ')
    })
    expect(mockNavigate).toHaveBeenCalledWith('/receipts')
  })

  it('does not navigate when navigateTo is not provided', async () => {
    vi.mocked(receiptsApi.delete).mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteReceipt(), {
      wrapper: createQueryWrapper(),
    })

    act(() => {
      result.current.mutate('receipt-789')
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('shows error toast on failure', async () => {
    vi.mocked(receiptsApi.delete).mockRejectedValue(
      new Error('ไม่สามารถลบได้'),
    )

    const { result } = renderHook(() => useDeleteReceipt(), {
      wrapper: createQueryWrapper(),
    })

    act(() => {
      result.current.mutate('receipt-bad')
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('ไม่สามารถลบได้')
    })
  })
})
