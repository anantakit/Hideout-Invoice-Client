import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { createQueryWrapper } from '@/test/helpers'

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../api', () => ({
  customersApi: { create: vi.fn() },
}))

import toast from 'react-hot-toast'
import { customersApi } from '../api'
import { useCreateCustomer } from './useCreateCustomer'

const fakeCustomer = {
  id: '1',
  name: 'สมชาย',
  tax_id: '1234567890123',
  address: '123 ถนนสุขุมวิท',
  phone: '0812345678',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const payload = {
  name: 'สมชาย',
  tax_id: '1234567890123',
  address: '123 ถนนสุขุมวิท',
  phone: '0812345678',
}

describe('useCreateCustomer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns mutate and isPending', () => {
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useCreateCustomer(onSuccess), {
      wrapper: createQueryWrapper(),
    })

    expect(result.current).toHaveProperty('mutate')
    expect(result.current).toHaveProperty('isPending')
  })

  it('calls customersApi.create, shows success toast, and calls onSuccess', async () => {
    vi.mocked(customersApi.create).mockResolvedValue(fakeCustomer)
    const onSuccess = vi.fn()

    const { result } = renderHook(() => useCreateCustomer(onSuccess), {
      wrapper: createQueryWrapper(),
    })

    act(() => {
      result.current.mutate(payload)
    })

    await waitFor(() => {
      expect(customersApi.create).toHaveBeenCalledWith(payload)
      expect(toast.success).toHaveBeenCalledWith('เพิ่มลูกค้า "สมชาย" สำเร็จ')
      expect(onSuccess).toHaveBeenCalledWith(fakeCustomer)
    })
  })

  it('shows error toast on failure', async () => {
    vi.mocked(customersApi.create).mockRejectedValue(new Error('สร้างไม่สำเร็จ'))
    const onSuccess = vi.fn()

    const { result } = renderHook(() => useCreateCustomer(onSuccess), {
      wrapper: createQueryWrapper(),
    })

    act(() => {
      result.current.mutate(payload)
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('สร้างไม่สำเร็จ')
      expect(onSuccess).not.toHaveBeenCalled()
    })
  })
})
