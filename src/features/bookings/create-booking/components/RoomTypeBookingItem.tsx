import { Plus, Minus, Trash2 } from 'lucide-react'
import { cn, formatCompactNumber } from '@/shared/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { DateRangePicker } from '../../shared/components/DateRangePicker'
import { ChargedPriceInput } from '../../shared/components/ChargedPriceInput'
import { AvailabilityStatus, CollapsibleRoomPicker } from './RoomSelectionGrid'
import { useRoomTypeBookingItem } from '../hooks/useRoomTypeBuilder'
import type { DateRange } from '../../shared/components/DateRangePicker'
import type { RoomTypeResponse } from '../../types'

// ─── RoomTypeBookingItem ───────────────────────────────────────────────────────

export function RoomTypeBookingItem({
  index, itemCount, onRemove, roomTypes, hideDates, sharedCheckIn, sharedCheckOut,
}: {
  index: number
  itemCount: number
  onRemove?: () => void
  roomTypes: RoomTypeResponse[]
  hideDates: boolean
  sharedCheckIn: string
  sharedCheckOut: string
}) {
  const {
    form, roomTypeId, quantity, ownCheckIn, ownCheckOut, assignedRoomIds, chargedPrice,
    showRoomPicker, availLoading, roomsForType, availableCount, unassignedCount, maxQuantity,
    assignedCount, canSelectMore, roomPickerOpen, setRoomPickerOpen, selectedRoomType,
    toggleRoom, trimAssignedIfNeeded,
  } = useRoomTypeBookingItem(index, hideDates, sharedCheckIn, sharedCheckOut, roomTypes)

  return (
    <div className={cn('rounded-lg border border-border bg-card/50 p-4 space-y-3', itemCount > 1 && 'relative')}>
      {/* ── Header ── */}
      {itemCount > 1 && (
        <div className="flex items-center justify-between -mt-1 -mb-1">
          <p className="text-caption font-semibold text-muted-foreground">รายการที่ {index + 1}</p>
          {onRemove && (
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
      )}

      {/* ── Room type + quantity ── */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 sm:items-end">
        <FormField
          control={form.control}
          name={`items.${index}.room_type_id`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>ประเภทห้อง</FormLabel>
              <Select
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v)
                  form.setValue(`items.${index}.quantity`, 1)
                  form.setValue(`items.${index}.assigned_room_ids`, [])
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกประเภทห้อง" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent sheetTitle="เลือกประเภทห้อง">
                  {roomTypes.map((rt) => (
                    <SelectItem key={rt.id} value={rt.id}>
                      {rt.name}
                      {rt.price_per_night != null ? ` (฿${formatCompactNumber(rt.price_per_night)}/คืน)` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`items.${index}.quantity`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sm:hidden">จำนวนห้อง</FormLabel>
              <FormLabel className="hidden sm:block">จำนวน</FormLabel>
              <FormControl>
                <div className="flex items-center gap-2">
                  <Button
                    type="button" variant="outline" size="icon"
                    className="h-10 w-10 shrink-0 sm:h-9 sm:w-9"
                    disabled={!roomTypeId || field.value <= 1}
                    onClick={() => { const n = Math.max(1, field.value - 1); field.onChange(n); trimAssignedIfNeeded(n) }}
                  >
                    <Minus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </Button>
                  <Input
                    type="number" min={1}
                    max={maxQuantity === Infinity ? undefined : maxQuantity}
                    className="h-10 w-16 sm:w-16 sm:h-9 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    value={field.value} disabled={!roomTypeId}
                    onChange={(e) => { const v = Math.min(maxQuantity, Math.max(1, parseInt(e.target.value) || 1)); field.onChange(v); trimAssignedIfNeeded(v) }}
                  />
                  <Button
                    type="button" variant="outline" size="icon"
                    className="h-10 w-10 shrink-0 sm:h-9 sm:w-9"
                    disabled={!roomTypeId || field.value >= maxQuantity}
                    onClick={() => field.onChange(Math.min(maxQuantity, field.value + 1))}
                  >
                    <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </Button>
                </div>
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>

      {!roomTypeId && (
        <p className="text-xs text-muted-foreground">เลือกประเภทห้องก่อนเพื่อดูห้องว่างและตั้งจำนวน</p>
      )}

      {/* ── Date range ── */}
      {!hideDates && (
        <div>
          <FormLabel className="mb-1.5 block">วันเช็คอิน → เช็คเอาท์</FormLabel>
          <DateRangePicker
            value={{ checkIn: ownCheckIn, checkOut: ownCheckOut }}
            onChange={(range: DateRange) => {
              form.setValue(`items.${index}.check_in`, range.checkIn, { shouldValidate: true })
              form.setValue(`items.${index}.check_out`, range.checkOut, { shouldValidate: true })
              form.setValue(`items.${index}.assigned_room_ids`, [])
            }}
          />
        </div>
      )}

      {/* ── Availability status ── */}
      {showRoomPicker && (
        <AvailabilityStatus availableCount={availableCount} unassignedCount={unassignedCount} quantity={quantity} />
      )}

      {/* ── Charged price ── */}
      {roomTypeId && selectedRoomType && (
        <ChargedPriceInput
          rackPrice={selectedRoomType.price_per_night ?? 0}
          chargedPrice={chargedPrice}
          onChange={(v) => form.setValue(`items.${index}.charged_price`, v)}
        />
      )}

      {/* ── Room picker ── */}
      {showRoomPicker && (
        <CollapsibleRoomPicker
          isOpen={roomPickerOpen}
          onToggleOpen={() => setRoomPickerOpen(!roomPickerOpen)}
          assignedCount={assignedCount} quantity={quantity}
          isLoading={availLoading} rooms={roomsForType}
          selectedIds={assignedRoomIds} canSelectMore={canSelectMore}
          onToggle={toggleRoom} control={form.control} index={index}
        />
      )}
    </div>
  )
}
