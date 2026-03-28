import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { createQueryWrapper } from '@/test/helpers'
import { useCreateUser } from './useCreateUser'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../api', () => ({
  adminApi: {
    createUser: vi.fn(),
  },
}))

import toast from 'react-hot-toast'
import { adminApi } from '../api'

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useCreateUser', () => {
  const onSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns mutate function and isPending state', () => {
    const { result } = renderHook(() => useCreateUser(onSuccess), {
      wrapper: createQueryWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.isPending).toBe(false)
  })

  it('calls adminApi.createUser, shows success toast, and calls onSuccess', async () => {
    const mockUser = { id: 'u1', full_name: 'Test User' }
    vi.mocked(adminApi.createUser).mockResolvedValue(mockUser as never)

    const { result } = renderHook(() => useCreateUser(onSuccess), {
      wrapper: createQueryWrapper(),
    })

    act(() => {
      result.current.mutate({
        full_name: 'Test User',
        username: 'testuser',
        password: 'password123',
        role: 'staff',
        must_change_password: true,
      })
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('สร้างผู้ใช้สำเร็จ')
    })

    expect(adminApi.createUser).toHaveBeenCalledWith({
      full_name: 'Test User',
      username: 'testuser',
      password: 'password123',
      role: 'staff',
      must_change_password: true,
    })
    expect(onSuccess).toHaveBeenCalled()
  })

  it('shows error toast on failure', async () => {
    vi.mocked(adminApi.createUser).mockRejectedValue(
      new Error('ชื่อผู้ใช้ซ้ำ'),
    )

    const { result } = renderHook(() => useCreateUser(onSuccess), {
      wrapper: createQueryWrapper(),
    })

    act(() => {
      result.current.mutate({
        full_name: 'Test User',
        username: 'duplicate',
        password: 'password123',
        role: 'staff',
        must_change_password: false,
      })
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('ชื่อผู้ใช้ซ้ำ')
    })

    expect(onSuccess).not.toHaveBeenCalled()
  })
})
