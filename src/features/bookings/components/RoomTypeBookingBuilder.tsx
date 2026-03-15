import { useEffect, useCallback } from 'react'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { Plus, Minus, Trash2, Loader2, Wand2 } from 'lucide-react'
import { cn, todayISO, addDaysISO } from '@/shared/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
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
import { useRoomTypes, useAvailabilityGrouped } from '../hooks'
import { DateRangePicker } from './DateRangePicker'
import type { DateRange } from './DateRangePicker'
import type { CreateBookingFormValues } from '../createBookingSchema'
import type { RoomTypeResponse, AvailabilityGroupedRoom, AvailabilityGroupedResponse } from '../types'

// ─── Proximity Auto-Assign ──────────────────────────────────────────────────

/**
 * Cross-type proximity auto-assign.  Mirrors the backend AutoAssignRooms scoring:
 *   - Manhattan distance to anchors (already-assigned rooms) → closer = higher score
 *   - Same-side bonus: same y-coordinate as anchors → +20 per matching anchor
 *   - Room number tiebreak
 *
 * Processes items with larger quantities first so bigger groups get the best clusters.
 */
function proximityAutoAssignAll(
  items: CreateBookingFormValues['items'],
  availData: AvailabilityGroupedResponse,
): Record<number, string[]> {
  // Build a coord lookup: room_id → {x, y}
  const coordMap = new Map<string, { x: number; y: number }>()
  const roomById = new Map<string, AvailabilityGroupedRoom>()
  for (const rt of availData.room_types) {
    for (const r of rt.rooms) {
      coordMap.set(r.room_id, { x: r.coord_x, y: r.coord_y })
      roomById.set(r.room_id, r)
    }
  }

  const manhattan = (a: string, b: string) => {
    const ca = coordMap.get(a)
    const cb = coordMap.get(b)
    if (!ca || !cb) return 9999
    return Math.abs(ca.x - cb.x) + Math.abs(ca.y - cb.y)
  }

  // Collect globally assigned room IDs (to avoid double-assigning across items)
  const globalAssigned = new Set<string>()

  // Process order: smaller quantity first — items with fewer rooms become
  // anchors so that larger groups cluster around them.  This prevents the
  // scenario where a 2-room single group "steals" good positions and leaves
  // a 1-room double isolated far away.
  const order = items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => a.item.quantity - b.item.quantity)

  // Growing anchor set: as rooms are assigned across ALL items, they become anchors
  const anchors: string[] = []

  const result: Record<number, string[]> = {}

  for (const { item, i } of order) {
    const typeRooms = availData.room_types
      .find((rt) => rt.room_type_id === item.room_type_id)?.rooms ?? []

    const currentAssigned = item.assigned_room_ids ?? []
    // Keep existing assignments as anchors
    for (const id of currentAssigned) {
      if (!globalAssigned.has(id)) {
        globalAssigned.add(id)
        anchors.push(id)
      }
    }

    const needed = item.quantity - currentAssigned.length
    if (needed <= 0) {
      result[i] = currentAssigned
      continue
    }

    // Candidate rooms: available, not already assigned globally or in this item
    const candidates = typeRooms.filter(
      (r) => r.available && !globalAssigned.has(r.room_id) && !currentAssigned.includes(r.room_id),
    )

    // Score and pick one at a time (growing anchor set)
    const newlyAssigned = [...currentAssigned]
    for (let n = 0; n < needed; n++) {
      const remaining = candidates.filter((r) => !globalAssigned.has(r.room_id))
      if (remaining.length === 0) break

      let bestRoom: AvailabilityGroupedRoom | null = null
      let bestScore = -Infinity

      for (const room of remaining) {
        let score = 0

        if (anchors.length > 0) {
          let minDist = 9999
          let sameSideCount = 0
          const roomCoord = coordMap.get(room.room_id)

          for (const anchorId of anchors) {
            const d = manhattan(room.room_id, anchorId)
            if (d < minDist) minDist = d
            const anchorCoord = coordMap.get(anchorId)
            if (roomCoord && anchorCoord && anchorCoord.y === roomCoord.y) {
              sameSideCount++
            }
          }

          // Proximity score: distance 0 → +30, distance 1 → +15, distance 2 → +10
          score += 30.0 / (1 + minDist)
          // Same-side bonus: +20 per matching anchor
          score += (20.0 * sameSideCount) / anchors.length
        } else {
          // No anchor yet: score by average min-distance to available rooms
          // of OTHER room types so the first pick is central to all types.
          const otherTypeRooms = availData.room_types
            .filter((rt) => rt.room_type_id !== item.room_type_id)
            .flatMap((rt) => rt.rooms.filter((r) => r.available && !globalAssigned.has(r.room_id)))
          if (otherTypeRooms.length > 0) {
            let totalDist = 0
            for (const other of otherTypeRooms) {
              totalDist += manhattan(room.room_id, other.room_id)
            }
            const avgDist = totalDist / otherTypeRooms.length
            // Lower avg distance → higher score
            score += 30.0 / (1 + avgDist)
          }
        }

        // Room number tiebreak: prefer lower numbers
        const num = parseInt(room.room_number, 10)
        if (num > 0) score += 0.01 / num

        if (score > bestScore) {
          bestScore = score
          bestRoom = room
        }
      }

      if (bestRoom) {
        newlyAssigned.push(bestRoom.room_id)
        globalAssigned.add(bestRoom.room_id)
        anchors.push(bestRoom.room_id)
      }
    }

    result[i] = newlyAssigned
  }

  return result
}

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
          <input
            type="checkbox"
            checked={sameDates}
            onChange={(e) => {
              form.setValue('same_dates', e.target.checked)
              if (e.target.checked && firstCheckIn && firstCheckOut) {
                fields.forEach((_, i) => {
                  if (i > 0) {
                    form.setValue(`items.${i}.check_in`,  firstCheckIn,  { shouldValidate: false })
                    form.setValue(`items.${i}.check_out`, firstCheckOut, { shouldValidate: false })
                    form.setValue(`items.${i}.assigned_room_ids`, [])
                  }
                })
              }
            }}
            className="rounded border-border accent-primary"
          />
          <span className="text-body">ใช้วันที่เดิมสำหรับทุกรายการ</span>
        </label>
      )}

      {fields.map((field, index) => (
        <RoomTypeBookingItemCard
          key={field.id}
          index={index}
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
        className="w-full"
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
          className="w-full gap-1.5"
        >
          <Wand2 className="w-3.5 h-3.5" />
          มอบหมายอัตโนมัติทั้งหมด
        </Button>
      )}
    </div>
  )
}

