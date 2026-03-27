import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { Plus, Minus, Trash2, Loader2, Wand2, Check, ChevronDown } from 'lucide-react'
import { cn, todayISO, addDaysISO, formatCompactNumber } from '@/shared/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ChargedPriceInput } from '../../shared/components/ChargedPriceInput'
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
import { useRoomTypes, useAvailabilityGrouped } from '../../hooks'
import { DateRangePicker } from '../../shared/components/DateRangePicker'
import { RoomSelectionGrid } from './RoomSelectionGrid'
import { proximityAutoAssignAll } from '../utils/roomAssignment'
import type { DateRange } from '../../shared/components/DateRangePicker'
import type { CreateBookingFormValues } from '../utils/createBookingSchema'
import type { RoomTypeResponse } from '../../types'

// ─── RoomTypeBookingBuilder ────────────────────────────────────────────────────

/**
 * Dynamic list of room-type booking items, each representing a group booking:
 *   room_type_id + quantity + date range + optional physical room pre-assignment.
 *
 * On submission the parent page calls `expandGroupedStays(items)` to flatten
 * these into individual `RoomStayPayload` objects for the API.
 *
 * Must be rendered inside a `<Form>` (react-hook-form FormProvider) whose
 * schema matches `CreateBookingFormValues`.
 */
