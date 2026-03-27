import type { Dispatch } from 'react'
import { Plus, ChevronDown, CalendarDays, Footprints, Loader2, X } from 'lucide-react'
import { cn, formatTHBCurrency } from '@/shared/utils'
import { Button } from '@/shared/ui/button'
import { ChargedPriceMulti } from '@/features/bookings/shared/components/ChargedPriceInput'
import type { AvailabilityGroupedResponse } from '@/features/bookings/types'
import { calcAvailableCount } from '@/features/bookings/shared/availabilityCalc'
import type { SelectedRoom, BookingSource } from '../hooks/useInlineBookingForm'

// ── Types ────────────────────────────────────────────────────────────────────

type RoomAction =
  | { type: 'SET_SOURCE'; value: BookingSource }
  | { type: 'TOGGLE_ROOM_PICKER' }
  | { type: 'TOGGLE_ROOM'; room: SelectedRoom }
  | { type: 'UPDATE_CHARGED_PRICE'; roomId: string; price: number | undefined }
  | { type: 'CLEAR_ALL_CHARGED_PRICES' }

interface InlineRoomSelectorProps {
  selectedRooms: SelectedRoom[]
  selectedRoomIds: Set<string>
  source: BookingSource
  showRoomPicker: boolean
  availData: AvailabilityGroupedResponse | undefined
  dispatch: Dispatch<RoomAction>
}

// ── Component ────────────────────────────────────────────────────────────────

export function InlineRoomSelector({
  selectedRooms,
  selectedRoomIds,
  source,
  showRoomPicker,
  availData,
  dispatch,
}: InlineRoomSelectorProps) {
  return (
    <div className="rounded-lg bg-muted/50 p-3 space-y-3">
      {/* Room chips */}
      <div className="space-y-2">
        <p className="text-micro-sm font-semibold uppercase tracking-wider text-muted-foreground">ห้องพัก</p>
        <div className="flex flex-wrap gap-1.5">
          {selectedRooms.map((room) => (
            <Button
              key={room.roomId}
              variant="ghost"
              onClick={() => dispatch({ type: 'TOGGLE_ROOM', room })}
              className={cn(
                'h-auto gap-1.5 rounded-md border px-2.5 py-1.5 text-sm',
                'border-primary/30 bg-primary/10 text-foreground',
                selectedRooms.length > 1 && 'hover:border-destructive/50 hover:bg-destructive/10',
              )}
            >
              <span className="font-semibold tabular-nums">{room.roomNumber}</span>
              <span className="text-muted-foreground text-xs">{room.roomTypeName}</span>
              {room.pricePerNight > 0 && (
                <span className="text-muted-foreground/60 text-xs">{formatTHBCurrency(room.pricePerNight)}</span>
              )}
              {selectedRooms.length > 1 && (
                <X size={12} className="text-muted-foreground/50" />
              )}
            </Button>
          ))}
        </div>

        {/* Add room toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dispatch({ type: 'TOGGLE_ROOM_PICKER' })}
          className="gap-1 h-auto p-0 text-xs text-primary hover:text-primary/80"
        >
          <Plus size={12} />
          เพิ่มห้อง
          <ChevronDown size={12} className={cn('transition-transform', showRoomPicker && 'rotate-180')} />
        </Button>

        {/* Room picker grid */}
        {showRoomPicker && (
          <div className="rounded-md border border-border-soft bg-background/60 p-2.5 space-y-2.5 max-h-44 overflow-y-auto">
            {availData?.room_types.map((rt) => {
              const availableRooms = rt.rooms.filter((r) => r.available)
              if (availableRooms.length === 0) return null
              return (
                <div key={rt.room_type_id} className="space-y-1.5">
                  <p className="text-micro-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {rt.room_type_name} · {formatTHBCurrency(rt.price_per_night)}/คืน
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {availableRooms.map((room) => {
                      const isSelected = selectedRoomIds.has(room.room_id)
                      return (
                        <Button
                          key={room.room_id}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => dispatch({ type: 'TOGGLE_ROOM', room: {
                            roomId: room.room_id,
                            roomNumber: room.room_number,
                            roomTypeId: rt.room_type_id,
                            roomTypeName: rt.room_type_name,
                            pricePerNight: rt.price_per_night,
                          } })}
                          className={cn(
                            'min-w-10 h-7 px-2 text-xs font-medium tabular-nums',
                            isSelected
                              ? 'bg-primary/20 text-primary hover:bg-primary/30'
                              : 'text-muted-foreground',
                          )}
                        >
                          {room.room_number}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {!availData && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="icon-sm animate-spin text-muted-foreground" />
              </div>
            )}
            {availData && availData.room_types.every((rt) => calcAvailableCount(rt.rooms.filter((r) => r.available).length, rt.unassigned_count ?? 0) === 0) && (
              <p className="text-xs text-muted-foreground text-center py-1.5">ไม่มีห้องว่าง</p>
            )}
          </div>
        )}
      </div>

      {/* Charged price (optional discount) */}
      <ChargedPriceMulti
        entries={selectedRooms.map((r) => ({
          key: r.roomId,
          label: r.roomNumber,
          rackPrice: r.pricePerNight,
          chargedPrice: r.chargedPrice,
        }))}
        onChange={(key, value) => dispatch({ type: 'UPDATE_CHARGED_PRICE', roomId: key, price: value })}
        onClearAll={() => dispatch({ type: 'CLEAR_ALL_CHARGED_PRICES' })}
      />

      {/* Source toggle */}
      <div className="space-y-2">
        <p className="text-micro-sm font-semibold uppercase tracking-wider text-muted-foreground">ประเภท</p>
        <div className="flex gap-2">
          {([
            { value: 'advance' as const, label: 'จองล่วงหน้า', Icon: CalendarDays },
            { value: 'walk_in' as const, label: 'วอล์คอิน', Icon: Footprints },
          ] as const).map((opt) => (
            <Button
              key={opt.value}
              variant="ghost"
              onClick={() => dispatch({ type: 'SET_SOURCE', value: opt.value })}
              className={cn(
                'h-auto gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium',
                source === opt.value
                  ? 'border-primary/40 bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground',
              )}
            >
              <opt.Icon size={14} />
              {opt.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
