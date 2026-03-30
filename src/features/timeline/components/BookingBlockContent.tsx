import React from 'react'
import {
  Users,
  BedDouble,
  Clock,
  Footprints,
  CalendarCheck,
  ArrowRightLeft,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/shared/utils'
import type { TimelineBooking } from '@/features/bookings/types'

// ── Constants ────────────────────────────────────────────────────────────────

const SOURCE_ICON: Record<string, React.ElementType> = {
  walk_in: Footprints,
  advance: CalendarCheck,
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface BookingBlockContentProps {
  booking: TimelineBooking
  roomCount: number
  isUpcoming: boolean
  isDraggable: boolean
  isBeingDragged: boolean
  isMultiRoom: boolean
  onResizeLeftDown: (e: React.PointerEvent) => void
  onResizeRightDown: (e: React.PointerEvent) => void
  showCheckoutEdge: boolean
}

// ── Component ────────────────────────────────────────────────────────────────

function BookingBlockContent({
  booking,
  roomCount,
  isUpcoming,
  isDraggable,
  isBeingDragged,
  isMultiRoom,
  onResizeLeftDown,
  onResizeRightDown,
  showCheckoutEdge,
}: BookingBlockContentProps) {
  return (
    <>
      {/* Resize handle — left edge */}
      {isDraggable && !isBeingDragged && (
        <div
          className="absolute left-0 inset-y-0 w-3 cursor-col-resize opacity-0 group-hover/block:opacity-100 tl-resize-handle transition-opacity z-10 flex items-center justify-center"
          onPointerDown={onResizeLeftDown}
        >
          <div className="flex gap-px">
            <div className="w-0.5 h-5 radius-badge bg-foreground/40" />
            <div className="w-0.5 h-5 radius-badge bg-foreground/40" />
          </div>
        </div>
      )}

      {/* Resize handle — right edge */}
      {isDraggable && !isBeingDragged && (
        <div
          className="absolute right-0 inset-y-0 w-3 cursor-col-resize opacity-0 group-hover/block:opacity-100 tl-resize-handle transition-opacity z-10 flex items-center justify-center"
          onPointerDown={onResizeRightDown}
        >
          <div className="flex gap-px">
            <div className="w-0.5 h-5 radius-badge bg-foreground/40" />
            <div className="w-0.5 h-5 radius-badge bg-foreground/40" />
          </div>
        </div>
      )}

      {/* Left accent bar for multi-room bookings */}
      {isMultiRoom && (
        <div
          className={cn(
            'absolute left-0 inset-y-0 w-0.75',
            isUpcoming ? 'bg-primary/30' : 'bg-foreground/20',
          )}
        />
      )}

      {/* Right edge checkout indicator */}
      {showCheckoutEdge && !isUpcoming && (
        <div className="absolute right-0 inset-y-0 w-0.75 bg-foreground/30 rounded-r-sm" />
      )}

      {/* Transfer indicator */}
      {booking.transfer_from_stay_id && !isUpcoming && (
        <ArrowRightLeft className="w-2.5 h-2.5 shrink-0 opacity-50" />
      )}

      {/* Early checkout indicator */}
      {booking.early_checkout && !isUpcoming && (
        <CheckCircle2 className="w-2.5 h-2.5 shrink-0 text-success opacity-60" />
      )}

      {/* Clock icon for upcoming */}
      {isUpcoming && (
        <Clock className="w-3 h-3 shrink-0 text-muted-foreground/50" />
      )}

      {/* Top-right indicators: payment dot + source icon */}
      {!isUpcoming && (
        <div className="absolute top-0.5 right-1 flex items-center gap-1">
          {(() => {
            const SourceIcon = SOURCE_ICON[booking.source]
            return SourceIcon ? (
              <SourceIcon className="w-2.5 h-2.5 opacity-60" />
            ) : null
          })()}
          <span
            className={cn(
              'w-1.5 h-1.5 radius-badge',
              Number(booking.balance_amount) > 0
                ? 'bg-foreground/80 ring-1 ring-destructive'
                : 'bg-foreground/30',
            )}
          />
        </div>
      )}

      {/* Guest name & room count — 3-level hierarchy */}
      <div
        className={cn(
          'flex flex-col min-w-0 flex-1 gap-0.5',
          isMultiRoom && !isUpcoming && 'pl-1',
        )}
      >
        <span className="truncate text-[13px] font-medium leading-tight text-foreground/92 tracking-[0.01em]">
          {booking.guest_name}
        </span>
        <span className="flex items-center gap-0.5 text-[11px] leading-tight text-foreground/55 truncate">
          {isMultiRoom ? (
            <Users className="w-2.5 h-2.5 shrink-0 opacity-60" />
          ) : (
            <BedDouble className="w-2.5 h-2.5 shrink-0 opacity-60" />
          )}
          {roomCount} ห้อง
        </span>
      </div>
    </>
  )
}

export default React.memo(BookingBlockContent)
