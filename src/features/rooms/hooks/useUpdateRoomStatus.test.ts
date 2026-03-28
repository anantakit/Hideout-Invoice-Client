import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { createQueryWrapper } from '@/test/helpers'

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../api', () => ({
  roomsApi: {
    updateRoomStatus: vi.fn(),
  },
}))

import toast from 'react-hot-toast'
import { roomsApi } from '../api'
import { useUpdateRoomStatus } from './useUpdateRoomStatus'

describe('useUpdateRoomStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Structure ──────────────────────────────────────

  it('returns mutate and isPending', () => {
    const { result } = renderHook(() => useUpdateRoomStatus('room-1'), {
      wrapper: createQueryWrapper(),
    })

    expect(result.current.mutate).toBeTypeOf('function')
    expect(result.current.isPending).toBe(false)
  })

  // ── Success ────────────────────────────────────────

  it('calls roomsApi.updateRoomStatus with roomId and status, shows success toast', async () => {
    vi.mocked(roomsApi.updateRoomStatus).mockResolvedValue(undefined)

    const { result } = renderHook(() => useUpdateRoomStatus('room-1'), {
      wrapper: createQueryWrapper(),
    })

    await act(() => {
      result.current.mutate('CLEANING')
    })

    await waitFor(() => {
      expect(roomsApi.updateRoomStatus).toHaveBeenCalledWith('room-1', {
        status: 'CLEANING',
      })
      expect(toast.success).toHaveBeenCalledWith('เปลี่ยนสถานะสำเร็จ')
    })
  })

  // ── Error ──────────────────────────────────────────

  it('shows error toast on failure', async () => {
    vi.mocked(roomsApi.updateRoomStatus).mockRejectedValue(
      new Error('สถานะไม่ถูกต้อง'),
    )

    const { result } = renderHook(() => useUpdateRoomStatus('room-1'), {
      wrapper: createQueryWrapper(),
    })

    await act(() => {
      result.current.mutate('INVALID')
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('สถานะไม่ถูกต้อง')
    })
  })
})
