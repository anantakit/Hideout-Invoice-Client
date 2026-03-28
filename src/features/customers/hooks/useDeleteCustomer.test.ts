import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { createQueryWrapper } from '@/test/helpers'

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../api', () => ({
  customersApi: { delete: vi.fn() },
}))

import toast from 'react-hot-toast'
import { customersApi } from '../api'
import { useDeleteCustomer } from './useDeleteCustomer'

describe('useDeleteCustomer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns mutate and isPending', () => {
    const { result } = renderHook(() => useDeleteCustomer(), {
      wrapper: createQueryWrapper(),
    })

    expect(result.current).toHaveProperty('mutate')
    expect(result.current).toHaveProperty('isPending')
  })

  it('calls customersApi.delete and shows success toast', async () => {
    vi.mocked(customersApi.delete).mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteCustomer(), {
      wrapper: createQueryWrapper(),
    })

    act(() => {
      result.current.mutate('1')
    })

    await waitFor(() => {
      expect(customersApi.delete).toHaveBeenCalledWith('1', expect.anything())
      expect(toast.success).toHaveBeenCalledWith('ลบลูกค้าสำเร็จ')
    })
  })

  it('shows error toast on failure', async () => {
    vi.mocked(customersApi.delete).mockRejectedValue(new Error('ลบไม่สำเร็จ'))

    const { result } = renderHook(() => useDeleteCustomer(), {
      wrapper: createQueryWrapper(),
    })

    act(() => {
      result.current.mutate('1')
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('ลบไม่สำเร็จ')
    })
  })
})
