import { CheckCircle2, Loader2, Minus, Plus } from 'lucide-react'
import { cn } from '@/shared/utils'
import { Button } from '../../../shared/ui/button'
import { useAvailabilityQuery } from '../hooks'
import type { RoomTypeResponse } from '../types'

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface WalkInRoomEntry {
  roomTypeId: string
  quantity: number
}

// ─── AvailabilityIndicator ────────────────────────────────────────────────────

function AvailabilityIndicator({
  available,
  isLoading,
}: {
  available: number | null
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        ตรวจสอบ
      </span>
    )
  }
  if (available === null) return null
  if (available === 0) {
    return (
      <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
        ไม่ว่าง
      </span>
    )
  }
  if (available <= 2) {
    return (
      <span className="inline-flex items-center rounded-full border border-warning bg-warning-muted px-2 py-0.5 text-xs text-warning-muted-foreground">
        เหลือ {available} ห้อง
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full border border-success bg-success-muted px-2 py-0.5 text-xs text-success-muted-foreground">
      ว่าง {available} ห้อง
    </span>
  )
}

// ─── WalkInRoomTypeCard ───────────────────────────────────────────────────────

interface WalkInRoomTypeCardProps {
  roomType: RoomTypeResponse
  checkIn: string
  checkOut: string
  quantity: number
  onQuantityChange: (newQty: number) => void
  autoFocus?: boolean
}

function WalkInRoomTypeCard({
  roomType,
  checkIn,
  checkOut,
  quantity,
  onQuantityChange,
  autoFocus,
}: WalkInRoomTypeCardProps) {
  const { data: avail, isLoading } = useAvailabilityQuery(roomType.id, checkIn, checkOut)
  const available   = avail?.available ?? null
  const isFull      = available !== null && available === 0
  const isSelected  = quantity > 0
  const canIncrement = !isLoading && available !== null && quantity < available
  const canDecrement = quantity > 0

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4 transition-all',
        'focus-within:outline-none focus-within:ring-1 focus-within:ring-ring',
        isSelected
          ? 'border-primary ring-1 ring-ring bg-accent'
          : 'border-border',
        isFull && !isSelected && 'opacity-50',
      )}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={cn(
            'text-sm font-semibold leading-snug',
            isFull && !isSelected && 'text-muted-foreground',
          )}>
            {roomType.name}
          </p>
          {roomType.price_per_night !== undefined && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              ฿{roomType.price_per_night.toLocaleString()} / คืน
            </p>
          )}
        </div>
        {isSelected && (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
        )}
      </div>

      {/* ── Availability ────────────────────────────────────────────────── */}
      <div className="mt-2.5">
        <AvailabilityIndicator available={available} isLoading={isLoading} />
      </div>

      {/* ── Quantity controls ───────────────────────────────────────────── */}
      <div className="mt-3 flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={!canDecrement}
          onClick={() => onQuantityChange(quantity - 1)}
          aria-label={`ลดจำนวน ${roomType.name}`}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>

        <span
          className="flex-1 text-center text-sm font-semibold tabular-nums select-none"
          aria-live="polite"
          aria-label={`${quantity} ห้อง`}
        >
          {quantity}
        </span>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={!canIncrement}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus}
          onClick={() => onQuantityChange(quantity + 1)}
          aria-label={`เพิ่มจำนวน ${roomType.name}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ─── WalkInRoomTypeSelector ───────────────────────────────────────────────────

export interface WalkInRoomTypeSelectorProps {
  roomTypes: RoomTypeResponse[]
  checkIn: string
  checkOut: string
  selectedRooms: WalkInRoomEntry[]
  onChange: (updated: WalkInRoomEntry[]) => void
  loading: boolean
  /** Auto-focus the + button of the first card on mount (keyboard-first UX). */
  autoFocusFirst?: boolean
}

export function WalkInRoomTypeSelector({
  roomTypes,
  checkIn,
  checkOut,
  selectedRooms,
  onChange,
  loading,
  autoFocusFirst,
}: WalkInRoomTypeSelectorProps) {
  const totalRooms = selectedRooms.reduce((sum, r) => sum + r.quantity, 0)

  function handleQuantityChange(roomTypeId: string, newQty: number) {
    const existing = selectedRooms.find((r) => r.roomTypeId === roomTypeId)
    if (existing) {
      onChange(
        selectedRooms.map((r) =>
          r.roomTypeId === roomTypeId ? { ...r, quantity: newQty } : r,
        ),
      )
    } else if (newQty > 0) {
      onChange([...selectedRooms, { roomTypeId, quantity: newQty }])
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        กำลังโหลดประเภทห้อง...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {roomTypes.map((rt, index) => {
          const entry    = selectedRooms.find((r) => r.roomTypeId === rt.id)
          const quantity = entry?.quantity ?? 0
          return (
            <WalkInRoomTypeCard
              key={rt.id}
              roomType={rt}
              checkIn={checkIn}
              checkOut={checkOut}
              quantity={quantity}
              onQuantityChange={(qty) => handleQuantityChange(rt.id, qty)}
              autoFocus={autoFocusFirst && index === 0}
            />
          )
        })}
      </div>

      {/* Auto-assign notice — shown once at least one room is selected */}
      {totalRooms > 0 && (
        <p className="text-xs text-muted-foreground">
          ระบบจะจัดห้องให้อัตโนมัติ {totalRooms} ห้อง
        </p>
      )}
    </div>
  )
}
