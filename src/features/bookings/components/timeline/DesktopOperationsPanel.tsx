import React, { useState, useMemo, useCallback } from 'react'
import { parseISO, isToday, differenceInDays } from 'date-fns'
import { ChevronDown, BedDouble, LogIn, LogOut, Loader2, Wand2, CheckCircle2, KeyRound } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { cn, todayISO, addDaysISO, fmtShort, fmtShortISO, THAI_MONTHS_SHORT } from '@/shared/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,
  AlertDialogHeader, AlertDialogFooter, AlertDialogTitle,
  AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/shared/ui/alert-dialog'
import { ConfirmActionCard } from '@/shared/ui/confirm-action-card'
import type { TimelineRoom, TimelineBooking, UnassignedStay, RoomStayResponse } from '../../types'
import { useBooking, useAvailabilityGrouped, useAssignRooms, useCheckInRooms } from '../../hooks'
import { bookingsApi } from '../../api'
import { StayAvailabilityCard } from '../availability/StayAvailabilityCard'
import type { DateRange } from '../DateRangePicker'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(s: string): string {
  return s.slice(0, 10)
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CheckinBooking {
  bookingId: string
  guestName: string
  typeName: string
  nights: number
  assignedRooms: string[]
  unassignedCount: number
  totalStays: number
  booking?: TimelineBooking
  /** For single-room: the room_stay_id from timeline (avoids N+1 useBooking fetch) */
  roomStayId?: string
  /** For single-room: the physical room UUID */
  roomId?: string
}

interface CheckoutStay {
  roomStayId: string
  roomNumber: string
  status: string
  booking: TimelineBooking
}

interface CheckoutBooking {
  bookingId: string
  guestName: string
  roomNumbers: string[]
  balance: number
  checkIn: string
  nights: number
  stays: CheckoutStay[]
  booking?: TimelineBooking
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DesktopOperationsPanelProps {
  rooms: TimelineRoom[]
  selectedDateStr: string
  roomTypeNameMap: Record<string, string>
  unassignedStays: UnassignedStay[]
  onQuickCheckOut?: (booking: TimelineBooking) => void
}

// ─── Main Component ──────────────────────────────────────────────────────────

export const DesktopOperationsPanel = React.memo(function DesktopOperationsPanel({
  rooms,
  selectedDateStr,
  roomTypeNameMap,
  unassignedStays,
  onQuickCheckOut,
}: DesktopOperationsPanelProps) {
  const [expandedCheckinId, setExpandedCheckinId] = useState<string | null>(null)
  const [expandedCheckoutId, setExpandedCheckoutId] = useState<string | null>(null)
  const [stayRange, setStayRange] = useState<DateRange>(() => ({
    checkIn: todayISO(),
    checkOut: addDaysISO(1),
  }))

  const selectedDate = parseISO(selectedDateStr)
  const viewingToday = isToday(selectedDate)

  const totalActiveRooms = useMemo(
    () => rooms.filter((r) => r.status !== 'MAINTENANCE').length,
    [rooms],
  )

  // ── KPI ──────────────────────────────────────────────────────────────────
  const dateKPI = useMemo(() => {
    let available = 0
    let checkinTotal = 0
    let checkinDone = 0
    let checkoutTotal = 0
    let checkoutDone = 0

    const byType = new Map<string, { total: number; available: number }>()

    for (const room of rooms) {
      if (room.status === 'MAINTENANCE') continue
      const typeName = roomTypeNameMap[room.id] ?? ''
      const t = byType.get(typeName) ?? { total: 0, available: 0 }
      t.total++

      const activeBookings = room.bookings.filter(
        (b) => b.status !== 'CHECKED_OUT' && b.status !== 'CANCELLED',
      )
      const nonCancelled = room.bookings.filter((b) => b.status !== 'CANCELLED')

      const coStay = nonCancelled.find((b) => {
        const coDate = b.status === 'CHECKED_OUT' && b.checked_out_at
          ? toDateStr(b.checked_out_at)
          : toDateStr(b.check_out)
        return coDate === selectedDateStr
      })
      const ciStay = activeBookings.find((b) => toDateStr(b.check_in) === selectedDateStr)
      const activeOverlapping = activeBookings.find((b) => {
        const ci = toDateStr(b.check_in)
        const co = toDateStr(b.check_out)
        return ci <= selectedDateStr && co > selectedDateStr
      })

      // Classify — for KPI "ว่าง", a completed checkout (guest already left) counts
      // as available since the room is bookable.
      if (coStay && coStay.status !== 'CHECKED_OUT' && ciStay && coStay.booking_id !== ciStay.booking_id) { /* turnover */ }
      else if (coStay && !activeOverlapping) {
        if (coStay.status === 'CHECKED_OUT') { available++; t.available++ }
      }
      else if (activeOverlapping) { /* occupied/reserved */ }
      else { available++; t.available++ }

      byType.set(typeName, t)

      // Check-in / check-out counting
      for (const b of room.bookings) {
        if (b.status === 'CANCELLED') continue
        if (toDateStr(b.check_in) === selectedDateStr && b.status !== 'CHECKED_OUT') {
          checkinTotal++
          if (b.status === 'CHECKED_IN') checkinDone++
        }
        const coDate = b.status === 'CHECKED_OUT' && b.checked_out_at
          ? toDateStr(b.checked_out_at)
          : toDateStr(b.check_out)
        if (coDate === selectedDateStr) {
          checkoutTotal++
          if (b.status === 'CHECKED_OUT') checkoutDone++
        }
      }
    }

    // Unassigned stays — count per room type so byType breakdown is accurate
    let unassignedReserved = 0
    const unassignedByType = new Map<string, number>()
    for (const s of unassignedStays) {
      if (toDateStr(s.check_in) === selectedDateStr) {
        checkinTotal++
        if (s.status === 'CHECKED_IN' || s.status === 'CHECKED_OUT') checkinDone++
      }
      const ci = toDateStr(s.check_in)
      const co = toDateStr(s.check_out)
      if (ci <= selectedDateStr && co > selectedDateStr && s.status !== 'CANCELLED' && s.status !== 'CHECKED_OUT') {
        unassignedReserved++
        unassignedByType.set(s.room_type_name, (unassignedByType.get(s.room_type_name) ?? 0) + 1)
      }
    }

    return {
      availableCount: available - unassignedReserved,
      unassignedReserved,
      byType: Array.from(byType.entries()).map(([name, v]) => ({
        name,
        total: v.total,
        available: Math.max(0, v.available - (unassignedByType.get(name) ?? 0)),
      })),
      checkinTotal, checkinDone,
      checkoutTotal, checkoutDone,
    }
  }, [rooms, selectedDateStr, roomTypeNameMap, unassignedStays])

  const availablePct = totalActiveRooms > 0
    ? Math.round((Math.max(0, dateKPI.availableCount) / totalActiveRooms) * 100)
    : 0

  // ── Operations ───────────────────────────────────────────────────────────
  const dateOps = useMemo(() => {
    const checkinMap = new Map<string, CheckinBooking>()
    const checkoutMap = new Map<string, CheckoutBooking>()

    for (const room of rooms) {
      if (room.status === 'MAINTENANCE') continue
      for (const b of room.bookings) {
        const ci = toDateStr(b.check_in)
        const co = toDateStr(b.check_out)

        if (ci === selectedDateStr) {
          const existing = checkinMap.get(b.booking_id)
          if (existing) {
            existing.assignedRooms.push(room.room_number)
            existing.totalStays++
          } else {
            checkinMap.set(b.booking_id, {
              bookingId: b.booking_id,
              guestName: b.guest_name,
              typeName: roomTypeNameMap[room.id] ?? '',
              nights: differenceInDays(parseISO(b.check_out), parseISO(b.check_in)),
              assignedRooms: [room.room_number],
              unassignedCount: 0,
              totalStays: 1,
              booking: b,
              roomStayId: b.room_stay_id,
              roomId: room.id,
            })
          }
        }

        if (co === selectedDateStr) {
          const stay: CheckoutStay = {
            roomStayId: b.room_stay_id,
            roomNumber: room.room_number,
            status: b.status,
            booking: b,
          }
          const existing = checkoutMap.get(b.booking_id)
          if (existing) {
            existing.roomNumbers.push(room.room_number)
            existing.stays.push(stay)
          } else {
            checkoutMap.set(b.booking_id, {
              bookingId: b.booking_id,
              guestName: b.guest_name,
              roomNumbers: [room.room_number],
              balance: b.balance_amount,
              checkIn: ci,
              nights: differenceInDays(parseISO(b.check_out), parseISO(b.check_in)),
              stays: [stay],
              booking: b,
            })
          }
        }
      }
    }

    // Merge unassigned
    for (const s of unassignedStays) {
      if (toDateStr(s.check_in) === selectedDateStr && s.status !== 'CANCELLED' && s.status !== 'CHECKED_OUT') {
        const existing = checkinMap.get(s.booking_id)
        if (existing) {
          existing.unassignedCount++
          existing.totalStays++
        } else {
          checkinMap.set(s.booking_id, {
            bookingId: s.booking_id,
            guestName: s.guest_name,
            typeName: s.room_type_name,
            nights: differenceInDays(parseISO(s.check_out), parseISO(s.check_in)),
            assignedRooms: [],
            unassignedCount: 1,
            totalStays: 1,
          })
        }
      }
    }

    // Separate fully-checked-in bookings (e.g. walk-ins) from pending
    const allCheckins = Array.from(checkinMap.values())
    const pendingCheckins = allCheckins.filter((ci) => {
      // If booking is already fully CHECKED_IN or CHECKED_OUT, it's done
      const st = ci.booking?.status
      return st !== 'CHECKED_IN' && st !== 'CHECKED_OUT'
    })
    const doneCheckins = allCheckins.filter((ci) => {
      const st = ci.booking?.status
      return st === 'CHECKED_IN' || st === 'CHECKED_OUT'
    })

    // Sort checkouts: pending (has unchecked-out stays) first, fully done last
    const allCheckouts = Array.from(checkoutMap.values())
    const pendingCheckouts = allCheckouts
      .filter((co) => co.stays.some((s) => s.status === 'CHECKED_IN'))
      .sort((a, b) => (b.balance - a.balance))
    const doneCheckouts = allCheckouts.filter((co) => co.stays.every((s) => s.status === 'CHECKED_OUT'))

    return {
      checkins: pendingCheckins,
      doneCheckins,
      checkouts: pendingCheckouts,
      doneCheckouts,
    }
  }, [rooms, selectedDateStr, roomTypeNameMap, unassignedStays])

  const handleRangeChange = useCallback((r: DateRange) => setStayRange(r), [])

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ── Hotel Status ──────────────────────────────────────────────── */}
      <div className="p-4 space-y-3 border-b border-border">
        <p className="text-section text-base">
          {fmtShort(selectedDate)} {selectedDate.getFullYear() + 543}
        </p>

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
              <span className="text-body text-muted-foreground">/ {totalActiveRooms}</span>
              {dateKPI.availableCount <= 0 && totalActiveRooms > 0 && (
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
          <p className="text-label text-primary flex items-center space-inline">
            <LogIn className="w-3 h-3" />
            เช็คอิน{viewingToday ? 'วันนี้' : ''}
            <Badge variant="default" className="tabular-nums ml-0.5 text-micro px-1.5 py-0">
              {dateKPI.checkinDone}/{dateKPI.checkinTotal}
            </Badge>
          </p>

          {dateOps.checkins.map((ci) => {
            const isSingleRoom = ci.totalStays === 1
            const isExpanded = expandedCheckinId === ci.bookingId

            // Single-room: flat card with direct check-in button
            if (isSingleRoom) {
              return (
                <SingleRoomCheckInCard
                  key={ci.bookingId}
                  ci={ci}
                />
              )
            }

            // Multi-room: expandable card
            return (
              <div key={ci.bookingId}>
                <button
                  type="button"
                  onClick={() => setExpandedCheckinId(isExpanded ? null : ci.bookingId)}
                  className={cn(
                    'w-full radius-card border space-card text-left transition-colors',
                    isExpanded
                      ? 'border-border bg-card'
                      : 'border-border bg-card hover:bg-accent/10',
                    isExpanded && 'rounded-b-none',
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
                      isExpanded && 'rotate-180',
                    )} />
                  </div>
                </button>

                {isExpanded && (
                  <InlineCheckInPanel
                    bookingId={ci.bookingId}
                    onDone={() => setExpandedCheckinId(null)}
                  />
                )}
              </div>
            )
          })}

          {/* Already checked-in bookings (walk-ins etc.) — shown dimmed */}
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
        </div>
      )}

      {/* ── Check-outs (secondary) ────────────────────────────────── */}
      {(dateOps.checkouts.length > 0 || dateOps.doneCheckouts.length > 0) && (
        <div className="p-4 space-y-2 border-b border-border">
          <p className="text-label text-warning flex items-center space-inline">
            <LogOut className="w-3 h-3" />
            เช็คเอาท์{viewingToday ? 'วันนี้' : ''}
            <Badge variant="amber" className="tabular-nums ml-0.5 text-micro px-1.5 py-0">
              {dateKPI.checkoutDone}/{dateKPI.checkoutTotal}
            </Badge>
          </p>

          {/* Pending checkouts */}
          {dateOps.checkouts.map((co) => {
            const hasBalance = co.balance > 0
            const isSingleRoom = co.stays.length === 1
            const pendingStays = co.stays.filter((s) => s.status === 'CHECKED_IN')
            const doneStays = co.stays.filter((s) => s.status === 'CHECKED_OUT')
            const isExpanded = expandedCheckoutId === co.bookingId

            // Single-room: tappable card — tap opens confirmation
            if (isSingleRoom) {
              const stay = co.stays[0]
              const canCheckOut = onQuickCheckOut && stay.status === 'CHECKED_IN'
              return (
                <SingleRoomCheckOutCard
                  key={co.bookingId}
                  co={co}
                  stay={stay}
                  canCheckOut={!!canCheckOut}
                  onCheckOut={() => canCheckOut && onQuickCheckOut!(stay.booking)}
                />
              )
            }

            // Multi-room: expandable card
            return (
              <div key={co.bookingId}>
                <button
                  type="button"
                  onClick={() => setExpandedCheckoutId(isExpanded ? null : co.bookingId)}
                  className={cn(
                    'w-full radius-card border space-card text-left transition-colors',
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
                      ค้าง ฿{co.balance.toLocaleString()}
                    </p>
                  )}
                </button>

                {isExpanded && (
                  <div className="radius-card rounded-t-none border border-t-0 border-border bg-card space-card space-y-2">
                    {/* Progress */}
                    <div className="flex items-center justify-between">
                      <span className="text-helper font-medium">
                        เช็คเอาท์ {doneStays.length}/{co.stays.length} ห้อง
                      </span>
                      <div className="flex-1 max-w-[6rem] ml-3 h-1.5 radius-badge bg-muted overflow-hidden">
                        <div
                          className={cn(
                            'h-full radius-badge transition-all duration-300',
                            doneStays.length === co.stays.length ? 'bg-success' : 'bg-warning',
                          )}
                          style={{ width: `${Math.round((doneStays.length / co.stays.length) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Pending stays — tappable rows */}
                    {pendingStays.map((stay) => (
                      <MultiRoomCheckOutRow
                        key={stay.roomStayId}
                        stay={stay}
                        guestName={co.guestName}
                        canCheckOut={!!onQuickCheckOut}
                        onCheckOut={() => onQuickCheckOut?.(stay.booking)}
                      />
                    ))}

                    {/* Checkout all button */}
                    {pendingStays.length > 1 && onQuickCheckOut && (
                      <CheckOutAllButton
                        guestName={co.guestName}
                        pendingStays={pendingStays}
                        onCheckOutAll={() => {
                          for (const stay of pendingStays) {
                            onQuickCheckOut(stay.booking)
                          }
                        }}
                      />
                    )}

                    {/* Done stays */}
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

          {/* Fully done checkouts — dimmed */}
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
        </div>
      )}

      {/* ── Pending Assignments (grouped by booking, sectioned by date) ── */}
      {unassignedStays.length > 0 && (
        <PendingAssignmentsSection
          unassignedStays={unassignedStays}
        />
      )}

      {/* ── Availability Checker ───────────────────────────────────────── */}
      <div className="p-4">
        <StayAvailabilityCard range={stayRange} onRangeChange={handleRangeChange} />
      </div>

    </div>
  )
})

// ─── Pending Assignments Section ──────────────────────────────────────────────

interface PendingBookingGroup {
  bookingId: string
  guestName: string
  checkIn: string
  checkOut: string
  roomTypeNames: string[]
  totalRooms: number
  nights: number
}

function PendingAssignmentsSection({
  unassignedStays,
}: {
  unassignedStays: UnassignedStay[]
}) {
  const qc = useQueryClient()
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null)
  const [autoAssignDate, setAutoAssignDate] = useState<string | null>(null)
  const todayStr = todayISO()

  const autoAssign = useMutation({
    mutationFn: (date: string) => bookingsApi.autoAssignRooms(date),
    onSuccess: (resp) => {
      qc.invalidateQueries({ queryKey: ['timeline'] })
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['availability'] })
      qc.invalidateQueries({ queryKey: ['availability-grouped'] })
      if (resp.assigned_count > 0 && resp.skipped_count === 0) {
        toast.success(`มอบหมายห้องสำเร็จ ${resp.assigned_count} รายการ`)
      } else if (resp.assigned_count > 0) {
        toast.success(`มอบหมายสำเร็จ ${resp.assigned_count}, ข้าม ${resp.skipped_count}`)
      } else if (resp.skipped_count > 0) {
        toast.error(resp.skipped[0]?.reason ?? 'ไม่มีห้องว่าง')
      } else {
        toast('ไม่มีรายการที่ต้องมอบหมาย')
      }
      setAutoAssignDate(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? 'มอบหมายอัตโนมัติไม่สำเร็จ')
      setAutoAssignDate(null)
    },
  })

  const handleAutoAssign = (date: string) => {
    setAutoAssignDate(date)
    autoAssign.mutate(date)
  }

  // Group by booking — exclude today (already shown in check-in section)
  const grouped = useMemo(() => {
    const map = new Map<string, PendingBookingGroup>()
    for (const s of unassignedStays) {
      if (s.status === 'CANCELLED' || s.status === 'CHECKED_OUT') continue
      if (toDateStr(s.check_in) === todayStr) continue
      const existing = map.get(s.booking_id)
      if (existing) {
        existing.totalRooms++
        if (toDateStr(s.check_in) < existing.checkIn) existing.checkIn = toDateStr(s.check_in)
        if (toDateStr(s.check_out) > existing.checkOut) existing.checkOut = toDateStr(s.check_out)
        if (!existing.roomTypeNames.includes(s.room_type_name)) {
          existing.roomTypeNames.push(s.room_type_name)
        }
      } else {
        const ci = parseISO(s.check_in)
        const co = parseISO(s.check_out)
        map.set(s.booking_id, {
          bookingId: s.booking_id,
          guestName: s.guest_name,
          checkIn: toDateStr(s.check_in),
          checkOut: toDateStr(s.check_out),
          roomTypeNames: [s.room_type_name],
          totalRooms: 1,
          nights: differenceInDays(co, ci),
        })
      }
    }
    return Array.from(map.values())
  }, [unassignedStays])

  // Section by check-in date
  const sections = useMemo(() => {
    const dateMap = new Map<string, PendingBookingGroup[]>()
    for (const g of grouped) {
      const key = g.checkIn
      const arr = dateMap.get(key) ?? []
      arr.push(g)
      dateMap.set(key, arr)
    }
    // Sort dates ascending, count stays per date
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr, bookings]) => {
        const d = parseISO(dateStr)
        const label =
          dateStr === todayStr ? 'วันนี้' :
          dateStr === addDaysISO(1) ? 'พรุ่งนี้' :
          `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`
        const isUrgent = dateStr <= todayStr
        const stayCount = bookings.reduce((sum, b) => sum + b.totalRooms, 0)
        return { dateStr, label, isUrgent, bookings, stayCount }
      })
  }, [grouped, todayStr])

  const totalStays = unassignedStays.filter(
    (s) => s.status !== 'CANCELLED' && s.status !== 'CHECKED_OUT' && toDateStr(s.check_in) !== todayStr,
  ).length

  const urgentSections = sections.filter((s) => s.isUrgent)
  const futureSections = sections.filter((s) => !s.isUrgent)
  const futureStayCount = futureSections.reduce((sum, s) => sum + s.stayCount, 0)
  const [showFuture, setShowFuture] = useState(false)

  return (
    <div className="p-4 border-b border-border space-y-3">
      {/* Header */}
      <p className="text-label text-muted-foreground flex items-center space-inline">
        <BedDouble className="w-3 h-3" />
        รอมอบหมายห้อง
        <Badge variant="amber" className="tabular-nums ml-0.5 text-micro px-1.5 py-0">{totalStays}</Badge>
      </p>

      {/* Urgent sections (today + overdue) — always visible */}
      <div className="space-y-3">
        {urgentSections.map((section) => (
          <DateSection
            key={section.dateStr}
            section={section}
            expandedBookingId={expandedBookingId}
            setExpandedBookingId={setExpandedBookingId}
            autoAssign={autoAssign}
            autoAssignDate={autoAssignDate}
            handleAutoAssign={handleAutoAssign}
          />
        ))}
      </div>

      {/* Future sections — collapsed by default */}
      {futureSections.length > 0 && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowFuture(!showFuture)}
            className="flex items-center justify-between w-full text-left py-1.5"
          >
            <span className="text-helper text-muted-foreground/60 flex items-center space-inline">
              ล่วงหน้า
              <span className="font-normal text-muted-foreground/40">{futureStayCount} ห้อง</span>
            </span>
            <ChevronDown className={cn(
              'w-3.5 h-3.5 text-muted-foreground/40 transition-transform',
              showFuture && 'rotate-180',
            )} />
          </button>

          {showFuture && futureSections.map((section) => (
            <DateSection
              key={section.dateStr}
              section={section}
              expandedBookingId={expandedBookingId}
              setExpandedBookingId={setExpandedBookingId}
              autoAssign={autoAssign}
              autoAssignDate={autoAssignDate}
              handleAutoAssign={handleAutoAssign}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Date Section (extracted for reuse) ─────────────────────────────────────

function DateSection({
  section,
  expandedBookingId,
  setExpandedBookingId,
  autoAssign,
  autoAssignDate,
  handleAutoAssign,
}: {
  section: { dateStr: string; label: string; isUrgent: boolean; bookings: PendingBookingGroup[]; stayCount: number }
  expandedBookingId: string | null
  setExpandedBookingId: (id: string | null) => void
  autoAssign: { isPending: boolean }
  autoAssignDate: string | null
  handleAutoAssign: (date: string) => void
}) {
  return (
    <div className="space-y-1.5">
      {/* Date label + auto-assign per date */}
      <div className="flex items-center justify-between">
        <p className={cn(
          'text-helper flex items-center space-inline',
          section.isUrgent
            ? 'font-semibold text-warning'
            : 'font-normal text-muted-foreground/60',
        )}>
          {section.isUrgent && <span className="w-1.5 h-1.5 radius-badge bg-warning" />}
          {section.label}
          <span className="font-normal text-muted-foreground/40">{section.stayCount} ห้อง</span>
        </p>
        {section.stayCount > 1 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                disabled={autoAssign.isPending}
                className={cn(
                  'flex items-center space-inline text-micro text-muted-foreground/60 transition-colors',
                  'hover:text-primary disabled:opacity-50',
                )}
              >
                {autoAssign.isPending && autoAssignDate === section.dateStr ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Wand2 className="w-3 h-3" />
                )}
                อัตโนมัติ
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>ยืนยันจัดห้องอัตโนมัติ</AlertDialogTitle>
                <AlertDialogDescription>
                  มอบหมายห้องอัตโนมัติให้ {section.stayCount} ห้อง เข้าพัก{section.label} ระบบจะเลือกห้องที่เหมาะสมที่สุด
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleAutoAssign(section.dateStr)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  จัดอัตโนมัติ
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Booking cards */}
      {section.bookings.map((booking) => {
              const isExpanded = expandedBookingId === booking.bookingId
              return (
                <div key={booking.bookingId}>
                  <button
                    type="button"
                    onClick={() => setExpandedBookingId(isExpanded ? null : booking.bookingId)}
                    className={cn(
                      'w-full radius-card border px-3 py-2 text-left transition-colors',
                      isExpanded
                        ? 'border-border bg-card'
                        : section.isUrgent
                          ? 'border-border bg-card hover:bg-muted'
                          : 'border-border-soft bg-transparent hover:bg-muted/50',
                      isExpanded && 'rounded-b-none',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(
                        'text-body truncate',
                        section.isUrgent ? 'font-semibold' : 'font-normal text-muted-foreground',
                      )}>{booking.guestName}</span>
                      <span className="text-helper shrink-0 tabular-nums">
                        {booking.totalRooms} ห้อง
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-helper">{booking.roomTypeNames.join(', ')}</span>
                      <ChevronDown className={cn(
                        'w-3.5 h-3.5 text-muted-foreground/40 transition-transform shrink-0',
                        isExpanded && 'rotate-180',
                      )} />
                    </div>
                  </button>

                  {/* Inline room picker */}
                  {isExpanded && (
                    <InlineRoomPicker
                      bookingId={booking.bookingId}
                      checkIn={booking.checkIn}
                      checkOut={booking.checkOut}
                      onDone={() => setExpandedBookingId(null)}
                    />
                  )}
                </div>
              )
            })}
    </div>
  )
}

// ─── Inline Room Picker ──────────────────────────────────────────────────────

function InlineRoomPicker({
  bookingId,
  checkIn,
  checkOut,
  onDone,
}: {
  bookingId: string
  checkIn: string
  checkOut: string
  onDone: () => void
}) {
  const { data: booking, isLoading: bookingLoading } = useBooking(bookingId)
  const { data: availability, isLoading: availLoading } = useAvailabilityGrouped(
    checkIn, checkOut, true, bookingId,
  )
  const assignMutation = useAssignRooms(bookingId)
  const [busyStayId, setBusyStayId] = useState<string | null>(null)

  // Unassigned stays from booking
  const unassignedStays = useMemo(() => {
    if (!booking) return []
    return booking.room_stays.filter((s) => s.status === 'RESERVED' && !s.room_id)
  }, [booking])

  // Already-assigned room IDs (exclude from available)
  const assignedRoomIds = useMemo(() => {
    if (!booking) return new Set<string>()
    return new Set(booking.room_stays.filter((s) => s.room_id).map((s) => s.room_id!))
  }, [booking])

  // Available rooms grouped by type, filtered to only types needed
  const neededTypeIds = useMemo(
    () => new Set(unassignedStays.map((s) => s.room_type_id)),
    [unassignedStays],
  )

  const roomsByType = useMemo(() => {
    if (!availability) return []
    return availability.room_types
      .filter((rt) => neededTypeIds.has(rt.room_type_id))
      .map((rt) => ({
        typeId: rt.room_type_id,
        typeName: rt.room_type_name,
        rooms: rt.rooms.filter((r) => r.available && !assignedRoomIds.has(r.room_id)),
      }))
      .filter((rt) => rt.rooms.length > 0)
  }, [availability, neededTypeIds, assignedRoomIds])

  const handleAssign = async (roomTypeId: string, roomId: string, roomNumber: string) => {
    const stay = unassignedStays.find((s) => s.room_type_id === roomTypeId)
    if (!stay) return
    setBusyStayId(stay.id)
    try {
      await assignMutation.mutateAsync([{ room_stay_id: stay.id, room_id: roomId }])
      toast.success(`กำหนดห้อง ${roomNumber} แล้ว`)
      // If no more unassigned, close
      if (unassignedStays.length <= 1) onDone()
    } catch (err) {
      toast.error((err as Error).message || 'เกิดข้อผิดพลาด')
    } finally {
      setBusyStayId(null)
    }
  }

  const isLoading = bookingLoading || availLoading
  const isBusy = assignMutation.isPending

  return (
    <div className="radius-card rounded-t-none border border-t-0 border-border bg-card space-card space-y-2">
      {isLoading ? (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : roomsByType.length === 0 ? (
        <p className="text-helper text-destructive text-center py-2">ไม่มีห้องว่างในประเภทนี้</p>
      ) : (
        <>
          {/* Remaining count */}
          {unassignedStays.length > 0 && (
            <p className="text-helper text-warning font-medium">
              เหลืออีก {unassignedStays.length} ห้อง
            </p>
          )}

          {roomsByType.map((rt) => (
            <div key={rt.typeId} className="space-list">
              {roomsByType.length > 1 && (
                <p className="text-helper">{rt.typeName}</p>
              )}
              <div className="flex flex-wrap space-inline">
                {rt.rooms.map((room) => {
                  const stayForType = unassignedStays.find((s) => s.room_type_id === rt.typeId)
                  const isBusyRoom = busyStayId === stayForType?.id
                  return (
                    <button
                      key={room.room_id}
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleAssign(rt.typeId, room.room_id, room.room_number)}
                      className={cn(
                        'h-9 min-w-[3.5rem] px-3 radius-button border text-body font-bold tabular-nums transition-colors',
                        'border-border bg-card hover:bg-accent/10',
                        'disabled:opacity-50',
                      )}
                    >
                      {isBusyRoom && isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                      ) : (
                        room.room_number
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

// ─── Single-Room Check-In Card ──────────────────────────────────────────────

function SingleRoomCheckInCard({ ci }: { ci: CheckinBooking }) {
  const checkInMutation = useCheckInRooms(ci.bookingId)
  const today = todayISO()

  // Use pre-populated roomStayId/roomId from timeline data (avoids N+1 useBooking fetch)
  const ciDate = ci.booking?.check_in?.slice(0, 10) ?? ''
  const isCheckInDay = ciDate <= today

  const handleCheckIn = async () => {
    if (!ci.roomStayId || !ci.roomId) return
    try {
      await checkInMutation.mutateAsync([{ room_stay_id: ci.roomStayId, room_id: ci.roomId }])
      toast.success('เช็คอินสำเร็จ')
    } catch (err) {
      toast.error((err as Error).message || 'เกิดข้อผิดพลาด')
    }
  }

  const hasRoom = ci.assignedRooms.length > 0
  const needsAssign = ci.unassignedCount > 0
  const canCheckIn = hasRoom && isCheckInDay && !needsAssign && Boolean(ci.roomStayId && ci.roomId)

  // Status indicator shown on the right when cannot check in
  const statusIndicator = !canCheckIn ? (
    <div className="shrink-0">
      {needsAssign
        ? <span className="text-helper text-warning">รอกำหนดห้อง</span>
        : <span className="text-helper">รอเช็คอิน</span>}
    </div>
  ) : null

  return (
    <>
      <ConfirmActionCard
        disabled={!canCheckIn || checkInMutation.isPending}
        loading={checkInMutation.isPending}
        loader={<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        icon={<LogIn className="w-4 h-4 text-primary" />}
        confirmTitle="ยืนยันเช็คอิน"
        confirmDescription={`เช็คอิน ${ci.guestName} ห้อง ${ci.assignedRooms[0]} ?`}
        confirmLabel="เช็คอิน"
        onConfirm={handleCheckIn}
        className="space-card"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-body font-semibold truncate">{ci.guestName}</span>
              <span className="text-helper shrink-0">{ci.nights} คืน</span>
            </div>
            <div className="flex items-center space-inline text-helper mt-0.5">
              <span>{ci.typeName}</span>
              {hasRoom && (
                <>
                  <span>·</span>
                  <span className="font-medium text-foreground/70">ห้อง {ci.assignedRooms[0]}</span>
                </>
              )}
            </div>
          </div>
          {statusIndicator}
        </div>
      </ConfirmActionCard>
    </>
  )
}

// ─── Single-Room Check-Out Card (tappable) ──────────────────────────────────

function SingleRoomCheckOutCard({
  co,
  stay,
  canCheckOut,
  onCheckOut,
}: {
  co: CheckoutBooking
  stay: CheckoutStay
  canCheckOut: boolean
  onCheckOut: () => void
}) {
  const hasBalance = co.balance > 0

  return (
    <ConfirmActionCard
      disabled={!canCheckOut}
      icon={<LogOut className="w-4 h-4 text-warning" />}
      confirmTitle="ยืนยันเช็คเอาท์"
      confirmDescription={`เช็คเอาท์ ${co.guestName} ห้อง ${stay.roomNumber} ?`}
      confirmLabel="เช็คเอาท์"
      onConfirm={onCheckOut}
      className="space-card"
    >
      <div className="flex items-center gap-2">
        <span className="text-body font-semibold truncate">{co.guestName}</span>
        <span className="text-helper shrink-0">{co.nights} คืน</span>
      </div>
      <p className="text-helper mt-0.5">ห้อง {stay.roomNumber}</p>
      {hasBalance && (
        <p className="text-helper text-destructive font-medium mt-0.5">
          ค้าง ฿{co.balance.toLocaleString()}
        </p>
      )}
    </ConfirmActionCard>
  )
}

// ─── Multi-Room Check-Out Row (tappable) ────────────────────────────────────

function MultiRoomCheckOutRow({
  stay,
  guestName,
  canCheckOut,
  onCheckOut,
}: {
  stay: CheckoutStay
  guestName: string
  canCheckOut: boolean
  onCheckOut: () => void
}) {
  return (
    <ConfirmActionCard
      disabled={!canCheckOut}
      icon={<LogOut className="w-4 h-4 text-warning" />}
      confirmTitle="ยืนยันเช็คเอาท์"
      confirmDescription={`เช็คเอาท์ ${guestName} ห้อง ${stay.roomNumber} ?`}
      confirmLabel="เช็คเอาท์"
      onConfirm={onCheckOut}
      className="radius-button px-3 py-2.5"
    >
      <span className="text-body font-bold tabular-nums">ห้อง {stay.roomNumber}</span>
    </ConfirmActionCard>
  )
}

// ─── Check-Out All Button ───────────────────────────────────────────────────

function CheckOutAllButton({
  guestName,
  pendingStays,
  onCheckOutAll,
}: {
  guestName: string
  pendingStays: CheckoutStay[]
  onCheckOutAll: () => void
}) {
  const [open, setOpen] = useState(false)
  const roomLabel = pendingStays.map((s) => s.roomNumber).join(', ')

  return (
    <>
      <Button
        className="w-full h-9 text-sm font-semibold"
        variant="ghost"
        onClick={() => setOpen(true)}
      >
        <LogOut className="w-3.5 h-3.5 mr-1.5" />
        เช็คเอาท์ทั้งหมด ({pendingStays.length} ห้อง)
      </Button>

      <AlertDialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันเช็คเอาท์ทั้งหมด</AlertDialogTitle>
            <AlertDialogDescription>
              เช็คเอาท์ {guestName} ห้อง {roomLabel} ({pendingStays.length} ห้อง) พร้อมกัน ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              onCheckOutAll()
              setOpen(false)
            }}>
              เช็คเอาท์ทั้งหมด
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ─── Inline Check-In Panel ──────────────────────────────────────────────────

function InlineCheckInPanel({
  bookingId,
  onDone,
}: {
  bookingId: string
  onDone: () => void
}) {
  const { data: booking, isLoading: bookingLoading } = useBooking(bookingId)
  const assignMutation = useAssignRooms(bookingId)
  const checkInMutation = useCheckInRooms(bookingId)
  const [busyStayId, setBusyStayId] = useState<string | null>(null)
  const [checkingInAll, setCheckingInAll] = useState(false)

  const today = todayISO()

  // Categorize stays
  const { unassignedStays, assignedStays, checkedInStays, totalActive } = useMemo<{
    unassignedStays: RoomStayResponse[]
    assignedStays: RoomStayResponse[]
    checkedInStays: RoomStayResponse[]
    totalActive: number
  }>(() => {
    if (!booking) return { unassignedStays: [], assignedStays: [], checkedInStays: [], totalActive: 0 }
    const active = booking.room_stays.filter((s) => s.status !== 'CANCELLED' && s.status !== 'CHECKED_OUT')
    return {
      unassignedStays: active.filter((s) => s.status === 'RESERVED' && !s.room_id),
      assignedStays: active.filter((s) => (s.status === 'RESERVED' || s.status === 'ASSIGNED') && s.room_id),
      checkedInStays: active.filter((s) => s.status === 'CHECKED_IN'),
      totalActive: active.length,
    }
  }, [booking])

  const ciDate = (unassignedStays[0] ?? assignedStays[0] ?? checkedInStays[0])?.check_in?.slice(0, 10) ?? ''
  const coDate = (unassignedStays[0] ?? assignedStays[0] ?? checkedInStays[0])?.check_out?.slice(0, 10) ?? ''
  const isCheckInDay = ciDate <= today

  // Availability for unassigned stays
  const { data: availability, isLoading: availLoading } = useAvailabilityGrouped(
    ciDate, coDate, unassignedStays.length > 0 && Boolean(ciDate && coDate), bookingId,
  )

  const assignedRoomIds = useMemo(() => {
    if (!booking) return new Set<string>()
    return new Set(booking.room_stays.filter((s: RoomStayResponse) => s.room_id).map((s: RoomStayResponse) => s.room_id!))
  }, [booking])

  const neededTypeIds = useMemo(
    () => new Set(unassignedStays.map((s) => s.room_type_id)),
    [unassignedStays],
  )

  const roomsByType = useMemo(() => {
    if (!availability) return []
    return availability.room_types
      .filter((rt) => neededTypeIds.has(rt.room_type_id))
      .map((rt) => ({
        typeId: rt.room_type_id,
        typeName: rt.room_type_name,
        rooms: rt.rooms.filter((r) => r.available && !assignedRoomIds.has(r.room_id)),
      }))
      .filter((rt) => rt.rooms.length > 0)
  }, [availability, neededTypeIds, assignedRoomIds])

  const isBusy = assignMutation.isPending || checkInMutation.isPending

  const handleAssign = async (roomTypeId: string, roomId: string, roomNumber: string) => {
    const stay = unassignedStays.find((s) => s.room_type_id === roomTypeId)
    if (!stay) return
    setBusyStayId(stay.id)
    try {
      await assignMutation.mutateAsync([{ room_stay_id: stay.id, room_id: roomId }])
      toast.success(`กำหนดห้อง ${roomNumber} แล้ว`)
    } catch (err) {
      toast.error((err as Error).message || 'เกิดข้อผิดพลาด')
    } finally {
      setBusyStayId(null)
    }
  }

  const handleCheckInOne = async (stayId: string, roomId: string) => {
    setBusyStayId(stayId)
    try {
      await checkInMutation.mutateAsync([{ room_stay_id: stayId, room_id: roomId }])
      toast.success('เช็คอินสำเร็จ')
      if (assignedStays.length <= 1 && unassignedStays.length === 0) onDone()
    } catch (err) {
      toast.error((err as Error).message || 'เกิดข้อผิดพลาด')
    } finally {
      setBusyStayId(null)
    }
  }

  const handleCheckInAll = async () => {
    if (assignedStays.length === 0) return
    setCheckingInAll(true)
    try {
      await checkInMutation.mutateAsync(
        assignedStays.map((s) => ({ room_stay_id: s.id, room_id: s.room_id! })),
      )
      toast.success('เช็คอินทั้งหมดสำเร็จ')
      if (unassignedStays.length === 0) onDone()
    } catch (err) {
      toast.error((err as Error).message || 'เกิดข้อผิดพลาด')
    } finally {
      setCheckingInAll(false)
    }
  }

  const isLoading = bookingLoading

  return (
    <div className="radius-card rounded-t-none border border-t-0 border-border bg-card space-card space-y-3">
      {isLoading ? (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Progress header — only for multi-room */}
          {totalActive > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-helper font-medium">
                เช็คอิน {checkedInStays.length}/{totalActive} ห้อง
              </span>
              <div className="flex-1 max-w-[6rem] ml-3 h-1.5 radius-badge bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full radius-badge transition-all duration-300',
                    checkedInStays.length === totalActive ? 'bg-success' : 'bg-primary',
                  )}
                  style={{ width: `${Math.round((checkedInStays.length / totalActive) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Assigned rooms — tappable rows for check-in */}
          {assignedStays.length > 0 && (
            <div className="space-y-1.5">
              {assignedStays.map((stay) => (
                <ConfirmActionCard
                  key={stay.id}
                  disabled={!isCheckInDay || isBusy}
                  loading={busyStayId === stay.id && checkInMutation.isPending}
                  loader={<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  icon={isCheckInDay ? <LogIn className="w-4 h-4 text-primary" /> : undefined}
                  confirmTitle="ยืนยันเช็คอิน"
                  confirmDescription={`เช็คอิน ห้อง ${stay.room_number} ?`}
                  confirmLabel="เช็คอิน"
                  onConfirm={() => { if (stay.room_id) handleCheckInOne(stay.id, stay.room_id) }}
                  className="radius-button px-3 py-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-inline min-w-0">
                      <KeyRound className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-body font-bold tabular-nums">ห้อง {stay.room_number}</span>
                      <span className="text-helper">{stay.room_type_name}</span>
                    </div>
                    {!isCheckInDay && (
                      <span className="text-helper shrink-0">รอเช็คอิน</span>
                    )}
                  </div>
                </ConfirmActionCard>
              ))}
            </div>
          )}

          {/* Checked-in rooms */}
          {checkedInStays.length > 0 && (
            <div className="space-y-1.5">
              {checkedInStays.map((stay) => (
                <div
                  key={stay.id}
                  className="flex items-center space-inline radius-button border border-success/20 bg-success/5 px-3 py-2.5 opacity-75"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                  <span className="text-body font-bold tabular-nums">ห้อง {stay.room_number}</span>
                  <span className="text-helper text-success/80">เข้าพักแล้ว</span>
                </div>
              ))}
            </div>
          )}

          {/* Unassigned — room picker */}
          {unassignedStays.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-helper text-warning font-medium">
                เหลืออีก {unassignedStays.length} ห้อง — เลือกห้อง
              </p>
              {availLoading ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : roomsByType.length === 0 ? (
                <p className="text-helper text-destructive text-center py-2">ไม่มีห้องว่างในประเภทนี้</p>
              ) : (
                roomsByType.map((rt) => (
                  <div key={rt.typeId} className="space-list">
                    {roomsByType.length > 1 && (
                      <p className="text-helper">{rt.typeName}</p>
                    )}
                    <div className="flex flex-wrap space-inline">
                      {rt.rooms.map((room) => {
                        const stayForType = unassignedStays.find((s) => s.room_type_id === rt.typeId)
                        const isBusyRoom = busyStayId === stayForType?.id
                        return (
                          <button
                            key={room.room_id}
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleAssign(rt.typeId, room.room_id, room.room_number)}
                            className={cn(
                              'h-9 min-w-[3.5rem] px-3 radius-button border text-body font-bold tabular-nums transition-colors',
                              'border-border bg-card hover:bg-accent/10',
                              'disabled:opacity-50',
                            )}
                          >
                            {isBusyRoom && isBusy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                            ) : (
                              room.room_number
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Not check-in day notice */}
          {!isCheckInDay && assignedStays.length > 0 && (
            <p className="text-helper text-center py-1">
              เช็คอินได้วันที่ {fmtShortISO(ciDate)}
            </p>
          )}

          {/* Check-in all button with confirmation */}
          {isCheckInDay && assignedStays.length > 1 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="w-full h-9 text-sm font-semibold"
                  variant="ghost"
                  disabled={isBusy}
                >
                  {checkingInAll ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <LogIn className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  เช็คอินทั้งหมด ({assignedStays.length} ห้อง)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ยืนยันเช็คอินทั้งหมด</AlertDialogTitle>
                  <AlertDialogDescription>
                    เช็คอินห้อง {assignedStays.map((s) => s.room_number).join(', ')} ({assignedStays.length} ห้อง) พร้อมกัน
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCheckInAll}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    เช็คอินทั้งหมด
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* All done */}
          {totalActive > 0 && unassignedStays.length === 0 && assignedStays.length === 0 && (
            <div className="text-center py-2">
              <CheckCircle2 className="w-5 h-5 text-success mx-auto mb-1" />
              <p className="text-helper text-success">เช็คอินครบทุกห้องแล้ว</p>
            </div>
          )}

        </>
      )}
    </div>
  )
}
