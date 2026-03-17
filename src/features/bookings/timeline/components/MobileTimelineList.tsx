import React, { useState, useMemo, useCallback } from 'react'
import { parseISO, isToday, differenceInDays, format, addDays } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, BedDouble, LogOut } from 'lucide-react'
import { cn, fmtShort, fmtShortISO, todayISO as todayISOUtil, addDaysISO } from '@/shared/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { CardButton } from '@/shared/ui/card-button'
import { ROUTES } from '@/app/routes'
import type { TimelineRoom, TimelineBooking, UnassignedStay } from '../../types'
import { computeDateKPI } from '../utils/computeDateKPI'
import { StayAvailabilityCard } from './StayAvailabilityCard'
import type { DateRange } from '../../shared/components/DateRangePicker'
import CheckInBottomSheet from './AssignRoomBottomSheet'
import { toDateStr, type CheckinBooking, type CheckoutStay, type CheckoutBooking } from '../utils/operationTypes'
import { classifyRooms, overlapsRange, ALL_FILTERS, RANGE_FILTERS, type FilterValue, type RoomEntry } from '../utils/classifyRooms'
import { RoomCard } from './RoomCard'
import { PendingCheckinCard, DoneCheckinCard } from './MobileCheckinCards'
import { PendingCheckoutCard, DoneCheckoutCard } from './MobileCheckoutCards'
import CheckOutBottomSheet from './CheckOutBottomSheet'

// ─── Props ────────────────────────────────────────────────────────────────────