export function RoomTypeBookingBuilder() {
  const form = useFormContext<CreateBookingFormValues>()
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const sameDates = useWatch({ control: form.control, name: 'same_dates' })
  const items     = useWatch({ control: form.control, name: 'items' })
  const firstCheckIn  = useWatch({ control: form.control, name: 'items.0.check_in' })
  const firstCheckOut = useWatch({ control: form.control, name: 'items.0.check_out' })

  const { data: roomTypes = [] } = useRoomTypes()

  // Fetch availability for unified auto-assign (use first item's dates when sameDates)
  const unifiedDatesValid = Boolean(firstCheckIn && firstCheckOut && firstCheckOut > firstCheckIn)
  const { data: unifiedAvailData } = useAvailabilityGrouped(
    firstCheckIn,
    firstCheckOut,
    unifiedDatesValid && items.some((it) => it.room_type_id),
  )

  // Check if any items have unassigned slots
  const hasUnassignedSlots = items.some((item) => {
    const assigned = item.assigned_room_ids?.length ?? 0
    return item.room_type_id && assigned < item.quantity
  })

  const handleUnifiedAutoAssign = useCallback(() => {
    if (!unifiedAvailData) return
    const currentItems = form.getValues('items')
    const assignments = proximityAutoAssignAll(currentItems, unifiedAvailData)
    for (const [idx, roomIds] of Object.entries(assignments)) {
      form.setValue(`items.${Number(idx)}.assigned_room_ids`, roomIds, { shouldValidate: true })
    }
  }, [form, unifiedAvailData])

  // When sameDates is on, keep items 1+ in sync with item 0's dates.
  useEffect(() => {
    if (!sameDates) return
    fields.forEach((_, i) => {
      if (i === 0) return
      form.setValue(`items.${i}.check_in`,  firstCheckIn,  { shouldValidate: false })
      form.setValue(`items.${i}.check_out`, firstCheckOut, { shouldValidate: false })
      form.setValue(`items.${i}.assigned_room_ids`, [])
    })
  }, [sameDates, firstCheckIn, firstCheckOut, fields.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function addItem() {
    const ci = sameDates && firstCheckIn  ? firstCheckIn  : todayISO()
    const co = sameDates && firstCheckOut ? firstCheckOut : addDaysISO(1)
    append({ room_type_id: '', quantity: 1, check_in: ci, check_out: co, assigned_room_ids: [] })
  }

  return (
    <div className="space-y-4">
      {/* "Same dates" toggle — only shown when there is more than one item */}
      {fields.length > 1 && (
        <label className="flex items-center gap-3 cursor-pointer select-none px-1">
          <button
            type="button"
            role="checkbox"
            aria-checked={sameDates}
            onClick={() => {
              const next = !sameDates
              form.setValue('same_dates', next)
              if (next && firstCheckIn && firstCheckOut) {
                fields.forEach((_, i) => {
                  if (i > 0) {
                    form.setValue(`items.${i}.check_in`,  firstCheckIn,  { shouldValidate: false })
                    form.setValue(`items.${i}.check_out`, firstCheckOut, { shouldValidate: false })
                    form.setValue(`items.${i}.assigned_room_ids`, [])
                  }
                })
                toast.success('ซิงค์วันที่ทุกรายการแล้ว')
              }
            }}
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

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        className="w-full touch-target"
      >
        <Plus className="w-4 h-4 mr-2" />
        เพิ่มประเภทห้อง
      </Button>

      {/* Unified auto-assign — separated from item cards */}
      {hasUnassignedSlots && unifiedAvailData && items.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
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

// ─── RoomTypeBookingItem (flat — no nested Card) ──────────────────────────────

function RoomTypeBookingItem({
  index,
  itemCount,
  onRemove,
  roomTypes,
  hideDates,
  sharedCheckIn,
  sharedCheckOut,
}: {
  index: number
  /** Total number of items — hides title when 1. */
  itemCount: number
  onRemove?: () => void
  roomTypes: RoomTypeResponse[]
  hideDates: boolean
  sharedCheckIn: string
  sharedCheckOut: string
}) {
  const form = useFormContext<CreateBookingFormValues>()

  const roomTypeId      = useWatch({ control: form.control, name: `items.${index}.room_type_id` })
  const quantity        = useWatch({ control: form.control, name: `items.${index}.quantity` })
  const ownCheckIn      = useWatch({ control: form.control, name: `items.${index}.check_in` })
  const ownCheckOut     = useWatch({ control: form.control, name: `items.${index}.check_out` })
  const assignedRoomIds = useWatch({ control: form.control, name: `items.${index}.assigned_room_ids` }) ?? []
  const chargedPrice    = useWatch({ control: form.control, name: `items.${index}.charged_price` })

  const effectiveCheckIn  = hideDates ? sharedCheckIn  : ownCheckIn
  const effectiveCheckOut = hideDates ? sharedCheckOut : ownCheckOut

  const datesValid   = Boolean(effectiveCheckIn && effectiveCheckOut && effectiveCheckOut > effectiveCheckIn)
  const showRoomPicker = Boolean(roomTypeId && datesValid)

  const { data: availData, isFetching: availLoading } = useAvailabilityGrouped(
    effectiveCheckIn,
    effectiveCheckOut,
    showRoomPicker,
  )

  const matchedType = availData?.room_types.find((rt) => rt.room_type_id === roomTypeId)
  const roomsForType = matchedType?.rooms ?? []
  const unassignedCount = matchedType?.unassigned_count ?? 0

  const physicalAvail  = roomsForType.filter((r) => r.available).length
  const availableCount = Math.max(0, physicalAvail - unassignedCount)
  const maxQuantity    = availableCount > 0 ? availableCount : Infinity

  const assignedCount = assignedRoomIds.length
  const canSelectMore = assignedCount < quantity

  function toggleRoom(roomId: string) {
    const current = form.getValues(`items.${index}.assigned_room_ids`) ?? []
    if (current.includes(roomId)) {
      form.setValue(
        `items.${index}.assigned_room_ids`,
        current.filter((id) => id !== roomId),
        { shouldValidate: true },
      )
    } else if (current.length < quantity) {
      form.setValue(
        `items.${index}.assigned_room_ids`,
        [...current, roomId],
        { shouldValidate: true },
      )
    }
  }

  function trimAssignedIfNeeded(newQty: number) {
    const current = form.getValues(`items.${index}.assigned_room_ids`) ?? []
    if (current.length > newQty) {
      form.setValue(`items.${index}.assigned_room_ids`, current.slice(0, newQty))
    }
  }

  const [roomPickerOpen, setRoomPickerOpen] = useState(false)

  // Auto-open room picker when rooms are already assigned
  useEffect(() => {
    if (assignedRoomIds.length > 0) setRoomPickerOpen(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedRoomType = roomTypes.find((rt) => rt.id === roomTypeId)

  return (
    <div className={cn(
      'rounded-lg border border-border bg-card/50 p-4 space-y-3',
      itemCount > 1 && 'relative',
    )}>
      {/* ── Header: title + delete ────────────────────────────── */}
      {itemCount > 1 && (
        <div className="flex items-center justify-between -mt-1 -mb-1">
          <p className="text-caption font-semibold text-muted-foreground">
            รายการที่ {index + 1}
          </p>
          {onRemove && (
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
      )}

      {/* ── Row 1: Room type + quantity ────────────────────────── */}
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
                      {rt.price_per_night != null
                        ? ` (฿${formatCompactNumber(rt.price_per_night)}/คืน)`
                        : ''}
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

      {/* Hint when no room type selected */}
      {!roomTypeId && (
        <p className="text-xs text-muted-foreground">เลือกประเภทห้องก่อนเพื่อดูห้องว่างและตั้งจำนวน</p>
      )}

      {/* ── Row 2: Date range (hidden when same_dates for items 1+) ── */}
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

      {/* ── Row 3: Availability + room count + charged price ──── */}
      {showRoomPicker && (
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
      )}

      {/* Charged price */}
      {roomTypeId && selectedRoomType && (
        <ChargedPriceInput
          rackPrice={selectedRoomType.price_per_night ?? 0}
          chargedPrice={chargedPrice}
          onChange={(v) => form.setValue(`items.${index}.charged_price`, v)}
        />
      )}

      {/* ── Collapsible room picker ───────────────────────────── */}
      {showRoomPicker && (
        <div>
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer touch-target"
            onClick={() => setRoomPickerOpen(!roomPickerOpen)}
          >
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', roomPickerOpen && 'rotate-180')} />
            เลือกห้อง
            {assignedCount > 0 && (
              <span className="text-primary font-semibold">{assignedCount}/{quantity}</span>
            )}
            {assignedCount === 0 && (
              <span className="text-muted-foreground/70">(ไม่บังคับ)</span>
            )}
          </button>

          {roomPickerOpen && (
            <div className="mt-2">
              {availLoading ? (
                <div className="flex justify-center py-3">
                  <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none text-muted-foreground" />
                </div>
              ) : roomsForType.length === 0 ? (
                <p className="text-xs text-destructive">
                  ไม่พบห้องว่างสำหรับประเภทนี้ในช่วงวันที่เลือก
                </p>
              ) : (
                <FormField
                  control={form.control}
                  name={`items.${index}.assigned_room_ids`}
                  render={() => (
                    <FormItem>
                      <FormControl>
                        <RoomSelectionGrid
                          rooms={roomsForType}
                          selectedIds={assignedRoomIds}
                          canSelectMore={canSelectMore}
                          onToggle={toggleRoom}
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
      )}
    </div>
  )
}
