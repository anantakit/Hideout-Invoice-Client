import { useMemo, useCallback } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { cn, formatTHB } from '@/shared/utils'
import { ChargedPriceInput } from '../../shared/components/ChargedPriceInput'
import { DateRangePicker } from '../../shared/components/DateRangePicker'
import type { DateRange } from '../../shared/components/DateRangePicker'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/shared/ui/select'
import type { RoomTypeResponse, AvailabilityGroupedResponse } from '../../types'
import type { StayDraft, Action } from '../hooks/useAddStayForm'
import { calcAvailableCount } from '../../shared/availabilityCalc'

// ── StayDraftRow ────────────────────────────────────────────────────────────

interface StayDraftRowProps {
  draft: StayDraft
  index: number
  roomTypes: RoomTypeResponse[]
  availability?: { data?: AvailabilityGroupedResponse; isLoading: boolean }
  isRoomTakenByOtherRow: (currentKey: string, roomId: string, checkIn: string, checkOut: string) => boolean
  canRemove: boolean
  dispatch: React.Dispatch<Action>
}

export function StayDraftRow({
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

      {/* Room type — shows availability count per type, disables full types */}
      <Select
        value={draft.roomTypeId}
        onValueChange={(v) => dispatch({ type: 'UPDATE_ROOM_TYPE', key: draft.key, roomTypeId: v })}
      >
        <SelectTrigger>
          <SelectValue placeholder="เลือกประเภทห้อง" />
        </SelectTrigger>
        <SelectContent>
          {roomTypes.map((rt) => {
            const groupedType = availability?.data?.room_types.find((t) => t.room_type_id === rt.id)
            const physicalAvail = groupedType?.rooms.filter((r) => r.available).length ?? 0
            const availCount = calcAvailableCount(physicalAvail, groupedType?.unassigned_count ?? 0)
            const hasAvail = !availability?.data || availCount > 0
            return (
              <SelectItem key={rt.id} value={rt.id} disabled={!hasAvail}>
                {rt.name} — {formatTHB(rt.price_per_night ?? 0)}/คืน
                {availability?.data && (
                  <span className={hasAvail ? 'text-muted-foreground' : 'text-destructive'}>
                    {' '}({availCount > 0 ? `ว่าง ${availCount}` : 'เต็ม'})
                  </span>
                )}
              </SelectItem>
            )
          })}
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
