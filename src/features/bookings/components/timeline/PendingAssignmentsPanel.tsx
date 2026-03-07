import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseISO } from 'date-fns'
import { ChevronDown, ChevronUp, BedDouble, ArrowRight } from 'lucide-react'
import { cn } from '@/shared/utils'
import { Card } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { ROUTES } from '@/app/routes'
import type { UnassignedStay } from '../../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

function fmtThaiShort(iso: string): string {
  try {
    const d = parseISO(iso)
    return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`
  } catch {
    return iso
  }
}

// ─── PendingAssignmentsPanel ──────────────────────────────────────────────────

interface PendingAssignmentsPanelProps {
  stays: UnassignedStay[]
}

/**
 * Collapsible panel at the bottom of the Timeline page that lists all room
 * stays without a physical room assigned (room_id IS NULL).
 *
 * Collapsed by default — the header shows an amber badge with the count so
 * staff can quickly decide whether to expand.  Clicking any row navigates to
 * the booking detail page.
 */
export const PendingAssignmentsPanel = React.memo(function PendingAssignmentsPanel({
  stays,
}: PendingAssignmentsPanelProps) {
  const navigate    = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false)

  if (stays.length === 0) return null

  return (
    <Card className="shrink-0 rounded-none rounded-t-none border-x-0 border-b-0 shadow-none">

      {/* Toggle header */}
      <Button
        type="button"
        variant="ghost"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 h-auto rounded-none"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <BedDouble className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">รอมอบหมายห้อง</span>
          <Badge variant="amber" className="tabular-nums">{stays.length}</Badge>
        </div>
        {isExpanded
          ? <ChevronUp  className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />
        }
      </Button>

      {/* Expanded list */}
      {isExpanded && (
        <div className="max-h-52 overflow-y-auto border-t border-border divide-y divide-border/60">
          {stays.map((stay, i) => (
            <button
              key={`${stay.booking_id}-${i}`}
              type="button"
              onClick={() => navigate(ROUTES.bookings.detail(stay.booking_id))}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 text-left',
                'hover:bg-muted transition-colors group',
              )}
            >
              {/* Room type pill */}
              <span
                className={cn(
                  'shrink-0 inline-flex items-center rounded-md px-2 py-0.5',
                  'text-[10px] font-semibold',
                  'bg-info-muted text-info-muted-foreground',
                )}
              >
                {stay.room_type_name}
              </span>

              {/* Guest name */}
              <span className="flex-1 text-sm font-medium text-foreground truncate">
                {stay.guest_name}
              </span>

              {/* Date range */}
              <span className="shrink-0 flex items-center gap-1 text-helper tabular-nums">
                {fmtThaiShort(stay.check_in)}
                <ArrowRight className="w-3 h-3" />
                {fmtThaiShort(stay.check_out)}
              </span>

              {/* Chevron hint on hover */}
              <ChevronDown
                className="shrink-0 w-3.5 h-3.5 -rotate-90 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors"
              />
            </button>
          ))}
        </div>
      )}
    </Card>
  )
})