interface MobileTimelineListProps {
  rooms: TimelineRoom[]
  selectedDateStr: string
  bookingColorMap: Record<string, string>
  roomTypeNameMap: Record<string, string>
  unassignedStays: UnassignedStay[]
  onSelectBooking: (booking: TimelineBooking, roomNumbers?: string[]) => void
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const MobileTimelineList = React.memo(function MobileTimelineList({
  rooms,
  selectedDateStr,
  roomTypeNameMap,
  unassignedStays,
  onSelectBooking,
}: MobileTimelineListProps) {
  const navigate = useNavigate()
  const handleNavigateToBooking = useCallback(
    (bookingId: string) => navigate(`/bookings/${bookingId}`),
    [navigate],
  )
  const [filter, setFilter] = useState<FilterValue>('all')
  const [freeRoomMode, setFreeRoomMode] = useState<'selected' | 'range'>('selected')
  const [stayRange, setStayRange] = useState<DateRange>(() => {
    const t = todayISOUtil()
    const tm = addDaysISO(1)
    return { checkIn: t, checkOut: tm }
  })
  const [assignSheetBookingId, setAssignSheetBookingId] = useState<string | null>(null)
  const [checkoutSheetBookingId, setCheckoutSheetBookingId] = useState<string | null>(null)

  const selectedDate = parseISO(selectedDateStr)
  const viewingToday = isToday(selectedDate)
  const stayRangeValid = stayRange.checkIn && stayRange.checkOut && stayRange.checkOut > stayRange.checkIn

  // ══════════════════════════════════════════════════════════════════════════
  // KPI — follows selectedDate
  // ══════════════════════════════════════════════════════════════════════════

  const kpi = useMemo(
    () => computeDateKPI(rooms, unassignedStays, selectedDateStr, roomTypeNameMap),
    [rooms, unassignedStays, selectedDateStr, roomTypeNameMap],
  )
  const totalActiveRooms = kpi.total
  const dateKPI = useMemo(() => ({
    occupiedCount: kpi.occupied,
    availableCount: kpi.available,
    unassignedReserved: kpi.unassigned,
    byType: kpi.byType,
    checkinTotal: kpi.checkinTotal,
    checkinDone: kpi.checkinDone,
    checkoutTotal: kpi.checkoutTotal,
    checkoutDone: kpi.checkoutDone,
  }), [kpi])

  const occPct = totalActiveRooms > 0
    ? Math.round((dateKPI.occupiedCount / totalActiveRooms) * 100)
    : 0
  const checkinPct = dateKPI.checkinTotal > 0
    ? Math.round((dateKPI.checkinDone / dateKPI.checkinTotal) * 100)
    : 0
  const checkoutPct = dateKPI.checkoutTotal > 0
    ? Math.round((dateKPI.checkoutDone / dateKPI.checkoutTotal) * 100)
    : 0

  // ══════════════════════════════════════════════════════════════════════════
  // OPERATIONS — scoped to selectedDate (unified check-in section)
  // ══════════════════════════════════════════════════════════════════════════

  const dateOps = useMemo(() => {
    const checkinMap = new Map<string, CheckinBooking>()
    const checkoutMap = new Map<string, CheckoutBooking>()

    for (const room of rooms) {
      if (room.status === 'MAINTENANCE') continue

      for (const b of room.bookings) {
        const ci = toDateStr(b.check_in)
        const co = toDateStr(b.check_out)

        // Check-in on selectedDate
        if (ci === selectedDateStr) {
          const existing = checkinMap.get(b.booking_id)
          if (existing) {
            existing.assignedRooms.push(room.room_number)
            existing.stayStatuses.push(b.status)
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
              stayStatuses: [b.status],
              booking: b,
            })
          }
        }

        // For CHECKED_OUT stays, use the actual checkout date (checked_out_at) instead
        // of the scheduled check_out date — so early checkouts show on the correct day.
        const actualCheckoutDate = b.status === 'CHECKED_OUT' && b.checked_out_at
          ? toDateStr(b.checked_out_at)
          : co
        if (actualCheckoutDate === selectedDateStr) {
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

    // Merge unassigned stays checking in on selectedDate into checkinMap
    for (const s of unassignedStays) {
      if (toDateStr(s.check_in) === selectedDateStr && s.status !== 'CANCELLED' && s.status !== 'CHECKED_OUT') {
        const existing = checkinMap.get(s.booking_id)
        if (existing) {
          existing.unassignedCount++
          existing.stayStatuses.push(s.status)
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
            stayStatuses: [s.status],
          })
        }
      }
    }

    // Separate fully-checked-in bookings from pending.
    // A booking is "done" only when ALL its stays are CHECKED_IN or CHECKED_OUT.
    // Previously this checked a single stay's status which was wrong for multi-room
    // bookings with mixed statuses (e.g. 1 CHECKED_IN + 2 ASSIGNED).
    const allCheckins = Array.from(checkinMap.values())
    const isAllCheckedInOrOut = (ci: CheckinBooking) =>
      ci.stayStatuses.length > 0 &&
      ci.stayStatuses.every((st) => st === 'CHECKED_IN' || st === 'CHECKED_OUT')
    const pendingCheckins = allCheckins.filter((ci) => !isAllCheckedInOrOut(ci))
    const doneCheckins = allCheckins.filter(isAllCheckedInOrOut)

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

  // ══════════════════════════════════════════════════════════════════════════
  // ROOM LIST — scoped to selectedDate, uses same classifyRooms as KPI
  // ══════════════════════════════════════════════════════════════════════════

  const { entries, counts } = useMemo(
    () => classifyRooms(rooms, selectedDateStr, roomTypeNameMap),
    [rooms, selectedDateStr, roomTypeNameMap],
  )

  // Unassigned stays overlapping selectedDate (reservations without a physical room)
  const unassignedForDate = useMemo(() => {
    let count = 0
    for (const s of unassignedStays) {
      const ci = toDateStr(s.check_in)
      const co = toDateStr(s.check_out)
      if (ci <= selectedDateStr && co > selectedDateStr && s.status !== 'CANCELLED' && s.status !== 'CHECKED_OUT') {
        count++
      }
    }
    return count
  }, [unassignedStays, selectedDateStr])

  // Pending assignments grouped by booking — only today & overdue (mobile focus)
  const todayISO = todayISOUtil()
  const pendingBookings = useMemo(() => {
    const map = new Map<string, {
      bookingId: string
      guestName: string
      checkIn: string
      roomTypeNames: string[]
      totalRooms: number
      nights: number
    }>()
    for (const s of unassignedStays) {
      if (s.status === 'CANCELLED' || s.status === 'CHECKED_OUT') continue
      const ci = toDateStr(s.check_in)
      if (ci >= todayISO) continue // today shown in check-in section, future on desktop
      const existing = map.get(s.booking_id)
      if (existing) {
        existing.totalRooms++
        if (!existing.roomTypeNames.includes(s.room_type_name)) {
          existing.roomTypeNames.push(s.room_type_name)
        }
      } else {
        map.set(s.booking_id, {
          bookingId: s.booking_id,
          guestName: s.guest_name,
          checkIn: ci,
          roomTypeNames: [s.room_type_name],
          totalRooms: 1,
          nights: differenceInDays(parseISO(s.check_out), parseISO(s.check_in)),
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.checkIn.localeCompare(b.checkIn))
  }, [unassignedStays, todayISO])

  const pendingTotalStays = pendingBookings.reduce((sum, b) => sum + b.totalRooms, 0)

  // ── Rooms classified for stay range ─────────────────────────────────────
  const rangeEntries = useMemo(() => {
    if (!stayRangeValid) return { entries: [] as RoomEntry[], counts: { range_available: 0, range_occupied: 0, maintenance: 0 } }
    const result: RoomEntry[] = []
    const c = { range_available: 0, range_occupied: 0, maintenance: 0 }
    for (const e of entries) {
      if (e.room.status === 'MAINTENANCE') {
        c.maintenance++
        result.push({ ...e, status: 'maintenance' })
      } else if (e.room.bookings.some((b) => overlapsRange(b, stayRange.checkIn, stayRange.checkOut))) {
        c.range_occupied++
        result.push({ ...e, status: 'range_occupied' })
      } else {
        c.range_available++
        result.push({ ...e, status: 'range_available' })
      }
    }
    return { entries: result, counts: c }
  }, [entries, stayRange, stayRangeValid])

  const displayedEntries = freeRoomMode === 'range' && stayRangeValid
    ? rangeEntries.entries
    : entries

  const filtered = useMemo(
    () => filter === 'all' ? displayedEntries : displayedEntries.filter((e) => e.status === filter),
    [displayedEntries, filter],
  )

  const handleTap = useCallback(
    (entry: RoomEntry) => {
      if (entry.status === 'available') {
        const nextDay = format(addDays(parseISO(selectedDateStr), 1), 'yyyy-MM-dd')
        navigate(`${ROUTES.bookings.new}?check_in=${selectedDateStr}&check_out=${nextDay}`)
        return
      }
      if (entry.status === 'range_available' || entry.status === 'range_occupied') return
      // For turnover, show the checkout booking (the one that needs action first)
      if (entry.status === 'turnover' && entry.checkoutBooking) {
        onSelectBooking(entry.checkoutBooking)
        return
      }
      if (entry.booking) onSelectBooking(entry.booking)
    },
    [onSelectBooking, navigate, selectedDateStr],
  )

  const total = displayedEntries.length
  const hasCheckins = dateOps.checkins.length > 0 || dateOps.doneCheckins.length > 0
  const hasCheckouts = dateOps.checkouts.length > 0 || dateOps.doneCheckouts.length > 0

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-auto pb-6">

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 1: สถานะโรงแรม — compact
          ════════════════════════════════════════════════════════════════════ */}
      <div className="px-4 pt-3 pb-1 space-y-2">
        {/* Hotel overview — equal-weight metric cards */}
        <div className={cn(
          'grid gap-2',
          dateKPI.unassignedReserved > 0 ? 'grid-cols-3' : 'grid-cols-2',
        )}>
          {/* Occupied */}
          <div className="radius-card border border-border bg-card px-3 py-2 flex flex-col items-center">
            <span className="text-helper leading-none mb-1">เข้าพัก</span>
            <span className={cn(
              'text-lg font-bold tabular-nums leading-none',
              occPct >= 90 ? 'text-destructive' : occPct >= 70 ? 'text-amber-400' : 'text-foreground',
            )}>
              {dateKPI.occupiedCount}<span className="text-xs font-normal text-muted-foreground">/{totalActiveRooms}</span>
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
          {dateKPI.unassignedReserved > 0 && (
            <div className="radius-card border border-kpi-pending/30 bg-kpi-pending-muted px-3 py-2 flex flex-col items-center">
              <span className="text-helper text-kpi-pending leading-none mb-1">รอกำหนด</span>
              <span className="text-lg font-bold tabular-nums leading-none text-kpi-pending">
                {dateKPI.unassignedReserved}
              </span>
            </div>
          )}

          {/* Available */}
          <div className="radius-card border border-border bg-card px-3 py-2 flex flex-col items-center">
            <span className="text-helper leading-none mb-1">ว่าง</span>
            <span className={cn(
              'text-lg font-bold tabular-nums leading-none',
              dateKPI.availableCount <= 0 ? 'text-destructive' : 'text-success',
            )}>
              {dateKPI.availableCount}
            </span>
            {dateKPI.availableCount <= 0 && totalActiveRooms > 0 && (
              <Badge variant="red" className="text-micro radius-badge px-1.5 py-0 mt-1">เต็ม</Badge>
            )}
          </div>
        </div>

        {/* Breakdown by room type — inline */}
        {dateKPI.byType.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {dateKPI.byType.map((t) => (
              <div key={t.name} className="flex items-baseline gap-1">
                <span className="text-helper">{t.name}</span>
                <span className="text-body font-semibold tabular-nums text-foreground">{t.available}</span>
                <span className="text-helper text-muted-foreground/50">/{t.total}</span>
              </div>
            ))}
          </div>
        )}

        {/* Check-in & Check-out — only show cards that have data */}
        {(dateKPI.checkinTotal > 0 || dateKPI.checkoutTotal > 0) && (
          <div className={cn(
            'grid gap-2',
            dateKPI.checkinTotal > 0 && dateKPI.checkoutTotal > 0 ? 'grid-cols-2' : 'grid-cols-1',
          )}>
            {dateKPI.checkinTotal > 0 && (
              <div className="radius-card border border-border bg-card px-3 py-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-helper">เช็คอิน</span>
                  <span className="text-body font-semibold tabular-nums text-primary">
                    {dateKPI.checkinDone}<span className="text-helper font-normal">/{dateKPI.checkinTotal}</span>
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
            {dateKPI.checkoutTotal > 0 && (
              <div className="radius-card border border-border bg-card px-3 py-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-helper">เช็คเอาท์</span>
                  <span className="text-body font-semibold tabular-nums text-warning">
                    {dateKPI.checkoutDone}<span className="text-helper font-normal">/{dateKPI.checkoutTotal}</span>
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
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 2A: เช็คอิน — hidden when no data
          ════════════════════════════════════════════════════════════════════ */}
      {hasCheckins && (
      <div className="px-4 space-section space-y-2">
        <div className="text-label text-primary flex items-center space-inline">
          เช็คอิน{viewingToday ? 'วันนี้' : ` ${fmtShort(selectedDate)}`}
          <Badge variant="default" className="tabular-nums ml-0.5 text-micro px-1.5 py-0">
            {dateKPI.checkinDone}/{dateKPI.checkinTotal}
          </Badge>
        </div>

        <>
              {dateOps.checkins.map((ci) => (
                <PendingCheckinCard key={ci.bookingId} ci={ci} onAssign={setAssignSheetBookingId} />
              ))}

              {/* Already checked-in bookings (walk-ins etc.) — shown dimmed */}
              {dateOps.doneCheckins.map((ci) => (
                <DoneCheckinCard key={ci.bookingId} ci={ci} onNavigate={handleNavigateToBooking} />
              ))}
          </>
      </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 2B: เช็คเอาท์ — hidden when no data
          ════════════════════════════════════════════════════════════════════ */}
      {hasCheckouts && (
      <div className="px-4 space-section space-y-2">
        <div className="text-label text-warning flex items-center space-inline">
          <LogOut className="w-3 h-3" />
          เช็คเอาท์{viewingToday ? 'วันนี้' : ` ${fmtShort(selectedDate)}`}
          <Badge variant="amber" className="tabular-nums ml-0.5 text-micro px-1.5 py-0">
            {dateKPI.checkoutDone}/{dateKPI.checkoutTotal}
          </Badge>
        </div>

        {/* Pending checkouts — tap to open bottom sheet */}
        {dateOps.checkouts.map((co) => (
          <PendingCheckoutCard key={co.bookingId} co={co} onOpen={setCheckoutSheetBookingId} />
        ))}

        {/* Fully done checkouts — dimmed */}
        {dateOps.doneCheckouts.map((co) => (
          <DoneCheckoutCard key={co.bookingId} co={co} onNavigate={handleNavigateToBooking} />
        ))}
      </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 2.5: รอมอบหมายห้อง — today & overdue only
          ════════════════════════════════════════════════════════════════════ */}
      {pendingTotalStays > 0 && (
        <div className="px-4 space-section space-y-2">
          <div className="text-label text-muted-foreground flex items-center space-inline">
            <BedDouble className="w-3 h-3" />
            รอมอบหมายห้อง
            <Badge variant="amber" className="tabular-nums ml-0.5 text-micro px-1.5 py-0">{pendingTotalStays}</Badge>
          </div>
          {pendingBookings.map((booking) => (
            <CardButton
              key={booking.bookingId}
              onClick={() => setAssignSheetBookingId(booking.bookingId)}
              className="active:bg-muted/50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-body font-semibold truncate">{booking.guestName}</span>
                <span className="text-helper shrink-0 tabular-nums">
                  {booking.totalRooms} ห้อง · {fmtShortISO(booking.checkIn)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-helper">{booking.roomTypeNames.join(', ')}</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              </div>
            </CardButton>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 3: ตรวจสอบห้องว่าง — collapsible (managed by StayAvailabilityCard)
          ════════════════════════════════════════════════════════════════════ */}
      <div className="px-4 space-section">
        <StayAvailabilityCard range={stayRange} onRangeChange={setStayRange} />
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 4: รายการห้องพัก
          ════════════════════════════════════════════════════════════════════ */}
      <div className="space-section">
        {/* Section header + summary */}
        <div className="px-4 pb-2">
          {/* Section title + mode toggle */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-label text-muted-foreground">
              รายการห้องพัก
            </p>

            {/* Toggle: วันที่เลือก / ช่วงเข้าพัก */}
            <div className="flex radius-button border border-border overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFreeRoomMode('selected'); setFilter('all') }}
                className={cn(
                  'h-auto px-2.5 py-1 text-caption rounded-none',
                  freeRoomMode === 'selected'
                    ? 'date-selected'
                    : 'bg-card text-muted-foreground date-hover',
                )}
              >
                วันที่เลือก
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFreeRoomMode('range'); setFilter('all') }}
                disabled={!stayRangeValid}
                className={cn(
                  'h-auto px-2.5 py-1 text-caption rounded-none',
                  freeRoomMode === 'range'
                    ? 'date-selected'
                    : 'bg-card text-muted-foreground date-hover',
                  !stayRangeValid && 'date-disabled',
                )}
              >
                ช่วงเข้าพัก
              </Button>
            </div>
          </div>

          {/* Filter chips — all chips always visible, muted when count=0 */}
          {(() => {
            const chipList = freeRoomMode === 'range' && stayRangeValid ? RANGE_FILTERS : ALL_FILTERS
            const chipCounts = freeRoomMode === 'range' && stayRangeValid ? rangeEntries.counts : counts
            return (
              <>
                <div className="flex space-inline overflow-x-auto scrollbar-hide pb-0.5">
                  {chipList.map(({ value, label }) => {
                    const count = value === 'all' ? total : (chipCounts as Record<string, number>)[value] ?? 0
                    const isZero = count === 0 && value !== 'all'
                    return (
                      <Button
                        key={value}
                        variant="ghost"
                        size="sm"
                        onClick={() => setFilter(value)}
                        className={cn(
                          'shrink-0 h-8 px-3 radius-badge text-caption',
                          filter === value
                            ? 'date-selected'
                            : isZero
                              ? 'bg-secondary/40 text-muted-foreground/50'
                              : 'bg-secondary/70 text-secondary-foreground active:bg-secondary',
                        )}
                      >
                        {label} {count}
                      </Button>
                    )
                  })}
                </div>
                {freeRoomMode === 'selected' && unassignedForDate > 0 && (
                  <p className="text-helper mt-1.5">
                    + จองที่ยังไม่กำหนดห้อง {unassignedForDate} รายการ
                  </p>
                )}
              </>
            )
          })()}
        </div>

        {/* Room cards */}
        <div className="px-4 pt-2 space-list">
          {filtered.length === 0 ? (
            <p className="text-body text-muted-foreground text-center py-8">ไม่พบห้อง</p>
          ) : (
            filtered.map((entry) => (
              <RoomCard key={entry.room.id} entry={entry} onTap={handleTap} />
            ))
          )}
        </div>
      </div>

      {/* ── Check-in Bottom Sheet ───────────────────────────────────── */}
      <CheckInBottomSheet
        bookingId={assignSheetBookingId}
        onClose={() => setAssignSheetBookingId(null)}
      />

      {/* ── Check-out Bottom Sheet ──────────────────────────────────── */}
      <CheckOutBottomSheet
        bookingId={checkoutSheetBookingId}
        onClose={() => setCheckoutSheetBookingId(null)}
      />
    </div>
  )
})
