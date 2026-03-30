import React, { type CSSProperties, useMemo } from 'react'
import {
  TIMELINE_BLOCK_HEIGHT_PX,
  TIMELINE_BLOCK_GAP_PX,
  TIMELINE_BLOCK_PADDING_PX,
} from '../utils/tokens'
import { cn, todayISO } from '@/shared/utils'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/ui/tooltip'
import type { TimelineBooking } from '@/features/bookings/types'
import { useHoveredBookingId, useBookingHoverHandlers } from './HoverContext'
import { useBookingBlockDrag } from '../hooks/useBookingBlockDrag'
import BookingBlockContent from './BookingBlockContent'
import BookingBlockTooltip from './BookingBlockTooltip'

// ── Props ────────────────────────────────────────────────────────────────────

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
}

// ── Component ────────────────────────────────────────────────────────────────

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
}: BookingBlockProps) {
  const hoveredBookingId = useHoveredBookingId()
  const { onHoverStart, onHoverEnd } = useBookingHoverHandlers()

  const isHighlighted: boolean | null =
    hoveredBookingId === null
      ? null
      : hoveredBookingId === booking.booking_id
  const isMultiLayer = totalLayers > 1
  const isMultiRoom = roomCount > 1
  const status = booking.status

  const {
    isDraggable,
    isBeingDragged,
    handleClick,
    handleDoubleClick,
    handleKeyDown,
    handlePointerDown,
    handleResizeLeftDown,
    handleResizeRightDown,
    handleContextMenu,
  } = useBookingBlockDrag({ booking, roomId, roomNumber })

  const positionStyle = useMemo<CSSProperties>(() => {
    const base = {
      '--tl-offset': offsetDays,
      '--tl-span': spanDays,
    } as CSSProperties

    if (!isMultiLayer) {
      return { ...base, top: '4px', bottom: '4px' }
    }

    const top =
      TIMELINE_BLOCK_PADDING_PX +
      layerIndex * (TIMELINE_BLOCK_HEIGHT_PX + TIMELINE_BLOCK_GAP_PX)
    return { ...base, top: `${top}px`, height: `${TIMELINE_BLOCK_HEIGHT_PX}px` }
  }, [offsetDays, spanDays, isMultiLayer, layerIndex])

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <button
          type="button"
          tabIndex={0}
          data-stay-status={status}
          className={cn(
            'tl-booking-block',
            'absolute',
            'min-h-10',
            'rounded-lg border overflow-hidden',
            'flex items-center px-2.5 py-1.5 gap-1',
            'select-none',
            'transition-[opacity,box-shadow,filter,transform] duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
            isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
            isBeingDragged && 'opacity-30 pointer-events-none',
            'group/block',
            !isBeingDragged && (
              status === 'CANCELLED'
                ? [
                    'border-dashed border-muted-foreground/30 bk-block text-muted-foreground opacity-40',
                    isHighlighted === true  && 'opacity-55! ring-1 ring-inset ring-muted-foreground/20',
                    isHighlighted === false && 'opacity-10!',
                  ]
                : status === 'CHECKED_OUT'
                  ? [
                      colorClass,
                      'opacity-40',
                      isHighlighted === true  && 'opacity-55! ring-1 ring-inset ring-foreground/15',
                      isHighlighted === false && 'opacity-10!',
                    ]
                  : isUpcoming
                    ? [
                        'border-dashed bk-block border-bk-reserved/40 bk-accent-reserved text-foreground',
                        isHighlighted === null  && 'opacity-65 hover:opacity-85 hover:shadow-md',
                        isHighlighted === true  && 'opacity-90 shadow-md ring-2 ring-inset ring-bk-reserved/40',
                        isHighlighted === false && 'opacity-10!',
                      ]
                    : [
                        colorClass,
                        isHighlighted === null  && 'hover:shadow-md hover:brightness-105',
                        isHighlighted === true  && 'shadow-md ring-2 ring-inset ring-foreground/25',
                        isHighlighted === false && 'opacity-10!',
                      ]
            ),
            !isBeingDragged && !isUpcoming && status !== 'CANCELLED' && status !== 'CHECKED_OUT' &&
              isHighlighted !== false &&
              booking.check_out.slice(0, 10) <= todayISO() && 'opacity-50',
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
          <BookingBlockContent
            booking={booking}
            roomCount={roomCount}
            isUpcoming={isUpcoming}
            isDraggable={isDraggable}
            isBeingDragged={isBeingDragged}
            isMultiRoom={isMultiRoom}
            onResizeLeftDown={handleResizeLeftDown}
            onResizeRightDown={handleResizeRightDown}
            showCheckoutEdge={showCheckoutEdge}
          />
        </button>
      </TooltipTrigger>

      <TooltipContent side="top" className="max-w-55">
        <BookingBlockTooltip
          booking={booking}
          roomNumber={roomNumber}
          roomCount={roomCount}
          isUpcoming={isUpcoming}
          isMultiRoom={isMultiRoom}
        />
      </TooltipContent>
    </Tooltip>
  )
})

export default BookingBlock