// ─── RoomTypeBookingItemCard ───────────────────────────────────────────────────

function RoomTypeBookingItemCard({
  index,
  onRemove,
  roomTypes,
  hideDates,
  sharedCheckIn,
  sharedCheckOut,
}: {
  index: number
  onRemove?: () => void
  roomTypes: RoomTypeResponse[]
  /** When true, date pickers are hidden; shared dates from item 0 are used. */
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

  // Max quantity = number of available rooms for this type (0 if not yet loaded)
  const availableCount = roomsForType.filter((r) => r.available).length
  const maxQuantity    = availableCount > 0 ? availableCount : Infinity

  const assignedCount = assignedRoomIds.length
  const canSelectMore = assignedCount < quantity
  const remaining     = quantity - assignedCount

  // ── Handlers ─────────────────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            รายการที่ {index + 1}
          </CardTitle>
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onRemove}
            >
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* ── Row 1: room type + quantity ─────────────────────────────── */}
        {/* Mobile: stacked. Desktop: side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 sm:items-end">
          {/* Room type select */}
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
                          ? ` (฿${rt.price_per_night.toLocaleString()}/คืน)`
                          : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Quantity stepper */}
          <FormField
            control={form.control}
            name={`items.${index}.quantity`}
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between sm:hidden">
                  <FormLabel>จำนวนห้อง</FormLabel>
                </div>
                <FormLabel className="hidden sm:block">จำนวน</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 sm:h-9 sm:w-9"
                      disabled={!roomTypeId || field.value <= 1}
                      onClick={() => {
                        const next = Math.max(1, field.value - 1)
                        field.onChange(next)
                        trimAssignedIfNeeded(next)
                      }}
                    >
                      <Minus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      max={maxQuantity === Infinity ? undefined : maxQuantity}
                      className="h-10 w-full sm:w-16 sm:h-9 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      value={field.value}
                      disabled={!roomTypeId}
                      onChange={(e) => {
                        const val = Math.min(maxQuantity, Math.max(1, parseInt(e.target.value) || 1))
                        field.onChange(val)
                        trimAssignedIfNeeded(val)
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 sm:h-9 sm:w-9"
                      disabled={!roomTypeId || field.value >= maxQuantity}
                      onClick={() => {
                        const next = Math.min(maxQuantity, field.value + 1)
                        field.onChange(next)
                      }}
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

        {/* Available rooms hint */}
        {showRoomPicker && availableCount > 0 && (
          <p className="text-[11px] text-muted-foreground -mt-2">
            ห้องว่าง {availableCount} ห้อง
            {unassignedCount > 0 && (
              <span className="text-warning font-medium ml-1">
                (จองล่วงหน้า {unassignedCount} ห้องยังไม่มอบหมาย)
              </span>
            )}
            {quantity > availableCount && (
              <span className="text-destructive font-medium ml-1">
                (เกินจำนวนห้องว่าง)
              </span>
            )}
          </p>
        )}

        {/* ── Row 2: date range picker (hidden for items 1+ when same_dates) ── */}
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

        {/* ── Row 3: optional physical room picker ────────────────────── */}
        {showRoomPicker && (
          <div>
            {/* Header row: label + auto-assign button */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">
                เลือกห้อง (ไม่บังคับ)
                {' '}—{' '}
                <span className={cn(assignedCount === quantity ? 'text-primary font-semibold' : '')}>
                  {assignedCount}/{quantity} ห้อง
                </span>
                {remaining > 0 && (
                  <span className="ml-1 text-muted-foreground/70">
                    ({remaining} ห้องยังไม่ได้มอบหมาย)
                  </span>
                )}
              </p>

            </div>

            {availLoading ? (
              <div className="flex justify-center py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
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
                      <div className="flex flex-wrap gap-2">
                        {roomsForType.map((room) => {
                          const isSelected = assignedRoomIds.includes(room.room_id)
                          const isDisabled = !room.available && !isSelected
                          const isFull    = !canSelectMore && !isSelected

                          return (
                            <button
                              key={room.room_id}
                              type="button"
                              disabled={isDisabled || isFull}
                              onClick={() => toggleRoom(room.room_id)}
                              className={cn(
                                'w-14 h-10 radius-button border text-xs font-semibold transition-colors',
                                isSelected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : isDisabled || isFull
                                  ? 'border-border/50 bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                                  : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5',
                              )}
                            >
                              {room.room_number}
                            </button>
                          )
                        })}
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
