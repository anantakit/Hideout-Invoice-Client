import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { createQueryWrapper } from '@/test/helpers'
import { useUpdateUser } from './useUpdateUser'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../api', () => ({
  adminApi: {
    updateUser: vi.fn(),
  },
}))

import toast from 'react-hot-toast'
import { adminApi } from '../api'

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useUpdateUser', () => {
  const onSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns mutate function and isPending state', () => {
    const { result } = renderHook(() => useUpdateUser(onSuccess), {
      wrapper: createQueryWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.isPending).toBe(false)
  })

  it('calls adminApi.updateUser with id and payload, shows success toast, and calls onSuccess', async () => {
    const mockUser = { id: 'u1', full_name: 'Updated User' }
    vi.mocked(adminApi.updateUser).mockResolvedValue(mockUser as never)

    const { result } = renderHook(() => useUpdateUser(onSuccess), {
      wrapper: createQueryWrapper(),
    })

    act(() => {
      result.current.mutate({
        id: 'u1',
        payload: { full_name: 'Updated User', role: 'admin' },
      })
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('อัปเดตผู้ใช้สำเร็จ')
    })

    expect(adminApi.updateUser).toHaveBeenCalledWith('u1', {
      full_name: 'Updated User',
      role: 'admin',
    })
    expect(onSuccess).toHaveBeenCalled()
  })

  it('shows error toast on failure', async () => {
    vi.mocked(adminApi.updateUser).mockRejectedValue(
      new Error('ไม่พบผู้ใช้'),
    )

    const { result } = renderHook(() => useUpdateUser(onSuccess), {
      wrapper: createQueryWrapper(),
    })

    act(() => {
      result.current.mutate({
        id: 'u-bad',
        payload: { full_name: 'Fail' },
      })
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('ไม่พบผู้ใช้')
    })

    expect(onSuccess).not.toHaveBeenCalled()
  })
})
