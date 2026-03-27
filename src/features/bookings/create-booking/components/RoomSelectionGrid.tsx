import { Loader2, ChevronDown } from 'lucide-react'
import { cn } from '@/shared/utils'
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/shared/ui/form'
import type { Control } from 'react-hook-form'
import type { AvailabilityGroupedRoom } from '../../types'
import type { CreateBookingFormValues } from '../utils/createBookingSchema'

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

// ─── AvailabilityStatus ─────────────────────────────────────────────────────

interface AvailabilityStatusProps {
  availableCount: number
  unassignedCount: number
  quantity: number
}

export function AvailabilityStatus({
  availableCount,
  unassignedCount,
  quantity,
}: AvailabilityStatusProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {availableCount > 0 && (
        <span>
          ว่าง <span className="font-medium text-foreground">{availableCount}</span> ห้อง
        </span>
      )}
      {unassignedCount > 0 && (
        <span className="text-warning font-medium">
          จองล่วงหน้า {unassignedCount} ห้องยังไม่มอบหมาย
        </span>
      )}
      {quantity > availableCount && availableCount > 0 && (
        <span className="text-destructive font-medium">เกินจำนวนห้องว่าง</span>
      )}
    </div>
  )
}

// ─── CollapsibleRoomPicker ──────────────────────────────────────────────────

interface CollapsibleRoomPickerProps {
  isOpen: boolean
  onToggleOpen: () => void
  assignedCount: number
  quantity: number
  isLoading: boolean
  rooms: AvailabilityGroupedRoom[]
  selectedIds: string[]
  canSelectMore: boolean
  onToggle: (roomId: string) => void
  control: Control<CreateBookingFormValues>
  index: number
}

export function CollapsibleRoomPicker({
  isOpen,
  onToggleOpen,
  assignedCount,
  quantity,
  isLoading,
  rooms,
  selectedIds,
  canSelectMore,
  onToggle,
  control,
  index,
}: CollapsibleRoomPickerProps) {
  return (
    <div>
      <button
        type="button"
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer touch-target"
        onClick={onToggleOpen}
      >
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', isOpen && 'rotate-180')} />
        เลือกห้อง
        {assignedCount > 0 && (
          <span className="text-primary font-semibold">{assignedCount}/{quantity}</span>
        )}
        {assignedCount === 0 && (
          <span className="text-muted-foreground/70">(ไม่บังคับ)</span>
        )}
      </button>

      {isOpen && (
        <div className="mt-2">
          {isLoading ? (
            <div className="flex justify-center py-3">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none text-muted-foreground" />
            </div>
          ) : rooms.length === 0 ? (
            <p className="text-xs text-destructive">
              ไม่พบห้องว่างสำหรับประเภทนี้ในช่วงวันที่เลือก
            </p>
          ) : (
            <FormField
              control={control}
              name={`items.${index}.assigned_room_ids`}
              render={() => (
                <FormItem>
                  <FormControl>
                    <RoomSelectionGrid
                      rooms={rooms}
                      selectedIds={selectedIds}
                      canSelectMore={canSelectMore}
                      onToggle={onToggle}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          )}
        </div>
      )}
    </div>
  )
}
