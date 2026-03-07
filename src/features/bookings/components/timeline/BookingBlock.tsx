import React, { type CSSProperties, useCallback, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { Users, Clock } from 'lucide-react'
import {
  TIMELINE_BLOCK_HEIGHT_PX,
  TIMELINE_BLOCK_GAP_PX,
  TIMELINE_BLOCK_PADDING_PX,
} from './tokens'
import { cn } from '@/shared/utils'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/ui/tooltip'
import { Badge } from '@/shared/ui/badge'
import { Separator } from '@/shared/ui/separator'
import type { TimelineBooking } from '../../types'
import { useHoveredBookingId, useBookingHoverHandlers } from './HoverContext'
import type { DragMode, DragState } from './useTimelineDrag'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  try { return format(parseISO(iso), 'MMM d') } catch { return iso }
}

function statusBadgeVariant(
  status: string,
): 'default' | 'amber' | 'green' | 'gray' | 'red' | 'blue' {
  switch (status) {
    case 'CONFIRMED':             return 'blue'
    case 'PARTIALLY_CHECKED_IN':  return 'amber'
    case 'CHECKED_IN':            return 'green'
    case 'CHECKED_OUT':           return 'gray'
    case 'CANCELLED':             return 'red'
    default:                      return 'default'
  }
}

/** Statuses that can be dragged/resized. */
const DRAGGABLE_STATUSES = new Set(['CONFIRMED', 'RESERVED', 'ASSIGNED', 'CHECKED_IN', 'PARTIALLY_CHECKED_IN'])

// ─── BookingBlock ─────────────────────────────────────────────────────────────

export interface BookingBlockProps {
  booking: TimelineBooking
  roomId: string
  roomNumber: string
  roomCount: number
  offsetDays: number
  spanDays: number
  colorClass: string
  /** True when check_in is in the future (not yet occupied). */
  isUpcoming?: boolean
  /** True when the checkout date falls within the visible timeline window. */
  showCheckoutEdge?: boolean
  /** Zero-based vertical layer index (for overlap stacking). */
  layerIndex?: number
  /** Total number of layers in this room row. */
  totalLayers?: number
  onTap: (booking: TimelineBooking) => void
  /** Called when user starts a drag or resize. */
  onDragStart?: (
    e: React.PointerEvent,
    booking: TimelineBooking,
    roomId: string,
    mode: DragMode,
  ) => void
  /** Current drag state — used to dim the source block while dragging. */
  dragState?: DragState | null
}

