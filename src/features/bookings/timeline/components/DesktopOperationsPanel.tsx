import React, { useState, useMemo, useCallback } from 'react'
import { parseISO, isToday } from 'date-fns'
import { BedDouble, Share2, Copy } from 'lucide-react'
import { cn, todayISO, addDaysISO, fmtShort } from '@/shared/utils'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import type { TimelineRoom, TimelineBooking, UnassignedStay } from '../../types'
import type { DateRange } from '../../shared/components/DateRangePicker'
import { StayAvailabilityCard } from './StayAvailabilityCard'
import { computeDateKPI } from '../utils/computeDateKPI'
import { computeDateOps } from '../utils/computeDateOps'
import { computeStayingGuests, buildShareText, shareOrCopy, isMobileDevice } from '../utils/shareOperations'
import { CheckInSection } from './CheckInSection'
import { CheckOutSection } from './CheckOutSection'
import { PendingAssignmentsSection } from './PendingAssignmentsSection'
import { LogIn, LogOut } from 'lucide-react'

// ─── Props ────────────────────────────────────────────────────────────────────

interface DesktopOperationsPanelProps {
  rooms: TimelineRoom[]
  selectedDateStr: string
  roomTypeNameMap: Record<string, string>
  unassignedStays: UnassignedStay[]
  onDirectCheckOut?: (booking: TimelineBooking) => void
}

// ─── Main Component ──────────────────────────────────────────────────────────

