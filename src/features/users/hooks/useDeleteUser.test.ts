import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { createQueryWrapper } from '@/test/helpers'
import { useDeleteUser } from './useDeleteUser'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../api', () => ({
  adminApi: {
    deleteUser: vi.fn(),
  },
}))

import toast from 'react-hot-toast'
import { adminApi } from '../api'

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useDeleteUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns mutate function and isPending state', () => {
    const { result } = renderHook(() => useDeleteUser(), {
      wrapper: createQueryWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.isPending).toBe(false)
  })

  it('calls adminApi.deleteUser and shows success toast', async () => {
    vi.mocked(adminApi.deleteUser).mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteUser(), {
      wrapper: createQueryWrapper(),
    })

    act(() => {
      result.current.mutate('u1')
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('ลบผู้ใช้สำเร็จ')
    })

    expect(adminApi.deleteUser).toHaveBeenCalledWith('u1', expect.anything())
  })

  it('shows error toast on failure', async () => {
    vi.mocked(adminApi.deleteUser).mockRejectedValue(
      new Error('ไม่สามารถลบได้'),
    )

    const { result } = renderHook(() => useDeleteUser(), {
      wrapper: createQueryWrapper(),
    })

    act(() => {
      result.current.mutate('u-bad')
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('ไม่สามารถลบได้')
    })
  })
})
