import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { differenceInDays, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import {
  X, DoorOpen, CheckCircle2, CircleAlert, ChevronRight,
  LogOut, Banknote, FileText, Loader2, CalendarDays,
} from 'lucide-react'
import { cn, fmtThaiDate, fmtShortISO, formatTHBCurrency, todayISO } from '@/shared/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { ConfirmActionCard } from '@/shared/ui/confirm-action-card'
import { type TimelineBooking, getStatusLabel } from '../../types'
import { bookingStatusVariant } from '../../booking-detail/utils/bookingStatusHelpers'
import { useBooking, useCheckoutRooms } from '../../hooks'
import { InlineCheckIn } from '../../shared/components/InlineCheckIn'
import { DepositBadge } from '../../shared/components/DepositBadge'
import type { SelectedBookingContext } from './OperationsDrawer'
import { CheckoutAllButton } from './CheckoutAllButton'

// ── Types ────────────────────────────────────────────────────────────────────

interface BookingDetailContentProps {
  selected: SelectedBookingContext
  onClose: () => void
  onOpenDetail?: (booking: TimelineBooking) => void
}

// ── Component ────────────────────────────────────────────────────────────────

export function BookingDetailContent({
  selected,
  onClose,
  onOpenDetail,
}: BookingDetailContentProps) {
  const navigate = useNavigate()
  const { booking, roomNumbers } = selected
  const hasBalance = Number(booking.balance_amount) > 0
  const nights = differenceInDays(parseISO(booking.check_out), parseISO(booking.check_in))
  const status = booking.status

  // Always fetch full booking for deposit info, check-in & checkout actions
  const canCheckOut = status === 'CHECKED_IN' || status === 'PARTIALLY_CHECKED_IN'
  const { data: fullBooking } = useBooking(booking.booking_id)

  const todayDate = todayISO()
  const pendingStays = useMemo(() => {
    if (!fullBooking) return []
    return fullBooking.room_stays.filter(
      (s) =>
        (s.status === 'RESERVED' || s.status === 'ASSIGNED') &&
        s.check_in.slice(0, 10) <= todayDate,
    )
  }, [fullBooking, todayDate])

  // Per-stay checkout — only show stays whose scheduled checkout is today or past
  const checkedInStays = useMemo(() => {
    if (!fullBooking) return []
    return fullBooking.room_stays.filter(
      (s) => s.status === 'CHECKED_IN' && s.check_out.slice(0, 10) <= todayDate,
    )
  }, [fullBooking, todayDate])

  const checkoutMutation = useCheckoutRooms(booking.booking_id)

  const isTerminal = status === 'CHECKED_OUT' || status === 'CANCELLED'

  const handleOpenDetail = () => {
    if (onOpenDetail) {
      onOpenDetail(booking)
    } else {
      navigate(`/bookings/${booking.booking_id}`)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-3 border-b border-border-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base font-semibold text-foreground truncate">
              {booking.guest_name}
            </span>
            <Badge variant={bookingStatusVariant(booking.status)} className="shrink-0">
              {getStatusLabel(booking.status)}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 shrink-0" aria-label="ปิด">
            <X size={16} />
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <CalendarDays size={12} className="shrink-0" />
          {fmtThaiDate(booking.check_in)} → {fmtThaiDate(booking.check_out)}
          <span>· {nights} คืน</span>
          {booking.source && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto">
              {booking.source === 'walk_in' ? 'วอล์คอิน' : 'จองล่วงหน้า'}
            </Badge>
          )}
        </div>
      </div>

      {/* ── Scrollable content ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* Section 1: Rooms */}
        {roomNumbers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <DoorOpen size={14} />
                {roomNumbers.length > 1 ? `${roomNumbers.length} ห้อง` : 'ห้องพัก'}
              </p>
              {fullBooking && <DepositBadge booking={fullBooking} />}
            </div>
            <div className="flex flex-wrap gap-2">
              {roomNumbers.map((rn) => (
                <div key={rn} className="radius-card border border-border bg-card px-3 py-1.5 text-sm font-bold tabular-nums text-center min-w-12">
                  {rn}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Balance — prominent when outstanding */}
        <div className={cn(
          'rounded-lg p-3 flex items-center justify-between',
          hasBalance
            ? 'bg-warning/10 border border-warning/30'
            : 'bg-muted/50',
        )}>
          <span className="text-sm text-muted-foreground">ยอดค้างชำระ</span>
          {hasBalance ? (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-warning">
              <CircleAlert size={14} />
              {formatTHBCurrency(Number(booking.balance_amount))}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm font-medium text-success">
              <CheckCircle2 size={14} />
              ชำระแล้ว
            </span>
          )}
        </div>

        {/* Inline check-in */}
        {pendingStays.length > 0 && (
          <InlineCheckIn bookingId={booking.booking_id} pendingStays={pendingStays} compact />
        )}

        {/* Checkout section — matches InlineCheckIn compact layout */}
        {canCheckOut && checkedInStays.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <LogOut className="w-3.5 h-3.5" />
                เช็คเอาท์{checkedInStays.length > 1 ? ` ${checkedInStays.length} ห้อง` : ''}
              </p>
              {checkedInStays.length > 1 && (
                <CheckoutAllButton
                  guestName={booking.guest_name}
                  stays={checkedInStays}
                  checkoutMutation={checkoutMutation}
                />
              )}
            </div>
            {checkedInStays.map((stay) => (
              <ConfirmActionCard
                key={stay.id}
                disabled={checkoutMutation.isPending}
                loading={checkoutMutation.isPending}
                loader={<Loader2 size={14} className="animate-spin text-muted-foreground" />}
                icon={<LogOut size={14} className="text-warning" />}
                confirmTitle="ยืนยันเช็คเอาท์"
                confirmDescription={`เช็คเอาท์ ${booking.guest_name} ห้อง ${stay.room_number} ?`}
                confirmLabel="เช็คเอาท์"
                onConfirm={() => {
                  checkoutMutation.mutate([stay.id], {
                    onSuccess: () => toast.success(`เช็คเอาท์ ห้อง ${stay.room_number} สำเร็จ`),
                    onError: (err: Error) => toast.error(err.message || 'เกิดข้อผิดพลาด'),
                  })
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">ห้อง {stay.room_number}</span>
                  <span className="text-xs text-muted-foreground">{stay.room_type_name}</span>
                </div>
                <p className="text-micro-sm text-muted-foreground mt-0.5">
                  {fmtShortISO(stay.check_in)} → {fmtShortISO(stay.check_out)} · {differenceInDays(parseISO(stay.check_out), parseISO(stay.check_in))} คืน
                </p>
              </ConfirmActionCard>
            ))}
          </div>
        )}
      </div>

      {/* ── Sticky footer ──────────────────────────────────────────── */}
      <div className="shrink-0 p-3 border-t border-border-soft space-y-2">
        {/* Primary CTA: payment if balance, receipt if terminal */}
        {hasBalance && !isTerminal && (
          <Button className="w-full gap-1.5" onClick={handleOpenDetail}>
            <Banknote size={16} />
            รับชำระเงิน
          </Button>
        )}
        {isTerminal && (
          <Button className="w-full gap-1.5" onClick={handleOpenDetail}>
            <FileText size={16} />
            ดูใบเสร็จ
          </Button>
        )}
        {/* Detail — primary when no other CTA above, outline otherwise */}
        <Button
          className="w-full gap-1.5"
          variant={hasBalance || isTerminal ? 'outline' : 'default'}
          onClick={handleOpenDetail}
        >
          เปิดรายละเอียด
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  )
}
