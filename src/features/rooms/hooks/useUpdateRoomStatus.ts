import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { roomsApi } from '../api'

export function useUpdateRoomStatus(roomId: string) {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: (status: string) =>
      roomsApi.updateRoomStatus(roomId, { status: status as 'AVAILABLE' | 'CLEANING' | 'MAINTENANCE' }),
    onSuccess: () => {
      toast.success('เปลี่ยนสถานะสำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['admin-rooms'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return { mutate, isPending }
}
