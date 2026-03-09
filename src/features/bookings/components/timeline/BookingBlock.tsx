import React, { type CSSProperties, useCallback, useMemo, useRef } from 'react'
import { differenceInDays, format, parseISO, startOfDay } from 'date-fns'
import { Users, Clock, Footprints, CalendarCheck } from 'lucide-react'
import {
  TIMELINE_BLOCK_HEIGHT_PX,
  TIMELINE_BLOCK_GAP_PX,
  TIMELINE_BLOCK_PADDING_PX,
} from './tokens'
import { cn } from '@/shared/utils'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/ui/tooltip'
import { Badge } from '@/shared/ui/badge'
import { Separator } from '@/shared/ui/separator'
import { type TimelineBooking, getStatusLabel } from '../../types'
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

const SOURCE_LABEL: Record<string, string> = {
  walk_in: 'Walk-in',
  advance: 'จองล่วงหน้า',
}

const SOURCE_ICON: Record<string, React.ElementType> = {
  walk_in:  Footprints,
  advance:  CalendarCheck,
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
  /** Called on double-click — opens full booking detail page. */
  onDoubleTap?: (booking: TimelineBooking) => void
  /** Called when user starts a drag or resize. */
  onDragStart?: (
    e: React.PointerEvent,
    booking: TimelineBooking,
    roomId: string,
    mode: DragMode,
  ) => void
  /** Current drag state — used to dim the source block while dragging. */
  dragState?: DragState | null
  /** Called to open context menu at a given position. */
  onContextMenu?: (
    booking: TimelineBooking,
    roomId: string,
    roomNumber: string,
    x: number,
    y: number,
  ) => void
  /** Keyboard: move booking by 1 day or 1 room. */
  onKeyboardMove?: (booking: TimelineBooking, roomId: string, direction: 'left' | 'right' | 'up' | 'down') => void
  /** Keyboard: extend/shrink stay by 1 night. */
  onKeyboardResize?: (booking: TimelineBooking, roomId: string, edge: 'extend' | 'shrink') => void
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
  onDoubleTap,
  onDragStart,
  dragState,
  onContextMenu,
  onKeyboardMove,
  onKeyboardResize,
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
  const status = booking.status

  // ── Click vs double-click discrimination ──────────────────────────────
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClick = useCallback(() => {
    if (isBeingDragged) return
    if (onDoubleTap) {
      // If there's a double-click handler, delay single click to distinguish
      if (clickTimerRef.current) return // second click pending — ignore
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null
        onTap(booking)
      }, 250)
    } else {
      onTap(booking)
    }
  }, [isBeingDragged, onTap, onDoubleTap, booking])

  const handleDoubleClick = useCallback(() => {
    if (isBeingDragged) return
    // Cancel pending single-click
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
    }
    onDoubleTap?.(booking)
  }, [isBeingDragged, onDoubleTap, booking])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onTap(booking)
    }
    // Shift+F10 opens context menu (standard keyboard shortcut)
    if (e.key === 'F10' && e.shiftKey && onContextMenu) {
      e.preventDefault()
      const rect = (e.target as HTMLElement).getBoundingClientRect()
      onContextMenu(booking, roomId, roomNumber, rect.left + rect.width / 2, rect.top + rect.height / 2)
    }
    // Arrow keys: move booking (Shift+Arrow = extend/shrink stay)
    if (isDraggable && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault()
      if (e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        onKeyboardResize?.(booking, roomId, e.key === 'ArrowRight' ? 'extend' : 'shrink')
      } else {
        const dir = e.key === 'ArrowLeft' ? 'left' : e.key === 'ArrowRight' ? 'right' : e.key === 'ArrowUp' ? 'up' : 'down'
        onKeyboardMove?.(booking, roomId, dir)
      }
    }
  }, [onTap, booking, onContextMenu, roomId, roomNumber, isDraggable, onKeyboardMove, onKeyboardResize])

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

  // ── Context menu handler ───────────────────────────────────────────────

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!onContextMenu) return
      e.preventDefault()
      e.stopPropagation()
      onContextMenu(booking, roomId, roomNumber, e.clientX, e.clientY)
    },
    [onContextMenu, booking, roomId, roomNumber],
  )

  return (
    <Tooltip delayDuration={300}>
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
            // Cursor & touch
            isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
            // Dragging state — dim the source block
            isBeingDragged && 'opacity-30 pointer-events-none',
            // Group for resize handle hover
            'group/block',
            // ── Status-based visual styling ──
            !isBeingDragged && (
              status === 'CANCELLED'
                ? [
                    // Cancelled: transparent bg, dashed border, faded
                    'border-dashed border-bk-cancelled/40 bg-transparent text-bk-cancelled-foreground opacity-50',
                    isHighlighted === true  && 'opacity-70 ring-1 ring-inset ring-bk-cancelled/30',
                    isHighlighted === false && 'opacity-15',
                  ]
                : status === 'CHECKED_OUT'
                  ? [
                      // Checked-out: same color but reduced opacity
                      'border-transparent shadow-card',
                      colorClass,
                      'opacity-45',
                      isHighlighted === true  && '!opacity-65 ring-1 ring-inset ring-foreground/20',
                      isHighlighted === false && '!opacity-15',
                    ]
                  : isUpcoming
                    ? [
                        // Upcoming / reserved: dashed border, muted
                        'border-dashed border-bk-reserved/40 bg-bk-reserved/15 text-bk-reserved-foreground/80',
                        isHighlighted === null  && 'opacity-80 hover:opacity-95 hover:shadow-md hover:brightness-105',
                        isHighlighted === true  && 'opacity-95 shadow-md ring-2 ring-inset ring-primary/30',
                        isHighlighted === false && 'opacity-20',
                      ]
                    : [
                        // Active bookings (checked-in, confirmed, etc)
                        'border-transparent shadow-card',
                        colorClass,
                        isHighlighted === null  && 'hover:shadow-md hover:brightness-105',
                        isHighlighted === true  && 'shadow-md ring-2 ring-inset ring-foreground/30',
                        isHighlighted === false && 'opacity-25',
                      ]
            ),
            // Past bookings fade
            !isBeingDragged && !isUpcoming && status !== 'CANCELLED' && status !== 'CHECKED_OUT' &&
              booking.check_out <= format(startOfDay(new Date()), 'yyyy-MM-dd') && 'opacity-60',
          )}
          style={positionStyle}
          onMouseEnter={() => onHoverStart(booking.booking_id)}
          onMouseLeave={onHoverEnd}
          onFocus={() => onHoverStart(booking.booking_id)}
          onBlur={onHoverEnd}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onContextMenu={handleContextMenu}
          aria-label={`${booking.guest_name} — ห้อง ${roomNumber}`}
        >
          {/* Resize handle — left edge (stays inside block to avoid blocking adjacent cells) */}
          {isDraggable && !isBeingDragged && (
            <div
              className="absolute left-0 inset-y-0 w-3 cursor-col-resize opacity-0 group-hover/block:opacity-100 transition-opacity z-10 flex items-center justify-center"
              onPointerDown={handleResizeLeftDown}
            >
              <div className="flex gap-px">
                <div className="w-[2px] h-5 rounded-full bg-foreground/40" />
                <div className="w-[2px] h-5 rounded-full bg-foreground/40" />
              </div>
            </div>
          )}

          {/* Resize handle — right edge (stays inside block to avoid blocking adjacent cells) */}
          {isDraggable && !isBeingDragged && (
            <div
              className="absolute right-0 inset-y-0 w-3 cursor-col-resize opacity-0 group-hover/block:opacity-100 transition-opacity z-10 flex items-center justify-center"
              onPointerDown={handleResizeRightDown}
            >
              <div className="flex gap-px">
                <div className="w-[2px] h-5 rounded-full bg-foreground/40" />
                <div className="w-[2px] h-5 rounded-full bg-foreground/40" />
              </div>
            </div>
          )}



          {/* Left accent bar for multi-room bookings */}
          {isMultiRoom && (
            <div className={cn(
              'absolute left-0 inset-y-0 w-[3px]',
              isUpcoming ? 'bg-primary/30' : 'bg-foreground/20',
            )} />
          )}

          {/* Right edge checkout indicator */}
          {showCheckoutEdge && !isUpcoming && (
            <div className="absolute right-0 inset-y-0 w-[3px] bg-foreground/30 rounded-r-sm" />
          )}

          {/* Clock icon for upcoming */}
          {isUpcoming && (
            <Clock className="w-3 h-3 shrink-0 text-muted-foreground/60" />
          )}

          {/* Top-right indicators: payment dot + source icon */}
          {!isUpcoming && (
            <div className="absolute top-0.5 right-1 flex items-center gap-1">
              {(() => {
                const SourceIcon = SOURCE_ICON[booking.source]
                return SourceIcon ? <SourceIcon className="w-2.5 h-2.5 opacity-60" /> : null
              })()}
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  Number(booking.balance_amount) > 0
                    ? 'bg-foreground/80 ring-1 ring-destructive'
                    : 'bg-foreground/30',
                )}
              />
            </div>
          )}

          {/* Content */}
          <div className={cn('flex flex-col min-w-0 flex-1', isMultiRoom && !isUpcoming && 'pl-1')}>
            <span className="truncate text-[11px] font-bold leading-tight drop-shadow-sm">
              {booking.guest_name}
            </span>
            {spanDays >= 2 && (
              isUpcoming ? (
                <span className="truncate text-[10px] leading-tight opacity-70">
                  Check-in {fmtDate(booking.check_in)}
                </span>
              ) : isMultiRoom ? (
                <span className="flex items-center gap-0.5 text-[10px] leading-tight opacity-80">
                  <Users className="w-2.5 h-2.5 shrink-0" />
                  {roomCount} ห้อง
                </span>
              ) : (
                <span className="truncate text-[10px] leading-tight opacity-75">
                  {fmtDate(booking.check_in)} – {fmtDate(booking.check_out)}
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
          <span className="ml-1 opacity-70">
            ({differenceInDays(parseISO(booking.check_out), parseISO(booking.check_in))} คืน)
          </span>
        </p>

        {booking.source && (
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
            ช่องทาง: {SOURCE_LABEL[booking.source] ?? booking.source}
          </p>
        )}

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
            {getStatusLabel(booking.status)}
          </Badge>
        </div>

        <p className="text-[9px] text-muted-foreground/50 mt-1.5">
          คลิกขวาเพื่อดูเมนู
        </p>
      </TooltipContent>
    </Tooltip>
  )
})

export default BookingBlock
