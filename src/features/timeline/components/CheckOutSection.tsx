import { useState } from 'react'
import { ChevronDown, LogOut, CheckCircle2 } from 'lucide-react'
import { cn, formatCompactNumber } from '@/shared/utils'
import { CardButton } from '@/shared/ui/card-button'
import { Badge } from '@/shared/ui/badge'
import type { TimelineBooking } from '@/features/bookings/types'
import type { CheckoutBooking } from '../utils/operationTypes'
import { SingleRoomCheckOutCard, MultiRoomCheckOutRow, CheckOutAllButton } from './CheckOutCards'
import { DepositReturnBadge } from '@/features/bookings/shared/components/DepositBadge'

// ─── Props ────────────────────────────────────────────────────────────────────

interface CheckOutSectionProps {
  checkouts: CheckoutBooking[]
  doneCheckouts: CheckoutBooking[]
  checkoutDone: number
  checkoutTotal: number
  viewingToday: boolean
  show: boolean
  onToggle: () => void
  onDirectCheckOut?: (booking: TimelineBooking) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CheckOutSection({
  checkouts,
  doneCheckouts,
  checkoutDone,
  checkoutTotal,
  viewingToday,
  show,
  onToggle,
  onDirectCheckOut,
}: CheckOutSectionProps) {
  const [expandedCheckoutId, setExpandedCheckoutId] = useState<string | null>(null)

  if (checkouts.length === 0 && doneCheckouts.length === 0) return null

  return (
    <div className="p-4 space-y-2 border-b border-border">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
      >
        <span className="text-label text-warning flex items-center space-inline">
          <LogOut className="w-3 h-3" />
          เช็คเอาท์{viewingToday ? 'วันนี้' : ''}
          <Badge variant="amber" className="tabular-nums ml-0.5 text-micro px-1.5 py-0">
            {checkoutDone}/{checkoutTotal}
          </Badge>
        </span>
        <ChevronDown className={cn(
          'w-3.5 h-3.5 text-warning/50 transition-transform',
          show && 'rotate-180',
        )} />
      </button>

      {show && (
        <>
          {/* Pending checkouts */}
          {checkouts.map((co) => {
            const hasBalance = co.balance > 0
            const isSingleRoom = co.stays.length === 1
            const pendingStays = co.stays.filter((s) => s.status === 'CHECKED_IN')
            const doneStays = co.stays.filter((s) => s.status === 'CHECKED_OUT')
            const isExpanded = expandedCheckoutId === co.bookingId

            if (isSingleRoom) {
              const stay = co.stays[0]
              const canCheckOut = onDirectCheckOut && stay.status === 'CHECKED_IN'
              return (
                <SingleRoomCheckOutCard
                  key={co.bookingId}
                  co={co}
                  stay={stay}
                  canCheckOut={!!canCheckOut}
                  onCheckOut={() => canCheckOut && onDirectCheckOut!(stay.booking)}
                />
              )
            }

            return (
              <div key={co.bookingId}>
                <CardButton
                  onClick={() => setExpandedCheckoutId(isExpanded ? null : co.bookingId)}
                  padding="card"
                  className={cn(
                    'border',
                    isExpanded
                      ? 'border-border bg-card'
                      : 'border-border bg-card hover:bg-accent/10',
                    isExpanded && 'rounded-b-none',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-body font-semibold truncate">{co.guestName}</span>
                    <span className="text-helper shrink-0">{co.stays.length} ห้อง · {co.nights} คืน</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-helper">ห้อง {co.roomNumbers.join(', ')}</span>
                    <ChevronDown className={cn(
                      'w-3.5 h-3.5 text-muted-foreground/50 transition-transform shrink-0',
                      isExpanded && 'rotate-180',
                    )} />
                  </div>
                  {hasBalance && (
                    <p className="text-helper text-destructive font-medium mt-1">
                      ค้าง ฿{formatCompactNumber(co.balance)}
                    </p>
                  )}
                  <DepositReturnBadge booking={{ key_deposit_amount: co.keyDepositAmount, deposit_paid: co.depositPaid, deposit_status: co.depositStatus }} className="text-helper font-medium mt-0.5" />
                </CardButton>

                {isExpanded && (
                  <div className="radius-card rounded-t-none border border-t-0 border-border bg-card space-card space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-helper font-medium shrink-0">
                          เช็คเอาท์ {doneStays.length}/{co.stays.length} ห้อง
                        </span>
                        <div className="flex-1 max-w-24 h-1.5 radius-badge bg-muted overflow-hidden">
                          <div
                            className={cn(
                              'h-full radius-badge transition-all duration-300',
                              doneStays.length === co.stays.length ? 'bg-success' : 'bg-warning',
                            )}
                            style={{ width: `${Math.round((doneStays.length / co.stays.length) * 100)}%` }}
                          />
                        </div>
                      </div>
                      {pendingStays.length > 1 && onDirectCheckOut && (
                        <CheckOutAllButton
                          guestName={co.guestName}
                          pendingStays={pendingStays}
                          onCheckOutAll={() => {
                            for (const stay of pendingStays) {
                              onDirectCheckOut(stay.booking)
                            }
                          }}
                        />
                      )}
                    </div>

                    {pendingStays.map((stay) => (
                      <MultiRoomCheckOutRow
                        key={stay.roomStayId}
                        stay={stay}
                        guestName={co.guestName}
                        canCheckOut={!!onDirectCheckOut}
                        onCheckOut={() => onDirectCheckOut?.(stay.booking)}
                      />
                    ))}

                    {doneStays.map((stay) => (
                      <div
                        key={stay.roomStayId}
                        className="flex items-center space-inline radius-button border border-success/20 bg-success/5 px-3 py-2.5 opacity-75"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                        <span className="text-body font-bold tabular-nums">ห้อง {stay.roomNumber}</span>
                        <span className="text-helper text-success/80">เช็คเอาท์แล้ว</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Done checkouts — shown inline */}
          {doneCheckouts.map((co) => (
            <div
              key={co.bookingId}
              className="w-full radius-card border border-success/20 bg-success/5 px-3 py-2.5 opacity-60"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-inline min-w-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                  <span className="text-body font-semibold truncate">{co.guestName}</span>
                </div>
                <span className="text-helper shrink-0">ห้อง {co.roomNumbers.join(', ')}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-helper">{co.nights} คืน</span>
                <span className="text-helper text-success/80">เช็คเอาท์แล้ว</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
