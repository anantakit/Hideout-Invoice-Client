import React from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import { cn, fmtShortISO, formatTHBCurrency } from '@/shared/utils'
import { Badge } from '@/shared/ui/badge'
import { STATUS_CFG, type RoomEntry } from '../utils/classifyRooms'

export const RoomCard = React.memo(function RoomCard({
  entry,
  onTap,
}: {
  entry: RoomEntry
  onTap: (entry: RoomEntry) => void
}) {
  const cfg = STATUS_CFG[entry.status]
  const isInteractive = entry.status !== 'maintenance'
    && entry.status !== 'range_available'
    && entry.status !== 'range_occupied'
  const hasBalance = (entry.balance ?? 0) > 0
  const hasGuest = entry.status !== 'available' && entry.status !== 'maintenance'
    && entry.status !== 'range_available' && entry.status !== 'range_occupied'

  const isSimple = entry.status === 'available' || entry.status === 'maintenance'
    || entry.status === 'range_available' || entry.status === 'range_occupied'

  const cardClasses = cn(
    'w-full px-3',
    isSimple ? 'py-1.5' : 'py-2.5',
    cfg.cardClass,
  )

  const checkoutHasBalance = (entry.checkoutBalance ?? 0) > 0

  const cardBody = (
    <div className="flex items-center gap-3">
      {/* Left: room number */}
      <div className="shrink-0 w-10">
        <span className="text-room-number">
          {entry.room.room_number}
        </span>
      </div>

      {/* Center: type + guest info */}
      <div className="flex-1 min-w-0">
        <span className="text-helper leading-none">
          {entry.typeName}
        </span>
        {entry.status === 'turnover' ? (
          <div className="mt-0.5 space-y-0 text-helper leading-tight">
            <p className="text-warning truncate">
              ออก: {entry.checkoutGuestName}
              {checkoutHasBalance && (
                <span className="text-destructive font-medium ml-1">
                  {formatTHBCurrency(entry.checkoutBalance!)}
                </span>
              )}
            </p>
            <p className="text-primary truncate">เข้า: {entry.guestName}</p>
          </div>
        ) : hasGuest && (
          <div className="flex items-center gap-1 mt-0.5 text-helper leading-tight">
            {entry.guestName && <span className="truncate">{entry.guestName}</span>}
            {entry.booking && (
              <>
                {entry.guestName && <span>·</span>}
                <span className="shrink-0">
                  ออก {fmtShortISO(entry.booking.check_out)}
                  {' '}({differenceInDays(parseISO(entry.booking.check_out), parseISO(entry.booking.check_in))} คืน)
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right: balance + badge */}
      <div className="shrink-0 flex flex-col items-end gap-0.5">
        <Badge variant={cfg.badge} className="text-helper px-2 py-0 leading-relaxed">
          {cfg.label}
        </Badge>
        {hasBalance && (
          <span className="text-helper text-destructive font-medium tabular-nums">
            ค้าง {formatTHBCurrency(entry.balance!)}
          </span>
        )}
      </div>
    </div>
  )

  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={() => onTap(entry)}
        className={cn(cardClasses, 'text-left active:bg-muted/60 transition-colors')}
      >
        {cardBody}
      </button>
    )
  }

  return <div className={cardClasses}>{cardBody}</div>
})
