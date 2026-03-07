import React, { type CSSProperties } from 'react'
import { format, parseISO } from 'date-fns'
import { Users, Clock } from 'lucide-react'
import { cn } from '@/shared/utils'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/ui/tooltip'
import { Badge } from '@/shared/ui/badge'
import { Separator } from '@/shared/ui/separator'
import type { TimelineBooking } from '../../types'

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

// ─── BookingBlock ─────────────────────────────────────────────────────────────

export interface BookingBlockProps {
  booking: TimelineBooking
  roomNumber: string
  roomCount: number
  offsetDays: number
  spanDays: number
  colorClass: string
  isHighlighted: boolean | null
  /** True when check_in is in the future (not yet occupied). */
  isUpcoming?: boolean
  /** True when the checkout date falls within the visible timeline window. */
  showCheckoutEdge?: boolean
  onHoverStart: () => void
  onHoverEnd: () => void
  onTap: (booking: TimelineBooking) => void
}

const BookingBlock = React.memo(function BookingBlock({
  booking,
  roomNumber,
  roomCount,
  offsetDays,
  spanDays,
  colorClass,
  isHighlighted,
  isUpcoming = false,
  showCheckoutEdge = false,
  onHoverStart,
  onHoverEnd,
  onTap,
}: BookingBlockProps) {
  const positionVars = {
    '--tl-offset': offsetDays,
    '--tl-span':   spanDays,
  } as CSSProperties

  const isMultiRoom = roomCount > 1

  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'tl-booking-block',
            'absolute inset-y-[3px]',
            // Card shape
            'rounded-md border overflow-hidden',
            // Layout
            'flex items-center px-2 gap-1.5',
            'cursor-pointer select-none',
            // Hover & highlight transitions
            'transition-[opacity,box-shadow,filter] duration-150',
            // ── Upcoming vs active styling ──
            isUpcoming
              ? [
                  'border-dashed border-border bg-muted/40 text-muted-foreground',
                  isHighlighted === null  && 'opacity-70 hover:opacity-90 hover:shadow-md',
                  isHighlighted === true  && 'opacity-90 shadow-md ring-2 ring-inset ring-primary/30',
                  isHighlighted === false && 'opacity-20',
                ]
              : [
                  'border-current/15 shadow-card',
                  colorClass,
                  isHighlighted === null  && 'opacity-95 hover:opacity-100 hover:shadow-md',
                  isHighlighted === true  && 'opacity-100 shadow-md ring-2 ring-inset ring-current/30',
                  isHighlighted === false && 'opacity-25',
                ],
          )}
          style={positionVars}
          onMouseEnter={onHoverStart}
          onMouseLeave={onHoverEnd}
          onClick={() => onTap(booking)}
          aria-label={`${booking.guest_name} — ห้อง ${roomNumber}`}
        >
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
