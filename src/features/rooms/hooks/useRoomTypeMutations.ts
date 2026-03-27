import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { roomsApi } from '../api'

interface UseRoomTypeMutationsOptions {
  onSuccess?: () => void
}

export function useRoomTypeMutations({ onSuccess }: UseRoomTypeMutationsOptions = {}) {
  const queryClient = useQueryClient()

  const createRtMutation = useMutation({
    mutationFn: roomsApi.createRoomType,
    onSuccess: () => {
      toast.success('เพิ่มประเภทห้องสำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['admin-room-types'] })
      onSuccess?.()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateRtMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name: string; price_per_night: number } }) =>
      roomsApi.updateRoomType(id, payload),
    onSuccess: () => {
      toast.success('แก้ไขประเภทห้องสำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['admin-room-types'] })
      queryClient.invalidateQueries({ queryKey: ['admin-rooms'] })
      onSuccess?.()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteRtMutation = useMutation({
    mutationFn: roomsApi.deleteRoomType,
    onSuccess: () => {
      toast.success('ลบประเภทห้องสำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['admin-room-types'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return { createRtMutation, updateRtMutation, deleteRtMutation }
}
