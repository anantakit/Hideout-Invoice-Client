import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { todayISO, addDaysISO } from '@/shared/utils'
import { useAvailabilityGrouped } from '../../hooks'
import { proximityAutoAssignAll } from '../utils/roomAssignment'
import type { CreateBookingFormValues } from '../utils/createBookingSchema'
import type { RoomTypeResponse } from '../../types'
import { calcAvailableCount } from '../../shared/availabilityCalc'

// ── useRoomTypeBuilder ───────────────────────────────────────────────────────

/** Builder-level state: field array, same-dates sync, unified auto-assign. */
export function useRoomTypeBuilder() {
  const form = useFormContext<CreateBookingFormValues>()
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const sameDates    = useWatch({ control: form.control, name: 'same_dates' })
  const items        = useWatch({ control: form.control, name: 'items' })
  const firstCheckIn  = useWatch({ control: form.control, name: 'items.0.check_in' })
  const firstCheckOut = useWatch({ control: form.control, name: 'items.0.check_out' })

  // Availability for unified auto-assign
  const unifiedDatesValid = Boolean(firstCheckIn && firstCheckOut && firstCheckOut > firstCheckIn)
  const { data: unifiedAvailData } = useAvailabilityGrouped(
    firstCheckIn,
    firstCheckOut,
    unifiedDatesValid && items.some((it) => it.room_type_id),
  )

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

  // Keep items 1+ in sync with item 0's dates when sameDates is on
  useEffect(() => {
    if (!sameDates) return
    fields.forEach((_, i) => {
      if (i === 0) return
      form.setValue(`items.${i}.check_in`,  firstCheckIn,  { shouldValidate: false })
      form.setValue(`items.${i}.check_out`, firstCheckOut, { shouldValidate: false })
      form.setValue(`items.${i}.assigned_room_ids`, [])
    })
  }, [sameDates, firstCheckIn, firstCheckOut, fields.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSameDates() {
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
  }

  function addItem() {
    const ci = sameDates && firstCheckIn  ? firstCheckIn  : todayISO()
    const co = sameDates && firstCheckOut ? firstCheckOut : addDaysISO(1)
    append({ room_type_id: '', quantity: 1, check_in: ci, check_out: co, assigned_room_ids: [] })
  }

  return {
    fields,
    remove,
    sameDates,
    firstCheckIn,
    firstCheckOut,
    items,
    hasUnassignedSlots,
    unifiedAvailData,
    handleUnifiedAutoAssign,
    toggleSameDates,
    addItem,
  }
}

// ── useRoomTypeBookingItem ───────────────────────────────────────────────────

/** Per-item state: watches, availability, room toggle, picker open state. */
export function useRoomTypeBookingItem(
  index: number,
  hideDates: boolean,
  sharedCheckIn: string,
  sharedCheckOut: string,
  roomTypes: RoomTypeResponse[],
) {
  const form = useFormContext<CreateBookingFormValues>()

  const roomTypeId      = useWatch({ control: form.control, name: `items.${index}.room_type_id` })
  const quantity        = useWatch({ control: form.control, name: `items.${index}.quantity` })
  const ownCheckIn      = useWatch({ control: form.control, name: `items.${index}.check_in` })
  const ownCheckOut     = useWatch({ control: form.control, name: `items.${index}.check_out` })
  const assignedRoomIds = useWatch({ control: form.control, name: `items.${index}.assigned_room_ids` }) ?? []
  const chargedPrice    = useWatch({ control: form.control, name: `items.${index}.charged_price` })

  const effectiveCheckIn  = hideDates ? sharedCheckIn  : ownCheckIn
  const effectiveCheckOut = hideDates ? sharedCheckOut : ownCheckOut

  const datesValid     = Boolean(effectiveCheckIn && effectiveCheckOut && effectiveCheckOut > effectiveCheckIn)
  const showRoomPicker = Boolean(roomTypeId && datesValid)

  const { data: availData, isFetching: availLoading } = useAvailabilityGrouped(
    effectiveCheckIn,
    effectiveCheckOut,
    showRoomPicker,
  )

  const matchedType    = availData?.room_types.find((rt) => rt.room_type_id === roomTypeId)
  const roomsForType   = matchedType?.rooms ?? []
  const unassignedCount = matchedType?.unassigned_count ?? 0

  const physicalAvail  = roomsForType.filter((r) => r.available).length
  const availableCount = calcAvailableCount(physicalAvail, unassignedCount)
  const maxQuantity    = availableCount > 0 ? availableCount : Infinity

  const assignedCount = assignedRoomIds.length
  const canSelectMore = assignedCount < quantity

  const [roomPickerOpen, setRoomPickerOpen] = useState(false)

  // Auto-open room picker when rooms are already assigned
  useEffect(() => {
    if (assignedRoomIds.length > 0) setRoomPickerOpen(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedRoomType = roomTypes.find((rt) => rt.id === roomTypeId)

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

  return {
    form,
    roomTypeId,
    quantity,
    ownCheckIn,
    ownCheckOut,
    assignedRoomIds,
    chargedPrice,
    showRoomPicker,
    availLoading,
    roomsForType,
    availableCount,
    unassignedCount,
    maxQuantity,
    assignedCount,
    canSelectMore,
    roomPickerOpen,
    setRoomPickerOpen,
    selectedRoomType,
    toggleRoom,
    trimAssignedIfNeeded,
  }
}
