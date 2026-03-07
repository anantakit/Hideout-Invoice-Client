import React, { useState, useMemo, useCallback } from 'react'
import { parseISO, isToday, differenceInDays, format, addDays } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, BedDouble, LogIn, LogOut } from 'lucide-react'
import { cn } from '@/shared/utils'
import { Badge } from '@/shared/ui/badge'
import { ROUTES } from '@/app/routes'
import type { TimelineRoom, TimelineBooking, UnassignedStay } from '../../types'
import { StayAvailabilityCard } from '../availability/StayAvailabilityCard'
import type { DateRange } from '../DateRangePicker'
import CheckInBottomSheet from './AssignRoomBottomSheet'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

function toDateStr(s: string): string {
  return s.slice(0, 10)
}

function fmtShort(d: Date): string {
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`
}

function fmtShortISO(iso: string): string {
  try {
    const d = parseISO(iso)
    return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`
  } catch { return iso }
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
}

interface CheckoutBooking {
  bookingId: string
  guestName: string
  roomNumbers: string[]
  balance: number
  checkIn: string
  nights: number
  booking?: TimelineBooking
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DesktopOperationsPanelProps {
  rooms: TimelineRoom[]
  selectedDateStr: string
  roomTypeNameMap: Record<string, string>
  unassignedStays: UnassignedStay[]
}

// ─── Main Component ──────────────────────────────────────────────────────────

export const DesktopOperationsPanel = React.memo(function DesktopOperationsPanel({
  rooms,
  selectedDateStr,
  roomTypeNameMap,
  unassignedStays,
}: DesktopOperationsPanelProps) {
  const navigate = useNavigate()
  const [assignSheetBookingId, setAssignSheetBookingId] = useState<string | null>(null)
  const [stayRange, setStayRange] = useState<DateRange>(() => {
    const t = format(new Date(), 'yyyy-MM-dd')
    const tm = format(addDays(new Date(), 1), 'yyyy-MM-dd')
    return { checkIn: t, checkOut: tm }
  })

  const selectedDate = parseISO(selectedDateStr)
  const viewingToday = isToday(selectedDate)

  const totalActiveRooms = useMemo(
    () => rooms.filter((r) => r.status === 'ACTIVE').length,
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
      if (room.status !== 'ACTIVE') continue
      const typeName = roomTypeNameMap[room.id] ?? ''
      const t = byType.get(typeName) ?? { total: 0, available: 0 }
      t.total++

      const coStay = room.bookings.find((b) => toDateStr(b.check_out) === selectedDateStr)
      const ciStay = room.bookings.find((b) => toDateStr(b.check_in) === selectedDateStr)
      const overlapping = room.bookings.find((b) => {
        const ci = toDateStr(b.check_in)
        const co = toDateStr(b.check_out)
        return ci <= selectedDateStr && co > selectedDateStr
      })

      // Classify
      if (room.status !== 'ACTIVE') { /* skip */ }
      else if (coStay && ciStay && coStay.booking_id !== ciStay.booking_id) { /* turnover */ }
      else if (coStay) { /* checkout */ }
      else if (overlapping) { /* occupied/reserved */ }
      else { available++; t.available++ }

      byType.set(typeName, t)

      // Check-in / check-out counting
      for (const b of room.bookings) {
        if (toDateStr(b.check_in) === selectedDateStr) {
          checkinTotal++
          if (b.status === 'CHECKED_IN' || b.status === 'CHECKED_OUT') checkinDone++
        }
        if (toDateStr(b.check_out) === selectedDateStr) {
          checkoutTotal++
          if (b.status === 'CHECKED_OUT') checkoutDone++
        }
      }
    }

    // Unassigned stays
    let unassignedReserved = 0
    for (const s of unassignedStays) {
      if (toDateStr(s.check_in) === selectedDateStr) {
        checkinTotal++
        if (s.status === 'CHECKED_IN' || s.status === 'CHECKED_OUT') checkinDone++
      }
      const ci = toDateStr(s.check_in)
      const co = toDateStr(s.check_out)
      if (ci <= selectedDateStr && co > selectedDateStr && s.status !== 'CANCELLED' && s.status !== 'CHECKED_OUT') {
        unassignedReserved++
      }
    }

    return {
      availableCount: available - unassignedReserved,
      unassignedReserved,
      byType: Array.from(byType.entries()).map(([name, v]) => ({ name, ...v })),
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
      if (room.status !== 'ACTIVE') continue
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
            })
          }
        }

        if (co === selectedDateStr) {
          const existing = checkoutMap.get(b.booking_id)
          if (existing) {
            existing.roomNumbers.push(room.room_number)
          } else {
            checkoutMap.set(b.booking_id, {
              bookingId: b.booking_id,
              guestName: b.guest_name,
              roomNumbers: [room.room_number],
              balance: b.balance_amount,
              checkIn: ci,
              nights: differenceInDays(parseISO(b.check_out), parseISO(b.check_in)),
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

    return {
      checkins: Array.from(checkinMap.values()),
      checkouts: Array.from(checkoutMap.values()),
    }
  }, [rooms, selectedDateStr, roomTypeNameMap, unassignedStays])

  const handleRangeChange = useCallback((r: DateRange) => setStayRange(r), [])

  const hasOps = dateOps.checkins.length > 0 || dateOps.checkouts.length > 0

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
                <Badge variant="red" className="text-xs radius-badge px-1.5 py-0 ml-1">เต็ม</Badge>
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

      {/* ── Operations ────────────────────────────────────────────────── */}
      {hasOps && (
        <div className="p-4 space-y-4 border-b border-border">

          {/* Check-ins */}
          {dateOps.checkins.length > 0 && (
            <div className="space-y-2">
              <p className="text-body font-semibold text-foreground flex items-center gap-1.5">
                <LogIn className="w-3.5 h-3.5 text-primary" />
                เช็คอิน{viewingToday ? 'วันนี้' : ''} ({dateOps.checkins.length})
              </p>
              {dateOps.checkins.map((ci) => {
                const needsAssign = ci.unassignedCount > 0
                const assignedCount = ci.totalStays - ci.unassignedCount
                const progressPct = ci.totalStays > 0 ? (assignedCount / ci.totalStays) * 100 : 0

                return (
                  <button
                    key={ci.bookingId}
                    type="button"
                    onClick={() => setAssignSheetBookingId(ci.bookingId)}
                    className="w-full radius-card border border-primary/20 bg-accent/5 px-3 py-2.5 text-left hover:bg-accent/10 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-body font-semibold truncate">{ci.guestName}</span>
                      <span className="text-helper shrink-0">{ci.totalStays} ห้อง · {ci.nights} คืน</span>
                    </div>
                    <div className="flex items-center space-inline mt-1 text-helper">
                      <span>{ci.typeName}</span>
                      {ci.assignedRooms.length > 0 && (
                        <>
                          <span>·</span>
                          <span className="font-medium text-foreground/70">ห้อง {ci.assignedRooms.join(', ')}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1 radius-badge bg-muted overflow-hidden">
                        <div
                          className={cn('h-full radius-badge transition-all duration-300', assignedCount === ci.totalStays ? 'bg-success' : 'bg-warning')}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className={cn(
                        'text-helper font-medium flex items-center gap-0.5',
                        needsAssign ? 'text-warning' : 'text-primary',
                      )}>
                        {needsAssign ? 'กำหนดห้อง' : 'เช็คอิน'}
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Check-outs */}
          {dateOps.checkouts.length > 0 && (
            <div className="space-y-2">
              <p className="text-body font-semibold text-foreground flex items-center gap-1.5">
                <LogOut className="w-3.5 h-3.5 text-warning" />
                เช็คเอาท์{viewingToday ? 'วันนี้' : ''} ({dateOps.checkouts.length})
              </p>
              {dateOps.checkouts.map((co) => {
                const hasBalance = co.balance > 0
                return (
                  <button
                    key={co.bookingId}
                    type="button"
                    onClick={() => navigate(ROUTES.bookings.detail(co.bookingId))}
                    className="w-full radius-card border border-warning/20 bg-warning-muted/30 px-3 py-2.5 text-left hover:bg-warning-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-body font-semibold truncate">{co.guestName}</span>
                      {hasBalance && (
                        <span className="text-helper text-destructive font-medium shrink-0">
                          ค้าง ฿{co.balance.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-inline mt-1 text-helper">
                      <span className="font-medium text-foreground/70">ห้อง {co.roomNumbers.join(', ')}</span>
                      <span>·</span>
                      <span>{fmtShortISO(co.checkIn)} ({co.nights} คืน)</span>
                    </div>
                    <div className="flex justify-end mt-1.5">
                      <span className="text-helper font-medium text-warning flex items-center gap-0.5">
                        เช็คเอาท์
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Pending Assignments ────────────────────────────────────────── */}
      {unassignedStays.length > 0 && (
        <div className="p-4 border-b border-border space-y-2">
          <p className="text-body font-semibold text-foreground flex items-center gap-1.5">
            <BedDouble className="w-3.5 h-3.5 text-warning" />
            รอมอบหมายห้อง
            <Badge variant="amber" className="tabular-nums ml-1">{unassignedStays.length}</Badge>
          </p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {unassignedStays.map((stay, i) => (
              <button
                key={`${stay.booking_id}-${i}`}
                type="button"
                onClick={() => navigate(ROUTES.bookings.detail(stay.booking_id))}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-left radius-button hover:bg-muted transition-colors"
              >
                <span className="shrink-0 inline-flex items-center radius-button px-1.5 py-0.5 text-[10px] font-semibold bg-info-muted text-info-muted-foreground">
                  {stay.room_type_name}
                </span>
                <span className="flex-1 text-body font-medium text-foreground truncate">{stay.guest_name}</span>
                <span className="shrink-0 text-helper tabular-nums">
                  {fmtShortISO(stay.check_in)} → {fmtShortISO(stay.check_out)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Availability Checker ───────────────────────────────────────── */}
      <div className="p-4">
        <StayAvailabilityCard range={stayRange} onRangeChange={handleRangeChange} />
      </div>

      {/* ── Check-in Bottom Sheet ──────────────────────────────────────── */}
      <CheckInBottomSheet
        bookingId={assignSheetBookingId}
        onClose={() => setAssignSheetBookingId(null)}
      />
    </div>
  )
})
