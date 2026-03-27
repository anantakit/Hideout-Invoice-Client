import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, BedDouble, ArrowRight, Wand2, Loader2 } from 'lucide-react'
import { cn, fmtShortISO } from '@/shared/utils'
import { Card } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { ROUTES } from '@/app/routes'
import type { UnassignedStay } from '../../types'
import { useAutoAssignRooms } from '../hooks/useAutoAssignRooms'

// ─── PendingAssignmentsPanel ──────────────────────────────────────────────────

interface PendingAssignmentsPanelProps {
  stays: UnassignedStay[]
  /** Date string (YYYY-MM-DD) to scope auto-assign to check-ins on this date only. */
  selectedDate?: string
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
  selectedDate,
}: PendingAssignmentsPanelProps) {
  const navigate    = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false)

  const { mutate, isPending } = useAutoAssignRooms()

  const handleAutoAssign = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      mutate(selectedDate)
    },
    [mutate, selectedDate],
  )

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

        <div className="flex items-center gap-2">
          {/* Auto Assign button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={handleAutoAssign}
            className="h-7 px-2.5 text-xs gap-1.5"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" />
            )}
            มอบหมายอัตโนมัติ
          </Button>

          {isExpanded
            ? <ChevronUp  className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
          }
        </div>
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
                {fmtShortISO(stay.check_in)}
                <ArrowRight className="w-3 h-3" />
                {fmtShortISO(stay.check_out)}
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