export const DesktopOperationsPanel = React.memo(function DesktopOperationsPanel({
  rooms,
  selectedDateStr,
  roomTypeNameMap,
  unassignedStays,
  onDirectCheckOut,
}: DesktopOperationsPanelProps) {
  const [showCheckins, setShowCheckins] = useState(true)
  const [showCheckouts, setShowCheckouts] = useState(true)
  const [stayRange, setStayRange] = useState<DateRange>(() => ({
    checkIn: todayISO(),
    checkOut: addDaysISO(1),
  }))

  const selectedDate = parseISO(selectedDateStr)
  const viewingToday = isToday(selectedDate)

  // ── KPI ──────────────────────────────────────────────────────────────────
  const kpi = useMemo(
    () => computeDateKPI(rooms, unassignedStays, selectedDateStr, roomTypeNameMap),
    [rooms, unassignedStays, selectedDateStr, roomTypeNameMap],
  )
  const dateKPI = useMemo(() => ({
    availableCount: kpi.available,
    unassignedReserved: kpi.unassigned,
    byType: kpi.byType,
    checkinTotal: kpi.checkinTotal,
    checkinDone: kpi.checkinDone,
    checkoutTotal: kpi.checkoutTotal,
    checkoutDone: kpi.checkoutDone,
  }), [kpi])

  const availablePct = kpi.total > 0
    ? Math.round((Math.max(0, dateKPI.availableCount) / kpi.total) * 100)
    : 0

  // ── Operations ───────────────────────────────────────────────────────────
  const dateOps = useMemo(
    () => computeDateOps(rooms, unassignedStays, selectedDateStr, roomTypeNameMap),
    [rooms, unassignedStays, selectedDateStr, roomTypeNameMap],
  )

  const handleRangeChange = useCallback((r: DateRange) => setStayRange(r), [])

  // ── Staying guests (checked-in, not checking out on selected date) ────
  const stayingGuests = useMemo(
    () => computeStayingGuests(rooms, selectedDateStr),
    [rooms, selectedDateStr],
  )

  const handleShare = useCallback(() => {
    const text = buildShareText(
      selectedDateStr,
      dateOps.checkouts,
      dateOps.doneCheckouts,
      dateOps.checkins,
      dateOps.doneCheckins,
      stayingGuests,
      kpi,
    )
    shareOrCopy(text)
  }, [selectedDateStr, dateOps, stayingGuests, kpi])

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ── Hotel Status ──────────────────────────────────────────────── */}
      <div className="p-4 space-y-3 border-b border-border">
        <div className="flex items-center justify-between">
          <p className="text-section text-base">
            {fmtShort(selectedDate)} {selectedDate.getFullYear() + 543}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleShare}
            title="แชร์สรุปวันนี้"
          >
            {isMobileDevice() ? <Share2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        {/* Available rooms */}
        <div className="radius-card border border-border bg-card space-card">
          <div className="flex items-baseline justify-between">
            <span className="text-body text-muted-foreground">ห้องว่าง</span>
            <div className="flex items-baseline gap-1">
              <span className={cn(
                'text-metric',
                dateKPI.availableCount <= 0 ? 'text-destructive' : 'text-success',
              )}>
                {Math.max(0, dateKPI.availableCount)}
              </span>
              <span className="text-body text-muted-foreground">/ {kpi.total}</span>
              {dateKPI.availableCount <= 0 && kpi.total > 0 && (
                <Badge variant="red" className="text-micro radius-badge px-1.5 py-0 ml-1">เต็ม</Badge>
              )}
            </div>
          </div>
          <div className="mt-2 h-2 radius-badge bg-muted overflow-hidden">
            <div
              className="h-full radius-badge bg-success transition-all duration-300"
              style={{ width: `${availablePct}%` }}
            />
          </div>

          {/* Breakdown by type */}
          {dateKPI.byType.length > 0 && (
            <div className="flex gap-3 mt-2.5 flex-wrap">
              {dateKPI.byType.map((t) => (
                <div key={t.name} className="flex items-baseline gap-1">
                  <span className="text-helper">{t.name}</span>
                  <span className="text-body font-semibold tabular-nums text-foreground">{t.available}</span>
                  <span className="text-helper text-muted-foreground/50">/{t.total}</span>
                </div>
              ))}
            </div>
          )}
          {dateKPI.unassignedReserved > 0 && (
            <p className="text-helper mt-1.5 tabular-nums">
              <BedDouble className="w-3 h-3 inline mr-1" />
              รอกำหนดห้อง {dateKPI.unassignedReserved}
            </p>
          )}
        </div>

        {/* Check-in & Check-out summary */}
        {(dateKPI.checkinTotal > 0 || dateKPI.checkoutTotal > 0) && (
          <div className="grid grid-cols-2 gap-2">
            {dateKPI.checkinTotal > 0 && (
              <div className="radius-card border border-border bg-card px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-helper flex items-center gap-1">
                    <LogIn className="w-3 h-3" />
                    เช็คอิน
                  </span>
                  <span className="text-body font-semibold tabular-nums text-primary">
                    {dateKPI.checkinDone}<span className="text-helper font-normal">/{dateKPI.checkinTotal}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1 radius-badge bg-muted overflow-hidden">
                  <div
                    className="h-full radius-badge bg-primary transition-all duration-300"
                    style={{ width: `${dateKPI.checkinTotal > 0 ? Math.round((dateKPI.checkinDone / dateKPI.checkinTotal) * 100) : 0}%` }}
                  />
                </div>
              </div>
            )}
            {dateKPI.checkoutTotal > 0 && (
              <div className="radius-card border border-border bg-card px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-helper flex items-center gap-1">
                    <LogOut className="w-3 h-3" />
                    เช็คเอาท์
                  </span>
                  <span className="text-body font-semibold tabular-nums text-warning">
                    {dateKPI.checkoutDone}<span className="text-helper font-normal">/{dateKPI.checkoutTotal}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1 radius-badge bg-muted overflow-hidden">
                  <div
                    className="h-full radius-badge bg-warning transition-all duration-300"
                    style={{ width: `${dateKPI.checkoutTotal > 0 ? Math.round((dateKPI.checkoutDone / dateKPI.checkoutTotal) * 100) : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Check-ins ──────────────────────────────────────────────── */}
      <CheckInSection
        checkins={dateOps.checkins}
        doneCheckins={dateOps.doneCheckins}
        checkinDone={dateKPI.checkinDone}
        checkinTotal={dateKPI.checkinTotal}
        viewingToday={viewingToday}
        show={showCheckins}
        onToggle={() => setShowCheckins((v) => !v)}
      />

      {/* ── Check-outs ─────────────────────────────────────────────── */}
      <CheckOutSection
        checkouts={dateOps.checkouts}
        doneCheckouts={dateOps.doneCheckouts}
        checkoutDone={dateKPI.checkoutDone}
        checkoutTotal={dateKPI.checkoutTotal}
        viewingToday={viewingToday}
        show={showCheckouts}
        onToggle={() => setShowCheckouts((v) => !v)}
        onDirectCheckOut={onDirectCheckOut}
      />

      {/* ── Pending Assignments ── */}
      {unassignedStays.length > 0 && (
        <PendingAssignmentsSection
          unassignedStays={unassignedStays}
        />
      )}

      {/* ── Availability Checker ── */}
      <div className="p-4">
        <StayAvailabilityCard range={stayRange} onRangeChange={handleRangeChange} />
      </div>

    </div>
  )
})
