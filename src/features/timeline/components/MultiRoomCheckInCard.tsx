import { memo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/shared/utils'
import { CardButton } from '@/shared/ui/card-button'
import { formatNightsLabel, type CheckinBooking } from '../utils/operationTypes'
import { InlineCheckInPanel } from './InlineCheckInPanel'
import { CollectSummary } from './CollectSummary'

export const MultiRoomCheckInCard = memo(function MultiRoomCheckInCard({ ci }: { ci: CheckinBooking }) {
  const [expanded, setExpanded] = useState(false)

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
          <span className="text-helper shrink-0">{ci.totalStays} ห้อง · {formatNightsLabel(ci)}</span>
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
        {ci.booking && <CollectSummary booking={ci.booking} className="mt-1.5" />}
      </CardButton>

      {expanded && (
        <InlineCheckInPanel
          bookingId={ci.bookingId}
          onDone={() => setExpanded(false)}
        />
      )}
    </div>
  )
})
