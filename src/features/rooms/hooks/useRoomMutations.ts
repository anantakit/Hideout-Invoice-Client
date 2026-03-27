import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { roomsApi } from '../api'

interface UseRoomMutationsOptions {
  onSuccess?: () => void
}

export function useRoomMutations({ onSuccess }: UseRoomMutationsOptions = {}) {
  const queryClient = useQueryClient()

  const createRoomMutation = useMutation({
    mutationFn: roomsApi.createRoom,
    onSuccess: () => {
      toast.success('เพิ่มห้องสำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['admin-rooms'] })
      onSuccess?.()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateRoomMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { number: string; room_type_id: string } }) =>
      roomsApi.updateRoom(id, payload),
    onSuccess: () => {
      toast.success('แก้ไขห้องสำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['admin-rooms'] })
      onSuccess?.()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteRoomMutation = useMutation({
    mutationFn: roomsApi.deleteRoom,
    onSuccess: () => {
      toast.success('ลบห้องสำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['admin-rooms'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return { createRoomMutation, updateRoomMutation, deleteRoomMutation }
}
