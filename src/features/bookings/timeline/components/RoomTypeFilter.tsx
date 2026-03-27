import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import type { RoomAvailability } from './AvailabilitySummary'

// ─── Props ──────────────────────────────────────────────────────────────────

interface RoomTypeFilterProps {
  selectedRoomTypeId: string | null
  onRoomTypeSelect: (id: string | null) => void
  roomAvailability: RoomAvailability[]
}

// ─── Component ──────────────────────────────────────────────────────────────

const RoomTypeFilter = React.memo(function RoomTypeFilter({
  selectedRoomTypeId,
  onRoomTypeSelect,
  roomAvailability,
}: RoomTypeFilterProps) {
  return (
    <Select
      value={selectedRoomTypeId ?? '__all__'}
      onValueChange={(v) => onRoomTypeSelect(v === '__all__' ? null : v)}
    >
      <SelectTrigger className="h-8 w-auto min-w-[7rem] text-sm rounded-lg bg-accent/40 border-0 shadow-none px-3 py-1 text-tl-text-dim hover:text-tl-text focus:ring-0 focus:ring-offset-0">
        <SelectValue placeholder="ทุกประเภท" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">ทุกประเภท</SelectItem>
        {roomAvailability.map((rt) => (
          <SelectItem key={rt.room_type_id} value={rt.room_type_id}>
            {rt.room_type_name} ({rt.available_rooms})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
})

export default RoomTypeFilter
