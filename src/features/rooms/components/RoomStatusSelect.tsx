import type { Room } from '../types'
import { useUpdateRoomStatus } from '../hooks/useUpdateRoomStatus'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/ui/select'

const STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'พร้อม' },
  { value: 'CLEANING', label: 'ทำความสะอาด' },
  { value: 'MAINTENANCE', label: 'ปรับปรุง' },
]

export function RoomStatusSelect({ room }: { room: Room }) {
  const { mutate, isPending } = useUpdateRoomStatus(room.id)

  const currentStatus = room.status === 'ACTIVE' ? 'AVAILABLE' : room.status

  return (
    <Select
      value={currentStatus}
      onValueChange={(v) => mutate(v)}
      disabled={isPending}
    >
      <SelectTrigger className="h-10 w-27.5 md:h-8 md:w-32.5 text-xs">
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
