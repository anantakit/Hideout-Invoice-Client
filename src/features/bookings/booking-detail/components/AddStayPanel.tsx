import { useState, useMemo, useReducer, useCallback } from 'react'
import { Plus, X, Loader2, Trash2 } from 'lucide-react'
import { useQueries } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { cn, formatTHB, todayISO, addDaysISO } from '@/shared/utils'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { ChargedPriceInput } from '../../shared/components/ChargedPriceInput'
import { Separator } from '@/shared/ui/separator'
import { DateRangePicker } from '../../shared/components/DateRangePicker'
import type { DateRange } from '../../shared/components/DateRangePicker'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/shared/ui/select'
import { useRoomTypes, useAddStays, AVAILABILITY_GROUPED_KEY } from '../../hooks'
import { bookingsApi } from '../../api'
import type { AvailabilityGroupedResponse, RoomTypeResponse } from '../../types'

// ─── Types & Reducer ─────────────────────────────────────────────────────────

interface StayDraft {
  key: string
  checkIn: string
  checkOut: string
  roomTypeId: string
  roomId: string | null
  chargedPrice?: number
}

type Action =
  | { type: 'ADD_ROW'; checkIn: string; checkOut: string }
  | { type: 'REMOVE_ROW'; key: string }
  | { type: 'UPDATE_DATES'; key: string; checkIn: string; checkOut: string }
  | { type: 'UPDATE_ROOM_TYPE'; key: string; roomTypeId: string }
  | { type: 'UPDATE_ROOM'; key: string; roomId: string | null }
  | { type: 'UPDATE_CHARGED_PRICE'; key: string; chargedPrice?: number }
  | { type: 'RESET' }

function makeRow(checkIn: string, checkOut: string): StayDraft {
  return { key: crypto.randomUUID(), checkIn, checkOut, roomTypeId: '', roomId: null }
}

function reducer(state: StayDraft[], action: Action): StayDraft[] {
  switch (action.type) {
    case 'ADD_ROW': {
      return [...state, makeRow(action.checkIn, action.checkOut)]
    }
    case 'REMOVE_ROW':
      return state.length <= 1 ? state : state.filter((d) => d.key !== action.key)
    case 'UPDATE_DATES':
      return state.map((d) =>
        d.key === action.key
          ? { ...d, checkIn: action.checkIn, checkOut: action.checkOut, roomId: null }
          : d,
      )
    case 'UPDATE_ROOM_TYPE':
      return state.map((d) =>
        d.key === action.key ? { ...d, roomTypeId: action.roomTypeId, roomId: null } : d,
      )
    case 'UPDATE_ROOM':
      return state.map((d) =>
        d.key === action.key ? { ...d, roomId: action.roomId } : d,
      )
    case 'UPDATE_CHARGED_PRICE':
      return state.map((d) =>
        d.key === action.key ? { ...d, chargedPrice: action.chargedPrice } : d,
      )
    case 'RESET':
      return [makeRow(todayISO(), addDaysISO(1))]
    default:
      return state
  }
}

// ─── AddStayPanel ────────────────────────────────────────────────────────────

interface AddStayPanelProps {
  bookingId: string
}

