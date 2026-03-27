import { cn } from '@/shared/utils'
import type { AvailabilityGroupedRoom } from '../../types'

// ─── RoomSelectionGrid ──────────────────────────────────────────────────────

interface RoomSelectionGridProps {
  rooms: AvailabilityGroupedRoom[]
  selectedIds: string[]
  canSelectMore: boolean
  onToggle: (roomId: string) => void
}

export function RoomSelectionGrid({
  rooms,
  selectedIds,
  canSelectMore,
  onToggle,
}: RoomSelectionGridProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {rooms.map((room) => {
        const isSelected = selectedIds.includes(room.room_id)
        const isDisabled = !room.available && !isSelected
        const isFull = !canSelectMore && !isSelected

        return (
          <button
            key={room.room_id}
            type="button"
            disabled={isDisabled || isFull}
            onClick={() => onToggle(room.room_id)}
            className={cn(
              'h-10 radius-button border text-xs font-semibold transition-colors',
              isSelected
                ? 'border-primary bg-primary text-primary-foreground cursor-pointer'
                : isDisabled || isFull
                ? 'border-border/50 bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5 cursor-pointer',
            )}
          >
            {room.room_number}
          </button>
        )
      })}
    </div>
  )
}
