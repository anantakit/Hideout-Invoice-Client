import { Plus, Check, Wand2 } from 'lucide-react'
import { cn } from '@/shared/utils'
import { Button } from '@/shared/ui/button'
import { useRoomTypes } from '../../hooks'
import { useRoomTypeBuilder } from '../hooks/useRoomTypeBuilder'
import { RoomTypeBookingItem } from './RoomTypeBookingItem'

// ─── RoomTypeBookingBuilder ────────────────────────────────────────────────────

/**
 * Dynamic list of room-type booking items, each representing a group booking:
 *   room_type_id + quantity + date range + optional physical room pre-assignment.
 *
 * Must be rendered inside a `<Form>` (react-hook-form FormProvider) whose
 * schema matches `CreateBookingFormValues`.
 */
export function RoomTypeBookingBuilder() {
  const { data: roomTypes = [] } = useRoomTypes()
  const {
    fields, remove, sameDates, firstCheckIn, firstCheckOut,
    hasUnassignedSlots, unifiedAvailData,
    handleUnifiedAutoAssign, toggleSameDates, addItem,
  } = useRoomTypeBuilder()

  return (
    <div className="space-y-4">
      {/* "Same dates" toggle — only shown when there is more than one item */}
      {fields.length > 1 && (
        <label className="flex items-center gap-3 cursor-pointer select-none px-1">
          <button
            type="button"
            role="checkbox"
            aria-checked={sameDates}
            onClick={toggleSameDates}
            className={cn(
              'w-5 h-5 shrink-0 rounded border flex items-center justify-center transition-colors motion-reduce:transition-none',
              sameDates
                ? 'bg-primary border-primary text-primary-foreground'
                : 'border-border bg-background hover:border-muted-foreground/50',
            )}
          >
            {sameDates && <Check className="w-3.5 h-3.5" />}
          </button>
          <span className="text-body">ใช้วันที่เดิมสำหรับทุกรายการ</span>
        </label>
      )}

      {fields.map((field, index) => (
        <RoomTypeBookingItem
          key={field.id}
          index={index}
          itemCount={fields.length}
          onRemove={fields.length > 1 ? () => remove(index) : undefined}
          roomTypes={roomTypes}
          hideDates={sameDates && index > 0}
          sharedCheckIn={firstCheckIn}
          sharedCheckOut={firstCheckOut}
        />
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addItem} className="w-full touch-target">
        <Plus className="w-4 h-4 mr-2" />
        เพิ่มประเภทห้อง
      </Button>

      {/* Unified auto-assign — separated from item cards */}
      {hasUnassignedSlots && unifiedAvailData && (
        <Button
          type="button" variant="outline" size="sm"
          onClick={handleUnifiedAutoAssign}
          className="w-full gap-1.5 touch-target"
        >
          <Wand2 className="w-3.5 h-3.5" />
          มอบหมายอัตโนมัติทั้งหมด
        </Button>
      )}
    </div>
  )
}
