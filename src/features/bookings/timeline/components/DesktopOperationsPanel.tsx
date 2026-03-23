import React, { useState, useMemo, useCallback } from 'react'
import { parseISO, isToday } from 'date-fns'
import { ChevronDown, BedDouble, LogIn, LogOut, CheckCircle2, Share2, Copy } from 'lucide-react'
import { cn, todayISO, addDaysISO, fmtShort, formatCompactNumber } from '@/shared/utils'
import { Button } from '@/shared/ui/button'
import { CardButton } from '@/shared/ui/card-button'
import { Badge } from '@/shared/ui/badge'
import type { TimelineRoom, TimelineBooking, UnassignedStay } from '../../types'
import type { DateRange } from '../../shared/components/DateRangePicker'
import { StayAvailabilityCard } from './StayAvailabilityCard'
import { computeDateKPI } from '../utils/computeDateKPI'
import { computeDateOps } from '../utils/computeDateOps'
import { computeStayingGuests, buildShareText, shareOrCopy, isMobileDevice } from '../utils/shareOperations'
import { SingleRoomCheckInCard } from './SingleRoomCheckInCard'
import { MultiRoomCheckInCard } from './MultiRoomCheckInCard'
import { SingleRoomCheckOutCard, MultiRoomCheckOutRow, CheckOutAllButton } from './CheckOutCards'
import { PendingAssignmentsSection } from './PendingAssignmentsSection'

// ─── Props ────────────────────────────────────────────────────────────────────

interface DesktopOperationsPanelProps {
  rooms: TimelineRoom[]
  selectedDateStr: string
  roomTypeNameMap: Record<string, string>
  unassignedStays: UnassignedStay[]
  /** Check-out action — calls mutation directly (cards have their own confirm). */
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
  const [expandedCheckoutId, setExpandedCheckoutId] = useState<string | null>(null)
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

      {/* ── Check-ins (primary action) ──────────────────────────────── */}
      {(dateOps.checkins.length > 0 || dateOps.doneCheckins.length > 0) && (
        <div className="p-4 space-y-2 border-b border-border">
          <button
            type="button"
            onClick={() => setShowCheckins((v) => !v)}
            className="w-full flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span className="text-label text-primary flex items-center space-inline">
              <LogIn className="w-3 h-3" />
              เช็คอิน{viewingToday ? 'วันนี้' : ''}
              <Badge variant="default" className="tabular-nums ml-0.5 text-micro px-1.5 py-0">
                {dateKPI.checkinDone}/{dateKPI.checkinTotal}
              </Badge>
            </span>
            <ChevronDown className={cn(
              'w-3.5 h-3.5 text-primary/50 transition-transform',
              showCheckins && 'rotate-180',
            )} />
          </button>

          {showCheckins && (
            <>
              {dateOps.checkins.map((ci) => {
                const isSingleRoom = ci.totalStays === 1
                if (isSingleRoom) {
                  return <SingleRoomCheckInCard key={ci.bookingId} ci={ci} />
                }
                return <MultiRoomCheckInCard key={ci.bookingId} ci={ci} />
              })}

              {/* Already checked-in bookings — shown inline */}
              {dateOps.doneCheckins.map((ci) => (
                <div
                  key={ci.bookingId}
                  className="w-full radius-card border border-success/20 bg-success/5 space-card opacity-60"
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
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Check-outs (secondary) ────────────────────────────────── */}
      {(dateOps.checkouts.length > 0 || dateOps.doneCheckouts.length > 0) && (
        <div className="p-4 space-y-2 border-b border-border">
          <button
            type="button"
            onClick={() => setShowCheckouts((v) => !v)}
            className="w-full flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span className="text-label text-warning flex items-center space-inline">
              <LogOut className="w-3 h-3" />
              เช็คเอาท์{viewingToday ? 'วันนี้' : ''}
              <Badge variant="amber" className="tabular-nums ml-0.5 text-micro px-1.5 py-0">
                {dateKPI.checkoutDone}/{dateKPI.checkoutTotal}
              </Badge>
            </span>
            <ChevronDown className={cn(
              'w-3.5 h-3.5 text-warning/50 transition-transform',
              showCheckouts && 'rotate-180',
            )} />
          </button>

          {showCheckouts && (
            <>
              {/* Pending checkouts */}
              {dateOps.checkouts.map((co) => {
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
              {dateOps.doneCheckouts.map((co) => (
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
      )}

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
