import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn, fmtShort } from '@/shared/utils'
import { Card, CardContent } from '@/shared/ui/card'
import { Separator } from '@/shared/ui/separator'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoomAvailability {
  room_type_id: string
  room_type_name: string
  total_rooms: number
  occupied_rooms: number
  available_rooms: number
}

interface AvailabilitySummaryProps {
  /** First day of the current timeline window (used for the section label). */
  date: Date
  roomTypes: RoomAvailability[]
  selectedRoomTypeId: string | null
  onSelect: (id: string | null) => void
  isLoading: boolean
}

// ─── AvailabilitySummary ──────────────────────────────────────────────────────

/**
 * Horizontally-scrollable row of availability cards, one per room type plus an
 * "All" aggregate card.  Clicking a card filters the timeline rows to that type.
 *
 * Layout:
 *   Mobile  — flex row, horizontal scroll (cards never wrap)
 *   Desktop — CSS grid (md:grid-cols-3 lg:grid-cols-4)
 *
 * Uses shadcn Card for each card.
 */
export const AvailabilitySummary = React.memo(function AvailabilitySummary({
  date,
  roomTypes,
  selectedRoomTypeId,
  onSelect,
  isLoading,
}: AvailabilitySummaryProps) {
  const totalAll    = roomTypes.reduce((s, r) => s + r.total_rooms,     0)
  const availAll    = roomTypes.reduce((s, r) => s + r.available_rooms, 0)
  const occupiedAll = roomTypes.reduce((s, r) => s + r.occupied_rooms,  0)

  const showSkeletons = isLoading && roomTypes.length === 0

  return (
    <div className="shrink-0 border-b border-border-soft bg-card/50">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          ห้องว่าง — {fmtShort(date)}
        </p>
        {isLoading && roomTypes.length > 0 && (
          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Cards */}
      <div className="overflow-x-auto pb-3 px-4">
        <div className="flex md:grid md:grid-cols-3 lg:grid-cols-4 gap-2.5 min-w-max md:min-w-0">

          {showSkeletons ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="w-[110px] md:w-auto h-[96px] rounded-2xl border border-border bg-muted animate-pulse"
              />
            ))
          ) : (
            <>
              {/* "All" aggregate card */}
              <AvailabilityCard
                label="ทั้งหมด"
                total={totalAll}
                available={availAll}
                occupied={occupiedAll}
                isSelected={selectedRoomTypeId === null}
                onClick={() => onSelect(null)}
              />

              {/* Per-room-type cards */}
              {roomTypes.map((rt) => (
                <AvailabilityCard
                  key={rt.room_type_id}
                  label={rt.room_type_name}
                  total={rt.total_rooms}
                  available={rt.available_rooms}
                  occupied={rt.occupied_rooms}
                  isSelected={selectedRoomTypeId === rt.room_type_id}
                  onClick={() =>
                    onSelect(selectedRoomTypeId === rt.room_type_id ? null : rt.room_type_id)
                  }
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
})

// ─── AvailabilityCard ─────────────────────────────────────────────────────────

interface AvailabilityCardProps {
  label: string
  total: number
  available: number
  occupied: number
  isSelected: boolean
  onClick: () => void
}

const AvailabilityCard = React.memo(function AvailabilityCard({
  label,
  total,
  available,
  occupied,
  isSelected,
  onClick,
}: AvailabilityCardProps) {
  const isFull = available === 0

  return (
    <Card
      className={cn(
        'w-[110px] md:w-auto cursor-pointer transition-colors',
        isSelected
          ? 'border-primary ring-1 ring-primary/20 bg-primary/5'
          : 'hover:bg-muted',
      )}
      // Card is a div — use a button role for accessibility
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
    >
      <CardContent className="p-3 flex flex-col gap-0">
        {/* Room type label */}
        <span className="text-[11px] font-medium text-muted-foreground leading-none mb-2 truncate block">
          {label}
        </span>

        {/* Large availability number */}
        {isFull ? (
          <span className="text-metric text-destructive">เต็ม</span>
        ) : (
          <span className="text-metric text-success">
            {available}
          </span>
        )}

        {/* "ว่าง" label */}
        <span
          className={cn(
            'text-[10px] leading-none mt-0.5 mb-2',
            isFull ? 'text-destructive/80' : 'text-success-muted-foreground',
          )}
        >
          ว่าง
        </span>

        <Separator className="mb-2" />

        {/* Occupancy bar */}
        {total > 0 && (
          <div className="w-full h-1 rounded-full bg-border overflow-hidden mb-1.5">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                isFull ? 'bg-destructive/60' : 'bg-info/50',
              )}
              style={{ width: `${Math.round((occupied / total) * 100)}%` }}
            />
          </div>
        )}

        {/* Secondary stats */}
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] text-muted-foreground tabular-nums">
            ไม่ว่าง {occupied}
            {total > 0 && ` (${Math.round((occupied / total) * 100)}%)`}
          </span>
          <span className="text-[10px] text-muted-foreground/60">·</span>
          <span className="text-[10px] text-muted-foreground tabular-nums">รวม {total}</span>
        </div>
      </CardContent>
    </Card>
  )
})
