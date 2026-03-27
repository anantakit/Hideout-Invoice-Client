import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { roomsApi } from '../api'
import type { Room } from '../types'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/ui/select'

const STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'พร้อม' },
  { value: 'CLEANING', label: 'ทำความสะอาด' },
  { value: 'MAINTENANCE', label: 'ปรับปรุง' },
]

export function RoomStatusSelect({ room }: { room: Room }) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (status: string) =>
      roomsApi.updateRoomStatus(room.id, { status: status as 'AVAILABLE' | 'CLEANING' | 'MAINTENANCE' }),
    onSuccess: () => {
      toast.success('เปลี่ยนสถานะสำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['admin-rooms'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const currentStatus = room.status === 'ACTIVE' ? 'AVAILABLE' : room.status

  return (
    <Select
      value={currentStatus}
      onValueChange={(v) => mutation.mutate(v)}
      disabled={mutation.isPending}
    >
      <SelectTrigger className="h-10 w-[110px] md:h-8 md:w-[130px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent side="bottom" align="start" sideOffset={4}>
        {STATUS_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value} className="py-3 md:py-2">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
