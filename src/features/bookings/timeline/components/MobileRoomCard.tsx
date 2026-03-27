import React, { useMemo, useCallback } from 'react'
import { cn } from '@/shared/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Share2 } from 'lucide-react'
import type { TimelineRoom } from '../../types'
import type { DateKPI } from '../utils/computeDateKPI'
import { type computeDateOps } from '../utils/computeDateOps'
import { computeStayingGuests, buildShareText, shareOrCopy } from '../utils/shareOperations'

// ── Props ─────────────────────────────────────────────────────────────────────

interface MobileRoomCardProps {
  kpi: DateKPI
  rooms: TimelineRoom[]
  selectedDateStr: string
  dateOps: ReturnType<typeof computeDateOps>
}

// ── Component ─────────────────────────────────────────────────────────────────

export const MobileRoomCard = React.memo(function MobileRoomCard({
  kpi, rooms, selectedDateStr, dateOps,
}: MobileRoomCardProps) {
  const stayingGuests = useMemo(
    () => computeStayingGuests(rooms, selectedDateStr),
    [rooms, selectedDateStr],
  )

  const handleShare = useCallback(() => {
    const text = buildShareText(
      selectedDateStr, dateOps.checkouts, dateOps.doneCheckouts,
      dateOps.checkins, dateOps.doneCheckins, stayingGuests, kpi,
    )
    shareOrCopy(text)
  }, [selectedDateStr, dateOps, stayingGuests, kpi])
  const totalActiveRooms = kpi.total
  const occPct = totalActiveRooms > 0 ? Math.round((kpi.occupied / totalActiveRooms) * 100) : 0
  const checkinPct = kpi.checkinTotal > 0 ? Math.round((kpi.checkinDone / kpi.checkinTotal) * 100) : 0
  const checkoutPct = kpi.checkoutTotal > 0 ? Math.round((kpi.checkoutDone / kpi.checkoutTotal) * 100) : 0

  return (
    <div className="px-4 pt-3 pb-1 space-y-2">
      {/* Hotel overview — equal-weight metric cards */}
      <div className={cn(
        'grid gap-2',
        kpi.unassigned > 0 ? 'grid-cols-3' : 'grid-cols-2',
      )}>
        {/* Occupied */}
        <div className="radius-card border border-border bg-card px-3 py-2 flex flex-col items-center">
          <span className="text-helper leading-none mb-1">เข้าพัก</span>
          <span className={cn(
            'text-lg font-bold tabular-nums leading-none',
            occPct >= 90 ? 'text-destructive' : occPct >= 70 ? 'text-amber-400' : 'text-foreground',
          )}>
            {kpi.occupied}<span className="text-xs font-normal text-muted-foreground">/{totalActiveRooms}</span>
          </span>
          <div className="w-full h-1 rounded-full bg-muted overflow-hidden mt-1.5">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                occPct >= 90 ? 'bg-destructive' : occPct >= 70 ? 'bg-amber-400' : 'bg-primary',
              )}
              style={{ width: `${occPct}%` }}
            />
          </div>
        </div>

        {/* Unassigned — only when > 0 */}
        {kpi.unassigned > 0 && (
          <div className="radius-card border border-kpi-pending/30 bg-kpi-pending-muted px-3 py-2 flex flex-col items-center">
            <span className="text-helper text-kpi-pending leading-none mb-1">รอกำหนด</span>
            <span className="text-lg font-bold tabular-nums leading-none text-kpi-pending">
              {kpi.unassigned}
            </span>
          </div>
        )}

        {/* Available */}
        <div className="radius-card border border-border bg-card px-3 py-2 flex flex-col items-center">
          <span className="text-helper leading-none mb-1">ว่าง</span>
          <span className={cn(
            'text-lg font-bold tabular-nums leading-none',
            kpi.available <= 0 ? 'text-destructive' : 'text-success',
          )}>
            {kpi.available}
          </span>
          {kpi.available <= 0 && totalActiveRooms > 0 && (
            <Badge variant="red" className="text-micro radius-badge px-1.5 py-0 mt-1">เต็ม</Badge>
          )}
        </div>
      </div>

      {/* Breakdown by room type — inline */}
      {kpi.byType.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {kpi.byType.map((t) => (
            <div key={t.name} className="flex items-baseline gap-1">
              <span className="text-helper">{t.name}</span>
              <span className="text-body font-semibold tabular-nums text-foreground">{t.available}</span>
              <span className="text-helper text-muted-foreground/50">/{t.total}</span>
            </div>
          ))}
        </div>
      )}

      {/* Check-in & Check-out progress */}
      {(kpi.checkinTotal > 0 || kpi.checkoutTotal > 0) && (
        <div className={cn(
          'grid gap-2',
          kpi.checkinTotal > 0 && kpi.checkoutTotal > 0 ? 'grid-cols-2' : 'grid-cols-1',
        )}>
          {kpi.checkinTotal > 0 && (
            <div className="radius-card border border-border bg-card px-3 py-1.5">
              <div className="flex items-center justify-between">
                <span className="text-helper">เช็คอิน</span>
                <span className="text-body font-semibold tabular-nums text-primary">
                  {kpi.checkinDone}<span className="text-helper font-normal">/{kpi.checkinTotal}</span>
                </span>
              </div>
              <div className="mt-1 h-1 radius-badge bg-muted overflow-hidden">
                <div
                  className="h-full radius-badge bg-primary transition-all duration-300"
                  style={{ width: `${checkinPct}%` }}
                />
              </div>
            </div>
          )}
          {kpi.checkoutTotal > 0 && (
            <div className="radius-card border border-border bg-card px-3 py-1.5">
              <div className="flex items-center justify-between">
                <span className="text-helper">เช็คเอาท์</span>
                <span className="text-body font-semibold tabular-nums text-warning">
                  {kpi.checkoutDone}<span className="text-helper font-normal">/{kpi.checkoutTotal}</span>
                </span>
              </div>
              <div className="mt-1 h-1 radius-badge bg-muted overflow-hidden">
                <div
                  className="h-full radius-badge bg-warning transition-all duration-300"
                  style={{ width: `${checkoutPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Share button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1.5 text-muted-foreground"
        onClick={handleShare}
      >
        <Share2 className="w-3.5 h-3.5" />
        แชร์สรุปวันนี้
      </Button>
    </div>
  )
})
