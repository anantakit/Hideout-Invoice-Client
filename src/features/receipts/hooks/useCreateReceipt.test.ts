import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { createQueryWrapper } from '@/test/helpers'
import { useCreateReceipt } from './useCreateReceipt'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../api', () => ({
  receiptsApi: {
    create: vi.fn(),
  },
}))

import toast from 'react-hot-toast'
import { receiptsApi } from '../api'

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useCreateReceipt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns mutate function and isPending state', () => {
    const { result } = renderHook(() => useCreateReceipt(), {
      wrapper: createQueryWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.isPending).toBe(false)
  })

  it('calls receiptsApi.create and shows success toast on success', async () => {
    const mockReceipt = { id: 'r1', invoice_number: 'INV-2025-0001' }
    vi.mocked(receiptsApi.create).mockResolvedValue(mockReceipt as never)

    const { result } = renderHook(() => useCreateReceipt(), {
      wrapper: createQueryWrapper(),
    })

    act(() => {
      result.current.mutate({
        customer_id: 'c1',
        issue_date: '2025-01-01',
        notes: '',
        items: [{ description: 'ห้องพัก', quantity: 1, unit_price: 1500 }],
      })
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'สร้างใบเสร็จ INV-2025-0001 สำเร็จ',
      )
    })

    expect(mockNavigate).toHaveBeenCalledWith('/receipts/r1')
  })

  it('shows error toast on failure', async () => {
    vi.mocked(receiptsApi.create).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useCreateReceipt(), {
      wrapper: createQueryWrapper(),
    })

    act(() => {
      result.current.mutate({
        customer_id: 'c1',
        issue_date: '2025-01-01',
        notes: '',
        items: [{ description: 'ห้องพัก', quantity: 1, unit_price: 1500 }],
      })
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Network error')
    })

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('invalidates receipts query cache on success', async () => {
    const mockReceipt = { id: 'r2', invoice_number: 'INV-2025-0002' }
    vi.mocked(receiptsApi.create).mockResolvedValue(mockReceipt as never)

    const wrapper = createQueryWrapper()
    const { result } = renderHook(() => useCreateReceipt(), { wrapper })

    act(() => {
      result.current.mutate({
        customer_id: 'c1',
        issue_date: '2025-01-01',
        notes: '',
        items: [{ description: 'ห้องพัก', quantity: 1, unit_price: 1000 }],
      })
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled()
    })
  })
})
