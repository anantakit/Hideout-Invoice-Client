import { useState } from 'react'
import { isBefore, startOfDay, parseISO } from 'date-fns'
import { CheckCircle2, X, Loader2, CalendarClock, ArrowRightLeft, LogOut } from 'lucide-react'
import { cn, fmtShortISO } from '@/shared/utils'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { formatThaiDate, formatTHB } from '@/shared/utils'
import { useCancelStay, useCheckoutRooms } from '../../hooks'
import { EarlyCheckoutDialog } from './EarlyCheckoutDialog'
import { CancelStayDialog } from './CancelStayDialog'
import { ExtendStaySheet } from './ExtendStaySheet'
import { CheckoutStayDialog } from './CheckoutStayDialog'
import { TransferRoomSheet } from './TransferRoomSheet'
import {
  stayStatusVariant,
  calcNights,
  isCheckInToday,
  isCheckInOverdue,
} from '../../shared/utils/bookingStatusHelpers'
import type { RoomStayResponse, BookingResponse } from '../../types'
import { getStatusLabel } from '../../types'

export function StayCardOperational({
  bookingId,
  stay,
  booking,
}: {
  bookingId: string
  stay: RoomStayResponse
  booking?: BookingResponse
}) {
  const [openDialog, setOpenDialog] = useState<'cancel' | 'extend' | 'checkout' | 'transfer' | 'earlyCheckout' | null>(null)

  const cancel = useCancelStay(bookingId)
  const checkout = useCheckoutRooms(bookingId)

  const nights = calcNights(stay.check_in, stay.check_out)

  const isActive = stay.status === 'RESERVED' || stay.status === 'ASSIGNED'
  const isCheckedIn = stay.status === 'CHECKED_IN'
  const canExtend = isActive || isCheckedIn
  const canTransfer = (isCheckedIn || stay.status === 'ASSIGNED') && Boolean(stay.room_id)
  const canEarlyCheckout = isCheckedIn && isBefore(startOfDay(new Date()), startOfDay(parseISO(stay.check_out)))
  const showTodayBadge = isActive && isCheckInToday(stay.check_in)
  const showOverdueBadge = isActive && isCheckInOverdue(stay.check_in)

  return (
    <Card className={cn(showOverdueBadge && 'border-destructive/40')}>
      <CardContent className="px-4 py-3 space-y-3">

        {/* ── Header row ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {stay.room_number && (
              <span className="text-room-number">{stay.room_number}</span>
            )}
            <div>
              <p className="text-body font-medium">{stay.room_type_name}</p>
              <p className={cn(
                'text-helper',
                showOverdueBadge ? 'text-destructive' : '',
              )}>
                {fmtShortISO(stay.check_in)} → {fmtShortISO(stay.check_out)} · {nights} คืน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
            {showOverdueBadge && <Badge variant="red">เกินกำหนด</Badge>}
            {showTodayBadge && !showOverdueBadge && <Badge variant="amber">วันนี้</Badge>}
            <Badge variant={stayStatusVariant(stay.status)}>
              {getStatusLabel(stay.status)}
            </Badge>
          </div>
        </div>

        {/* ── Price info ──────────────────────────────────────────────────── */}
        {stay.price_per_night > 0 && (
          <p className="text-helper text-muted-foreground">
            {stay.charged_price_per_night != null && stay.charged_price_per_night < stay.price_per_night ? (
              <>
                <span className="line-through">{formatTHB(stay.price_per_night)}</span>
                {' → '}
                <span className="text-primary font-medium">{formatTHB(stay.charged_price_per_night)}</span>
                /คืน · {formatTHB(stay.charged_price_per_night * nights)}
              </>
            ) : (
              <>
                {formatTHB(stay.charged_price_per_night ?? stay.price_per_night)}/คืน · {formatTHB((stay.charged_price_per_night ?? stay.price_per_night) * nights)}
              </>
            )}
          </p>
        )}

        {/* ── Transfer origin indicator ────────────────────────────────────── */}
        {stay.transfer_from_stay_id && (
          <p className="text-micro text-info flex items-center gap-1">
            <ArrowRightLeft className="w-3 h-3" />
            ย้ายมาจากห้องอื่น
          </p>
        )}

        {/* ── Early checkout indicator ──────────────────────────────────── */}
        {stay.status === 'CHECKED_OUT' && stay.checked_out_at && (() => {
          const actualCheckOut = stay.checked_out_at!.slice(0, 10)
          const originalCheckOut = stay.check_out.slice(0, 10)
          if (actualCheckOut >= originalCheckOut) return null
          const origNights = calcNights(stay.check_in, originalCheckOut)
          const actualNights = calcNights(stay.check_in, actualCheckOut)
          return (
            <div className="rounded-lg border border-success/30 bg-success/5 p-2.5">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-success mt-0.5" />
                <div className="min-w-0">
                  <p className="text-micro font-semibold text-success">
                    เช็คเอาท์ก่อนกำหนด
                  </p>
                  <p className="text-micro text-muted-foreground mt-0.5">
                    <span className="line-through">{formatThaiDate(originalCheckOut)}</span>
                    {' → '}
                    <span className="font-semibold text-foreground">{formatThaiDate(actualCheckOut)}</span>
                    {' '}(ลดจาก {origNights} เหลือ {actualNights} คืน)
                  </p>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── Action buttons ──────────────────────────────────────────────── */}
        {(isActive || canExtend) && (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {isCheckedIn && (
              <Button
                variant="default"
                size="sm"
                disabled={checkout.isPending}
                onClick={() => setOpenDialog(canEarlyCheckout ? 'earlyCheckout' : 'checkout')}
              >
                {checkout.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4 mr-1.5" />
                )}
                เช็คเอาท์
              </Button>
            )}
            {canTransfer && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenDialog('transfer')}
              >
                <ArrowRightLeft className="w-4 h-4 mr-1.5" />
                ย้ายห้อง
              </Button>
            )}
            {canExtend && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setOpenDialog('extend')}
              >
                <CalendarClock className="w-4 h-4 mr-1.5" />
                ขยายเวลา
              </Button>
            )}
            {isActive && (
              <Button
                variant="ghost"
                size="sm"
                disabled={cancel.isPending}
                className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                onClick={() => setOpenDialog('cancel')}
              >
                {cancel.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <X className="w-4 h-4 mr-1.5" />
                )}
                ยกเลิก
              </Button>
            )}
          </div>
        )}

      </CardContent>

      {/* ── Operation dialogs/sheets ────────────────────────────────────── */}
      <CancelStayDialog
        open={openDialog === 'cancel'}
        onOpenChange={(open) => setOpenDialog(open ? 'cancel' : null)}
        bookingId={bookingId}
        stay={stay}
      />

      <ExtendStaySheet
        open={openDialog === 'extend'}
        onOpenChange={(open) => setOpenDialog(open ? 'extend' : null)}
        bookingId={bookingId}
        stay={stay}
      />

      <CheckoutStayDialog
        open={openDialog === 'checkout'}
        onOpenChange={(open) => setOpenDialog(open ? 'checkout' : null)}
        bookingId={bookingId}
        stay={stay}
      />

      <EarlyCheckoutDialog
        open={openDialog === 'earlyCheckout'}
        onOpenChange={(open) => setOpenDialog(open ? 'earlyCheckout' : null)}
        bookingId={bookingId}
        stay={stay}
        booking={booking}
      />

      <TransferRoomSheet
        open={openDialog === 'transfer'}
        onOpenChange={(open) => setOpenDialog(open ? 'transfer' : null)}
        bookingId={bookingId}
        stay={stay}
      />
    </Card>
  )
}