const BookingBlock = React.memo(function BookingBlock({
  booking,
  roomId,
  roomNumber,
  roomCount,
  offsetDays,
  spanDays,
  colorClass,
  isUpcoming = false,
  showCheckoutEdge = false,
  layerIndex = 0,
  totalLayers = 1,
  onTap,
  onDragStart,
  dragState,
}: BookingBlockProps) {
  // Read hover state from external store — only this component re-renders on hover change
  const hoveredBookingId = useHoveredBookingId()
  const { onHoverStart, onHoverEnd } = useBookingHoverHandlers()

  const isHighlighted: boolean | null =
    hoveredBookingId === null
      ? null
      : hoveredBookingId === booking.booking_id
  const isMultiLayer = totalLayers > 1

  const isDraggable = DRAGGABLE_STATUSES.has(booking.status)
  const isBeingDragged =
    dragState?.booking.room_stay_id === booking.room_stay_id &&
    dragState?.sourceRoomId === roomId

  const positionStyle = useMemo<CSSProperties>(() => {
    const base = {
      '--tl-offset': offsetDays,
      '--tl-span':   spanDays,
    } as CSSProperties

    if (!isMultiLayer) {
      // Single layer: fill row with 4px top/bottom padding (original behavior)
      return { ...base, top: '4px', bottom: '4px' }
    }

    // Multi-layer: stack vertically with fixed block height
    const top =
      TIMELINE_BLOCK_PADDING_PX +
      layerIndex * (TIMELINE_BLOCK_HEIGHT_PX + TIMELINE_BLOCK_GAP_PX)
    return { ...base, top: `${top}px`, height: `${TIMELINE_BLOCK_HEIGHT_PX}px` }
  }, [offsetDays, spanDays, isMultiLayer, layerIndex])

  const isMultiRoom = roomCount > 1

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onTap(booking)
    }
  }, [onTap, booking])

  // ── Drag handlers ──────────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      if (!isDraggable || !onDragStart) return
      // Don't preventDefault — let click events fire normally for taps.
      // The drag hook uses a threshold before activating drag mode.
      onDragStart(e, booking, roomId, 'move')
    },
    [isDraggable, onDragStart, booking, roomId],
  )

  const handleResizeLeftDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      if (e.button !== 0) return
      if (!isDraggable || !onDragStart) return
      onDragStart(e, booking, roomId, 'resize-left')
    },
    [isDraggable, onDragStart, booking, roomId],
  )

  const handleResizeRightDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      if (e.button !== 0) return
      if (!isDraggable || !onDragStart) return
      onDragStart(e, booking, roomId, 'resize-right')
    },
    [isDraggable, onDragStart, booking, roomId],
  )

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          tabIndex={0}
          className={cn(
            'tl-booking-block',
            'absolute',
            'min-h-[40px]',
            // Card shape
            'rounded-lg border overflow-hidden',
            // Layout
            'flex items-center px-2.5 gap-1.5',
            'select-none',
            // Hover & highlight transitions
            'transition-[opacity,box-shadow,filter,transform] duration-150',
            // Focus-visible for keyboard navigation
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
            // Cursor
            isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
            // Dragging state — dim the source block
            isBeingDragged && 'opacity-30 pointer-events-none',
            // Group for resize handle hover
            'group/block',
            // ── Upcoming vs active styling ──
            !isBeingDragged && (
              isUpcoming
                ? [
                    'border-dashed border-border bg-muted/40 text-muted-foreground',
                    isHighlighted === null  && 'opacity-70 hover:opacity-90 hover:shadow-md hover:brightness-105',
                    isHighlighted === true  && 'opacity-90 shadow-md ring-2 ring-inset ring-primary/30',
                    isHighlighted === false && 'opacity-20',
                  ]
                : [
                    'border-current/15 shadow-card',
                    colorClass,
                    isHighlighted === null  && 'opacity-95 hover:opacity-100 hover:shadow-md hover:brightness-[1.03]',
                    isHighlighted === true  && 'opacity-100 shadow-md ring-2 ring-inset ring-current/30',
                    isHighlighted === false && 'opacity-25',
                  ]
            ),
          )}
          style={positionStyle}
          onMouseEnter={() => onHoverStart(booking.booking_id)}
          onMouseLeave={onHoverEnd}
          onFocus={() => onHoverStart(booking.booking_id)}
          onBlur={onHoverEnd}
          onClick={() => !isBeingDragged && onTap(booking)}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          aria-label={`${booking.guest_name} — ห้อง ${roomNumber}`}
        >
          {/* Resize handle — left edge */}
          {isDraggable && !isBeingDragged && (
            <div
              className="absolute left-0 inset-y-0 w-2 cursor-col-resize opacity-0 group-hover/block:opacity-100 transition-opacity z-10 flex items-center justify-center"
              onPointerDown={handleResizeLeftDown}
            >
              <div className="w-0.5 h-4 rounded-full bg-current/40" />
            </div>
          )}

          {/* Resize handle — right edge */}
          {isDraggable && !isBeingDragged && (
            <div
              className="absolute right-0 inset-y-0 w-2 cursor-col-resize opacity-0 group-hover/block:opacity-100 transition-opacity z-10 flex items-center justify-center"
              onPointerDown={handleResizeRightDown}
            >
              <div className="w-0.5 h-4 rounded-full bg-current/40" />
            </div>
          )}

          {/* Left accent bar for multi-room bookings */}
          {isMultiRoom && (
            <div className={cn(
              'absolute left-0 inset-y-0 w-[3px]',
              isUpcoming ? 'bg-primary/30' : 'bg-current/30',
            )} />
          )}

          {/* Right edge checkout indicator */}
          {showCheckoutEdge && !isUpcoming && (
            <div className="absolute right-0 inset-y-0 w-[3px] bg-destructive/40 rounded-r-sm" />
          )}

          {/* Clock icon for upcoming */}
          {isUpcoming && (
            <Clock className="w-3 h-3 shrink-0 text-muted-foreground/60" />
          )}

          {/* Payment indicator — small dot at top-right corner */}
          {!isUpcoming && (
            <span
              className={cn(
                'absolute top-1 right-1 w-1.5 h-1.5 rounded-full',
                Number(booking.balance_amount) > 0
                  ? 'bg-destructive/80'
                  : 'bg-success/60',
              )}
            />
          )}

          {/* Content */}
          <div className={cn('flex flex-col min-w-0 flex-1', isMultiRoom && !isUpcoming && 'pl-1')}>
            <span className="truncate text-[11px] font-semibold leading-tight">
              {booking.guest_name}
            </span>
            {spanDays >= 2 && (
              isUpcoming ? (
                <span className="truncate text-[10px] leading-tight opacity-70">
                  Check-in {fmtDate(booking.check_in)}
                </span>
              ) : isMultiRoom ? (
                <span className="flex items-center gap-0.5 text-[10px] leading-tight opacity-70">
                  <Users className="w-2.5 h-2.5 shrink-0" />
                  {roomCount} ห้อง
                </span>
              ) : (
                <span className="truncate text-[10px] leading-tight opacity-60">
                  {fmtDate(booking.check_in)} - {fmtDate(booking.check_out)}
                </span>
              )
            )}
          </div>
        </button>
      </TooltipTrigger>

      {/* ── Tooltip ──────────────────────────────────────────────────────── */}
      <TooltipContent side="top" className="max-w-[220px]">
        <p className="font-semibold text-foreground leading-snug">
          {booking.guest_name}
        </p>

        <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">
          #{booking.booking_id.slice(0, 8)}
        </p>

        <Separator className="my-1.5" />

        <p className="text-helper">ห้อง {roomNumber}</p>

        {isMultiRoom && (
          <p className="text-helper flex items-center gap-1">
            <Users className="w-3 h-3" />
            {roomCount} ห้อง (จองกลุ่ม)
          </p>
        )}

        <p className="text-helper mt-0.5">
          {fmtDate(booking.check_in)} → {fmtDate(booking.check_out)}
        </p>

        {isUpcoming && (
          <p className="text-xs text-primary/70 flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />
            จะมาถึง
          </p>
        )}

        {!isUpcoming && (
          <p className={cn(
            'text-xs mt-0.5',
            Number(booking.balance_amount) > 0 ? 'text-destructive' : 'text-success',
          )}>
            {Number(booking.balance_amount) > 0
              ? `ค้าง ฿${Number(booking.balance_amount).toLocaleString()}`
              : 'ชำระแล้ว'}
          </p>
        )}

        <div className="mt-1.5">
          <Badge
            variant={statusBadgeVariant(booking.status)}
            className="text-[10px] px-1.5 py-0"
          >
            {booking.status}
          </Badge>
        </div>
      </TooltipContent>
    </Tooltip>
  )
})

export default BookingBlock
