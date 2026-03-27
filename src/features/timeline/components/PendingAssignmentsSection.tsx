import { useState } from 'react'
import { ChevronDown, BedDouble } from 'lucide-react'
import { CardButton } from '@/shared/ui/card-button'
import { cn } from '@/shared/utils'
import { Badge } from '@/shared/ui/badge'
import type { UnassignedStay } from '@/features/bookings/types'
import { useAutoAssignRooms } from '../hooks/useAutoAssignRooms'
import { usePendingGroups } from '../hooks/usePendingGroups'
import { PendingDateSection } from './PendingDateSection'

// ─── Main Section ────────────────────────────────────────────────────────────

export function PendingAssignmentsSection({
  unassignedStays,
}: {
  unassignedStays: UnassignedStay[]
}) {
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null)
  const [autoAssignDate, setAutoAssignDate] = useState<string | null>(null)
  const [showFuture, setShowFuture] = useState(false)

  const { mutate: autoAssignMutate, isPending: autoAssignPending } = useAutoAssignRooms({
    onSettled: () => setAutoAssignDate(null),
  })

  const handleAutoAssign = (date: string) => {
    setAutoAssignDate(date)
    autoAssignMutate(date)
  }

  const { sections, totalStays } = usePendingGroups(unassignedStays)

  const urgentSections = sections.filter((s) => s.isUrgent)
  const futureSections = sections.filter((s) => !s.isUrgent)
  const futureStayCount = futureSections.reduce((sum, s) => sum + s.stayCount, 0)

  return (
    <div className="p-4 border-b border-border space-y-3">
      <span className="text-label text-muted-foreground flex items-center space-inline">
        <BedDouble className="w-3 h-3" />
        รอมอบหมายห้อง
        <Badge variant="amber" className="tabular-nums ml-0.5 text-micro px-1.5 py-0">{totalStays}</Badge>
      </span>

      <div className="space-y-3">
        {urgentSections.map((section) => (
          <PendingDateSection
            key={section.dateStr}
            section={section}
            expandedBookingId={expandedBookingId}
            setExpandedBookingId={setExpandedBookingId}
            autoAssign={{ isPending: autoAssignPending }}
            autoAssignDate={autoAssignDate}
            handleAutoAssign={handleAutoAssign}
          />
        ))}
      </div>

      {futureSections.length > 0 && (
        <div className="space-y-3">
          <CardButton
            variant="ghost"
            padding="none"
            onClick={() => setShowFuture(!showFuture)}
            className="flex-row items-center justify-between py-1.5"
          >
            <span className="text-helper flex items-center space-inline">
              ล่วงหน้า
              <span className="font-normal text-muted-foreground/50">{futureStayCount} ห้อง</span>
            </span>
            <ChevronDown className={cn(
              'w-3.5 h-3.5 text-muted-foreground/50 transition-transform',
              showFuture && 'rotate-180',
            )} />
          </CardButton>

          {showFuture && futureSections.map((section) => (
            <PendingDateSection
              key={section.dateStr}
              section={section}
              expandedBookingId={expandedBookingId}
              setExpandedBookingId={setExpandedBookingId}
              autoAssign={{ isPending: autoAssignPending }}
              autoAssignDate={autoAssignDate}
              handleAutoAssign={handleAutoAssign}
            />
          ))}
        </div>
      )}
    </div>
  )
}
