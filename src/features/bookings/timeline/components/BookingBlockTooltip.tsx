import React from 'react'
import { differenceInDays, format, parseISO } from 'date-fns'
import {
  Users,
  Clock,
  ArrowRightLeft,
  CheckCircle2,
} from 'lucide-react'
import { cn, formatCompactNumber } from '@/shared/utils'
import { Badge } from '@/shared/ui/badge'
import { Separator } from '@/shared/ui/separator'
import { type TimelineBooking, getStatusLabel } from '../../types'
import { bookingStatusVariant } from '../../booking-detail/utils/bookingStatusHelpers'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  try {
    return format(parseISO(iso), 'MMM d')
  } catch {
    return iso
  }
}

const SOURCE_LABEL: Record<string, string> = {
  walk_in: 'Walk-in',
  advance: 'จองล่วงหน้า',
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface BookingBlockTooltipProps {
  booking: TimelineBooking
  roomNumber: string
  roomCount: number
  isUpcoming: boolean
  isMultiRoom: boolean
}

// ── Component ────────────────────────────────────────────────────────────────

function BookingBlockTooltip({
  booking,
  roomNumber,
  roomCount,
  isUpcoming,
  isMultiRoom,
}: BookingBlockTooltipProps) {
  return (
    <>
      <p className="font-semibold text-foreground leading-snug">
        {booking.guest_name}
      </p>

      <p className="text-micro text-muted-foreground/70 font-mono mt-0.5">
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
          (
          {differenceInDays(
            parseISO(booking.check_out),
            parseISO(booking.check_in),
          )}{' '}
          คืน)
        </span>
      </p>

      {booking.source && (
        <p className="text-micro text-muted-foreground/70 mt-0.5">
          ช่องทาง: {SOURCE_LABEL[booking.source] ?? booking.source}
        </p>
      )}

      {booking.transfer_from_stay_id && (
        <p className="text-micro text-info mt-0.5 flex items-center gap-1">
          <ArrowRightLeft className="w-3 h-3" />
          ย้ายมาจากห้องอื่น
        </p>
      )}

      {booking.early_checkout && (
        <p className="text-micro text-success mt-0.5 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          เช็คเอาท์ก่อนกำหนด
        </p>
      )}

      {isUpcoming && (
        <p className="text-helper text-primary/70 flex items-center gap-1 mt-0.5">
          <Clock className="w-3 h-3" />
          จะมาถึง
        </p>
      )}

      {!isUpcoming && (
        <p
          className={cn(
            'text-helper mt-0.5',
            Number(booking.balance_amount) > 0
              ? 'text-destructive'
              : 'text-success',
          )}
        >
          {Number(booking.balance_amount) > 0
            ? `ค้าง ฿${formatCompactNumber(Number(booking.balance_amount))}`
            : 'ชำระแล้ว'}
        </p>
      )}

      <div className="mt-1.5">
        <Badge
          variant={bookingStatusVariant(booking.status)}
          className="text-micro px-1.5 py-0"
        >
          {getStatusLabel(booking.status)}
        </Badge>
      </div>

      <p className="text-micro text-muted-foreground/50 mt-1.5">
        คลิกขวาเพื่อดูเมนู
      </p>
    </>
  )
}

export default React.memo(BookingBlockTooltip)
