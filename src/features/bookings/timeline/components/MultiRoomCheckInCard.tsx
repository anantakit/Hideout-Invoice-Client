import { useState } from 'react'
import { ChevronDown, ShieldCheck, ShieldAlert } from 'lucide-react'
import { cn } from '@/shared/utils'
import { CardButton } from '@/shared/ui/card-button'
import { useBooking } from '../../hooks'
import type { CheckinBooking } from '../utils/operationTypes'
import { InlineCheckInPanel } from './InlineCheckInPanel'

export function MultiRoomCheckInCard({ ci }: { ci: CheckinBooking }) {
  const [expanded, setExpanded] = useState(false)
  const { data: fullBooking } = useBooking(ci.bookingId)
  const keyDeposit = fullBooking?.key_deposit_amount ?? 0

  return (
    <div>
      <CardButton
        onClick={() => setExpanded((v) => !v)}
        padding="card"
        className={cn(
          'border',
          expanded
            ? 'border-border bg-card rounded-b-none'
            : 'border-border bg-card hover:bg-accent/10',
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-body font-semibold truncate">{ci.guestName}</span>
          <span className="text-helper shrink-0">{ci.totalStays} ห้อง · {ci.nights} คืน</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center space-inline text-helper">
            <span>{ci.typeName}</span>
            {ci.assignedRooms.length > 0 && (
              <>
                <span>·</span>
                <span className="font-medium text-foreground/70">ห้อง {ci.assignedRooms.join(', ')}</span>
              </>
            )}
          </div>
          <ChevronDown className={cn(
            'w-3.5 h-3.5 text-muted-foreground/50 transition-transform shrink-0',
            expanded && 'rotate-180',
          )} />
        </div>
        {/* Key deposit — inline in card */}
        {fullBooking && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {keyDeposit > 0 ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-warning shrink-0" />
                <span className="text-xs font-medium text-warning">เก็บ{' ' + keyDeposit.toLocaleString()}</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
                <span className="text-xs font-medium text-success">จ่ายครบ</span>
              </>
            )}
          </div>
        )}
      </CardButton>

      {expanded && (
        <InlineCheckInPanel
          bookingId={ci.bookingId}
          onDone={() => setExpanded(false)}
        />
      )}
    </div>
  )
}