export function AddStayPanel({ bookingId }: AddStayPanelProps) {
  const [open, setOpen] = useState(false)
  const [drafts, dispatch] = useReducer(reducer, null, () => [
    makeRow(todayISO(), addDaysISO(1)),
  ])

  const { data: roomTypes } = useRoomTypes()
  const addStays = useAddStays(bookingId)

  // ── Multi-availability queries (deduplicated by date pair) ───────────
  const uniqueDatePairs = useMemo(() => {
    const seen = new Map<string, { checkIn: string; checkOut: string }>()
    for (const d of drafts) {
      if (d.checkIn && d.checkOut && d.checkOut > d.checkIn && d.roomTypeId) {
        const key = `${d.checkIn}|${d.checkOut}`
        if (!seen.has(key)) seen.set(key, { checkIn: d.checkIn, checkOut: d.checkOut })
      }
    }
    return Array.from(seen.values())
  }, [drafts])

  const availQueries = useQueries({
    queries: open
      ? uniqueDatePairs.map(({ checkIn, checkOut }) => ({
          queryKey: AVAILABILITY_GROUPED_KEY(checkIn, checkOut),
          queryFn: () => bookingsApi.getAvailabilityGrouped(checkIn, checkOut),
          staleTime: 30_000,
        }))
      : [],
  })

  const availMap = useMemo(() => {
    const map = new Map<string, { data?: AvailabilityGroupedResponse; isLoading: boolean }>()
    uniqueDatePairs.forEach((pair, i) => {
      const key = `${pair.checkIn}|${pair.checkOut}`
      map.set(key, { data: availQueries[i]?.data, isLoading: availQueries[i]?.isLoading ?? false })
    })
    return map
  }, [uniqueDatePairs, availQueries])

  // ── Rooms already selected in other rows with overlapping dates ─────
  // Returns a function that checks if a roomId is taken by another row
  // whose dates overlap with the given row's dates.
  const isRoomTakenByOtherRow = useCallback(
    (currentKey: string, roomId: string, checkIn: string, checkOut: string) => {
      for (const d of drafts) {
        if (d.key === currentKey || d.roomId !== roomId) continue
        // Check date overlap: two stays overlap if one starts before the other ends
        if (d.checkIn < checkOut && d.checkOut > checkIn) return true
      }
      return false
    },
    [drafts],
  )

  // ── Price computation ───────────────────────────────────────────────
  const totalPrice = useMemo(() => {
    return drafts.reduce((sum, d) => {
      const rt = roomTypes?.find((t) => t.id === d.roomTypeId)
      if (!rt?.price_per_night || !d.checkIn || !d.checkOut || d.checkOut <= d.checkIn) return sum
      const nights = Math.round(
        (new Date(d.checkOut).getTime() - new Date(d.checkIn).getTime()) / 86400000,
      )
      const price = d.chargedPrice ?? rt.price_per_night
      return sum + price * nights
    }, 0)
  }, [drafts, roomTypes])

  const canSubmit =
    drafts.length > 0 &&
    drafts.every((d) => d.checkIn && d.checkOut && d.checkOut > d.checkIn && d.roomTypeId) &&
    !addStays.isPending

  // ── Handlers ────────────────────────────────────────────────────────
  function handleAddRow() {
    const last = drafts[drafts.length - 1]
    dispatch({ type: 'ADD_ROW', checkIn: last.checkIn, checkOut: last.checkOut })
  }

  function handleSubmit() {
    if (!canSubmit) return
    addStays.mutate(
      {
        stays: drafts.map((d) => ({
          room_type_id: d.roomTypeId,
          room_id: d.roomId || undefined,
          check_in: d.checkIn,
          check_out: d.checkOut,
          ...(d.chargedPrice != null ? { charged_price: d.chargedPrice } : {}),
        })),
      },
      {
        onSuccess: () => {
          toast.success(
            drafts.length === 1
              ? 'เพิ่มห้องพักสำเร็จ'
              : `เพิ่มห้องพัก ${drafts.length} รายการสำเร็จ`,
          )
          dispatch({ type: 'RESET' })
          setOpen(false)
        },
        onError: (err: Error & { response?: { data?: { message?: string } } }) => {
          const msg = err?.response?.data?.message || err.message || 'เกิดข้อผิดพลาด'
          toast.error(msg)
        },
      },
    )
  }

  function handleClose() {
    setOpen(false)
    dispatch({ type: 'RESET' })
  }

  // ── Closed state ────────────────────────────────────────────────────
  if (!open) {
    return (
      <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-1.5" />
        เพิ่มห้องพัก
      </Button>
    )
  }

  // ── Open state ──────────────────────────────────────────────────────
  return (
    <Card>
      <CardContent className="px-4 py-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-body font-medium">เพิ่มห้องพัก</p>
          <button
            type="button"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Rows */}
        {drafts.map((draft, idx) => (
          <StayDraftRow
            key={draft.key}
            draft={draft}
            index={idx}
            roomTypes={roomTypes ?? []}
            availability={availMap.get(`${draft.checkIn}|${draft.checkOut}`)}
            isRoomTakenByOtherRow={isRoomTakenByOtherRow}
            canRemove={drafts.length > 1}
            dispatch={dispatch}
          />
        ))}

        {/* Add row */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={handleAddRow}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          เพิ่มรายการ
        </Button>

        {/* Total */}
        {totalPrice > 0 && (
          <>
            <Separator />
            <div className="flex items-center justify-between text-body">
              <span className="text-muted-foreground">
                รวม {drafts.length} รายการ
              </span>
              <span className="font-semibold tabular-nums">{formatTHB(totalPrice)}</span>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={addStays.isPending}
            onClick={handleClose}
          >
            ยกเลิก
          </Button>
          <Button
            size="sm"
            className="flex-1"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {addStays.isPending
              ? 'กำลังบันทึก…'
              : drafts.length === 1
                ? 'เพิ่มห้องพัก'
                : `เพิ่ม ${drafts.length} ห้อง`}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── StayDraftRow ────────────────────────────────────────────────────────────

interface StayDraftRowProps {
  draft: StayDraft
  index: number
  roomTypes: RoomTypeResponse[]
  availability?: { data?: AvailabilityGroupedResponse; isLoading: boolean }
  isRoomTakenByOtherRow: (currentKey: string, roomId: string, checkIn: string, checkOut: string) => boolean
  canRemove: boolean
  dispatch: React.Dispatch<Action>
}

function StayDraftRow({
  draft,
  index,
  roomTypes,
  availability,
  isRoomTakenByOtherRow,
  canRemove,
  dispatch,
}: StayDraftRowProps) {
  const datesValid = draft.checkIn && draft.checkOut && draft.checkOut > draft.checkIn
  const nights = datesValid
    ? Math.round(
        (new Date(draft.checkOut).getTime() - new Date(draft.checkIn).getTime()) / 86400000,
      )
    : 0

  const selectedRoomType = roomTypes.find((rt) => rt.id === draft.roomTypeId)
  const pricePerNight = selectedRoomType?.price_per_night ?? 0
  const effectivePrice = draft.chargedPrice ?? pricePerNight
  const rowTotal = effectivePrice * nights

  const availableRooms = useMemo(() => {
    if (!availability?.data || !draft.roomTypeId) return []
    const rt = availability.data.room_types.find((t) => t.room_type_id === draft.roomTypeId)
    if (!rt) return []
    return rt.rooms.filter(
      (r) =>
        r.available &&
        (r.room_id === draft.roomId ||
          !isRoomTakenByOtherRow(draft.key, r.room_id, draft.checkIn, draft.checkOut)),
    )
  }, [availability?.data, draft.roomTypeId, draft.roomId, draft.key, draft.checkIn, draft.checkOut, isRoomTakenByOtherRow])

  const handleDatesChange = useCallback(
    (range: DateRange) => {
      dispatch({ type: 'UPDATE_DATES', key: draft.key, checkIn: range.checkIn, checkOut: range.checkOut })
    },
    [dispatch, draft.key],
  )

  return (
    <div className={cn('space-y-3', index > 0 && 'border-t border-border-soft pt-3')}>
      {/* Row header */}
      <div className="flex items-center justify-between">
        <span className="text-caption text-muted-foreground">ห้องที่ {index + 1}</span>
        {canRemove && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'REMOVE_ROW', key: draft.key })}
            className="text-muted-foreground hover:text-destructive transition-colors"
            aria-label="ลบรายการ"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dates */}
      <DateRangePicker
        value={{ checkIn: draft.checkIn, checkOut: draft.checkOut }}
        onChange={handleDatesChange}
      />

      {/* Room type */}
      <Select
        value={draft.roomTypeId}
        onValueChange={(v) => dispatch({ type: 'UPDATE_ROOM_TYPE', key: draft.key, roomTypeId: v })}
      >
        <SelectTrigger>
          <SelectValue placeholder="เลือกประเภทห้อง" />
        </SelectTrigger>
        <SelectContent>
          {roomTypes.map((rt) => (
            <SelectItem key={rt.id} value={rt.id}>
              {rt.name} — {formatTHB(rt.price_per_night ?? 0)}/คืน
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Charged price (optional discount) */}
      {draft.roomTypeId && (
        <ChargedPriceInput
          rackPrice={pricePerNight}
          chargedPrice={draft.chargedPrice}
          onChange={(v) => dispatch({ type: 'UPDATE_CHARGED_PRICE', key: draft.key, chargedPrice: v })}
        />
      )}

      {/* Room picker */}
      {draft.roomTypeId && datesValid && (
        <div>
          <label className="text-caption block mb-1">
            เลือกห้อง <span className="text-micro text-muted-foreground">(ไม่บังคับ)</span>
          </label>
          {availability?.isLoading ? (
            <div className="flex items-center gap-1.5 text-caption text-muted-foreground py-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              กำลังโหลด...
            </div>
          ) : availableRooms.length === 0 ? (
            <p className="text-caption text-muted-foreground py-1">ไม่มีห้องว่างในประเภทนี้</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {availableRooms.map((room) => (
                <button
                  key={room.room_id}
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: 'UPDATE_ROOM',
                      key: draft.key,
                      roomId: draft.roomId === room.room_id ? null : room.room_id,
                    })
                  }
                  className={cn(
                    'radius-card border px-3 py-1.5 text-body font-semibold tabular-nums transition-colors cursor-pointer',
                    draft.roomId === room.room_id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-foreground hover:bg-accent/60',
                  )}
                >
                  {room.room_number}
                </button>
              ))}
            </div>
          )}
          {draft.roomId === null && availableRooms.length > 0 && (
            <p className="text-micro text-muted-foreground mt-1">
              ไม่เลือก = RESERVED (มอบหมายทีหลัง)
            </p>
          )}
        </div>
      )}

      {/* Price preview */}
      {draft.roomTypeId && datesValid && nights > 0 && (
        <div className="flex items-center justify-between text-body">
          <span className="text-muted-foreground">
            {draft.chargedPrice != null && draft.chargedPrice < pricePerNight ? (
              <>
                <span className="line-through">{formatTHB(pricePerNight)}</span>
                {' '}
                <span className="text-primary">{formatTHB(effectivePrice)}</span>
              </>
            ) : (
              formatTHB(effectivePrice)
            )}
            {' × '}{nights} คืน
          </span>
          <span className="font-semibold tabular-nums">{formatTHB(rowTotal)}</span>
        </div>
      )}
    </div>
  )
}
