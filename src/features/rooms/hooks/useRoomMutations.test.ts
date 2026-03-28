import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { createQueryWrapper } from '@/test/helpers'

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../api', () => ({
  roomsApi: {
    createRoom: vi.fn(),
    updateRoom: vi.fn(),
    deleteRoom: vi.fn(),
  },
}))

import toast from 'react-hot-toast'
import { roomsApi } from '../api'
import { useRoomMutations } from './useRoomMutations'

const mockRoom = {
  id: 'room-1',
  number: '101',
  room_type_id: 'rt-1',
  room_type: { id: 'rt-1', name: 'Standard', price_per_night: 1000, created_at: '2026-01-01T00:00:00Z' },
  status: 'AVAILABLE',
  coord_x: 0,
  coord_y: 0,
  created_at: '2026-01-01T00:00:00Z',
}

describe('useRoomMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Structure ──────────────────────────────────────

  it('returns all three mutation objects', () => {
    const { result } = renderHook(() => useRoomMutations(), {
      wrapper: createQueryWrapper(),
    })

    expect(result.current.createRoomMutation).toBeDefined()
    expect(result.current.updateRoomMutation).toBeDefined()
    expect(result.current.deleteRoomMutation).toBeDefined()
  })

  // ── createRoomMutation ─────────────────────────────

  describe('createRoomMutation', () => {
    it('calls roomsApi.createRoom and shows success toast', async () => {
      vi.mocked(roomsApi.createRoom).mockResolvedValue(mockRoom)
      const onSuccess = vi.fn()

      const { result } = renderHook(() => useRoomMutations({ onSuccess }), {
        wrapper: createQueryWrapper(),
      })

      await act(() =>
        result.current.createRoomMutation.mutateAsync({
          number: '101',
          room_type_id: 'rt-1',
        }),
      )

      expect(roomsApi.createRoom).toHaveBeenCalledWith(
        { number: '101', room_type_id: 'rt-1' },
        expect.anything(),
      )
      expect(toast.success).toHaveBeenCalledWith('เพิ่มห้องสำเร็จ')
      expect(onSuccess).toHaveBeenCalled()
    })

    it('shows error toast on failure', async () => {
      vi.mocked(roomsApi.createRoom).mockRejectedValue(new Error('ห้องซ้ำ'))

      const { result } = renderHook(() => useRoomMutations(), {
        wrapper: createQueryWrapper(),
      })

      await act(async () => {
        await result.current.createRoomMutation.mutateAsync({
          number: '101',
          room_type_id: 'rt-1',
        }).catch(() => {})
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('ห้องซ้ำ')
      })
    })
  })

  // ── updateRoomMutation ─────────────────────────────

  describe('updateRoomMutation', () => {
    it('calls roomsApi.updateRoom with id and payload, shows success toast', async () => {
      vi.mocked(roomsApi.updateRoom).mockResolvedValue(mockRoom)
      const onSuccess = vi.fn()

      const { result } = renderHook(() => useRoomMutations({ onSuccess }), {
        wrapper: createQueryWrapper(),
      })

      await act(() =>
        result.current.updateRoomMutation.mutateAsync({
          id: 'room-1',
          payload: { number: '102', room_type_id: 'rt-2' },
        }),
      )

      expect(roomsApi.updateRoom).toHaveBeenCalledWith('room-1', {
        number: '102',
        room_type_id: 'rt-2',
      })
      expect(toast.success).toHaveBeenCalledWith('แก้ไขห้องสำเร็จ')
      expect(onSuccess).toHaveBeenCalled()
    })

    it('shows error toast on failure', async () => {
      vi.mocked(roomsApi.updateRoom).mockRejectedValue(new Error('ไม่พบห้อง'))

      const { result } = renderHook(() => useRoomMutations(), {
        wrapper: createQueryWrapper(),
      })

      await act(async () => {
        await result.current.updateRoomMutation.mutateAsync({
          id: 'room-1',
          payload: { number: '102', room_type_id: 'rt-2' },
        }).catch(() => {})
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('ไม่พบห้อง')
      })
    })
  })

  // ── deleteRoomMutation ─────────────────────────────

  describe('deleteRoomMutation', () => {
    it('calls roomsApi.deleteRoom and shows success toast', async () => {
      vi.mocked(roomsApi.deleteRoom).mockResolvedValue(undefined)

      const { result } = renderHook(() => useRoomMutations(), {
        wrapper: createQueryWrapper(),
      })

      await act(() =>
        result.current.deleteRoomMutation.mutateAsync('room-1'),
      )

      expect(roomsApi.deleteRoom).toHaveBeenCalledWith('room-1', expect.anything())
      expect(toast.success).toHaveBeenCalledWith('ลบห้องสำเร็จ')
    })

    it('does not call onSuccess callback', async () => {
      vi.mocked(roomsApi.deleteRoom).mockResolvedValue(undefined)
      const onSuccess = vi.fn()

      const { result } = renderHook(() => useRoomMutations({ onSuccess }), {
        wrapper: createQueryWrapper(),
      })

      await act(() =>
        result.current.deleteRoomMutation.mutateAsync('room-1'),
      )

      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('shows error toast on failure', async () => {
      vi.mocked(roomsApi.deleteRoom).mockRejectedValue(new Error('ลบไม่ได้'))

      const { result } = renderHook(() => useRoomMutations(), {
        wrapper: createQueryWrapper(),
      })

      await act(async () => {
        await result.current.deleteRoomMutation.mutateAsync('room-1').catch(() => {})
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('ลบไม่ได้')
      })
    })
  })
})
