import React from 'react'
import { ChevronRight, CheckCircle2, Phone, ExternalLink } from 'lucide-react'
import { cn, formatPhone } from '@/shared/utils'
import { Button } from '@/shared/ui/button'
import { CardButton } from '@/shared/ui/card-button'
import { formatNightsLabel, type CheckinBooking } from '../utils/operationTypes'
import { DepositBadge } from '@/features/bookings/shared/components/DepositBadge'

export const PendingCheckinCard = React.memo(function PendingCheckinCard({
  ci,
  onAssign,
}: {
  ci: CheckinBooking
  onAssign: (bookingId: string) => void
}) {
  const assignedCount = ci.totalStays - ci.unassignedCount
  const allAssigned = ci.unassignedCount === 0
  const progressPct = ci.totalStays > 0 ? (assignedCount / ci.totalStays) * 100 : 0

  return (
    <CardButton
      key={ci.bookingId}
      variant="ghost"
      onClick={() => onAssign(ci.bookingId)}
      className="border border-primary/20 bg-accent/5 active:bg-accent/10"
    >
      {/* Row 1: name + info */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-body font-semibold truncate">{ci.guestName}</span>
        <span className="text-helper shrink-0">
          {ci.totalStays} ห้อง · {formatNightsLabel(ci)}
        </span>
      </div>

      {/* Row 2: type · assigned rooms + chevron */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center space-inline text-helper min-w-0">
          <span>{ci.typeName}</span>
          {ci.assignedRooms.length > 0 && (
            <>
              <span>·</span>
              <span className="font-medium text-foreground/70 truncate">
                ห้อง {ci.assignedRooms.join(', ')}
              </span>
            </>
          )}
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 ml-1" />
      </div>
      {ci.booking?.guest_phone && (
        <div className="flex items-center gap-1 text-helper text-primary mt-1">
          <Phone className="w-3 h-3" />{formatPhone(ci.booking.guest_phone)}
        </div>
      )}

      {ci.booking && <DepositBadge booking={ci.booking} className="mt-1" />}

      {/* Row 3: mini progress bar + count (only if multi-room) */}
      {ci.totalStays > 1 && (
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 h-1 radius-badge bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full radius-badge transition-all duration-300',
                allAssigned ? 'bg-success' : 'bg-warning',
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-helper tabular-nums shrink-0">
            {assignedCount}/{ci.totalStays}
          </span>
        </div>
      )}
    </CardButton>
  )
})

export const DoneCheckinCard = React.memo(function DoneCheckinCard({
  ci,
  onNavigate,
}: {
  ci: CheckinBooking
  onNavigate: (bookingId: string) => void
}) {
  return (
    <div
      className="w-full radius-card border border-success/20 bg-success/5 px-3 py-2.5 opacity-60"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-inline min-w-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
          <span className="text-body font-semibold truncate">{ci.guestName}</span>
        </div>
        <span className="text-helper text-success/80 shrink-0">เข้าพักแล้ว</span>
      </div>
      {ci.assignedRooms.length > 0 && (
        <p className="text-helper mt-1">ห้อง {ci.assignedRooms.join(', ')}</p>
      )}
      <div className="flex items-center gap-3 mt-1">
        {ci.booking?.guest_phone && (
          <a href={`tel:${ci.booking.guest_phone}`} className="flex items-center gap-1 text-helper text-primary active:opacity-70">
            <Phone className="w-3 h-3" />{formatPhone(ci.booking.guest_phone)}
          </a>
        )}
        <Button variant="ghost" size="sm" onClick={() => onNavigate(ci.bookingId)} className="gap-1 h-auto p-0 text-helper text-muted-foreground hover:text-foreground">
          <ExternalLink className="w-3 h-3" />รายละเอียด
        </Button>
      </div>
    </div>
  )
})
