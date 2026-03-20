import React from 'react'
import { ChevronRight, CheckCircle2, Phone, ExternalLink } from 'lucide-react'
import { cn, formatTHBCurrency } from '@/shared/utils'
import { Button } from '@/shared/ui/button'
import { CardButton } from '@/shared/ui/card-button'
import type { CheckoutBooking } from '../utils/operationTypes'

export const PendingCheckoutCard = React.memo(function PendingCheckoutCard({
  co,
  onOpen,
}: {
  co: CheckoutBooking
  onOpen: (bookingId: string) => void
}) {
  const doneCount = co.stays.filter((s) => s.status === 'CHECKED_OUT').length
  const hasBalance = co.balance > 0
  const progressPct = co.stays.length > 0 ? (doneCount / co.stays.length) * 100 : 0

  return (
    <CardButton
      variant="ghost"
      onClick={() => onOpen(co.bookingId)}
      className="border border-warning/20 bg-accent/5 active:bg-accent/10"
    >
      {/* Row 1: name + info */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-body font-semibold truncate">{co.guestName}</span>
        <span className="text-helper shrink-0">
          {co.stays.length} ห้อง · {co.nights} คืน
        </span>
      </div>

      {/* Row 2: rooms + chevron */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-helper min-w-0 truncate">
          ห้อง {co.roomNumbers.join(', ')}
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 ml-1" />
      </div>

      {/* Row 3: phone */}
      {co.booking?.guest_phone && (
        <div className="flex items-center gap-1 text-helper text-primary mt-1">
          <Phone className="w-3 h-3" />{co.booking.guest_phone}
        </div>
      )}

      {/* Row 4: balance + deposit refund */}
      {hasBalance && (
        <p className="text-helper text-destructive font-medium mt-1">
          ค้าง {formatTHBCurrency(co.balance)}
        </p>
      )}
      {co.depositStatus === 'COLLECTED' && co.keyDepositAmount > 0 && (
        <p className="text-helper text-amber-500 font-medium mt-1">
          คืนประกัน {co.keyDepositAmount.toLocaleString()}
        </p>
      )}

      {/* Row 5: progress bar (multi-room only) */}
      {co.stays.length > 1 && doneCount > 0 && (
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 h-1 radius-badge bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full radius-badge transition-all duration-300',
                doneCount === co.stays.length ? 'bg-success' : 'bg-warning',
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-helper tabular-nums shrink-0">
            {doneCount}/{co.stays.length}
          </span>
        </div>
      )}
    </CardButton>
  )
})

export const DoneCheckoutCard = React.memo(function DoneCheckoutCard({
  co,
  onNavigate,
}: {
  co: CheckoutBooking
  onNavigate: (bookingId: string) => void
}) {
  return (
    <div
      className="w-full radius-card border border-success/20 bg-success/5 px-3 py-2.5 opacity-60"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-inline min-w-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
          <span className="text-body font-semibold truncate">{co.guestName}</span>
        </div>
        <span className="text-helper text-success/80 shrink-0">เช็คเอาท์แล้ว</span>
      </div>
      {co.roomNumbers.length > 0 && (
        <p className="text-helper mt-1">ห้อง {co.roomNumbers.join(', ')}</p>
      )}
      <div className="flex items-center gap-3 mt-1">
        {co.booking?.guest_phone && (
          <a href={`tel:${co.booking.guest_phone}`} className="flex items-center gap-1 text-helper text-primary active:opacity-70">
            <Phone className="w-3 h-3" />{co.booking.guest_phone}
          </a>
        )}
        <Button variant="ghost" size="sm" onClick={() => onNavigate(co.bookingId)} className="gap-1 h-auto p-0 text-helper text-muted-foreground hover:text-foreground">
          <ExternalLink className="w-3 h-3" />รายละเอียด
        </Button>
      </div>
    </div>
  )
})
