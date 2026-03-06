import React, { useState, useMemo, useCallback } from 'react'
import { parseISO, isToday, differenceInDays, format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
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

function isOccupied(stay: { check_in: string; check_out: string }, dateStr: string): boolean {
  const ci = toDateStr(stay.check_in)
  const co = toDateStr(stay.check_out)
  return ci <= dateStr && dateStr < co
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

function overlapsRange(stay: { check_in: string; check_out: string }, rangeStart: string, rangeEnd: string): boolean {
  const ci = toDateStr(stay.check_in)
  const co = toDateStr(stay.check_out)
  return ci < rangeEnd && co > rangeStart
}

// ─── Room list status types ──────────────────────────────────────────────────

type RoomStatus = 'free' | 'occupied' | 'checkout' | 'out_of_service'
type FilterValue = RoomStatus | 'all'

interface RoomEntry {
  room: TimelineRoom
  typeName: string
  status: RoomStatus
  guestName?: string
  booking?: TimelineBooking
  balance?: number
}

const STATUS_CFG: Record<RoomStatus, {
  label: string
  badge: 'green' | 'blue' | 'amber' | 'gray'
  border: string
}> = {
  free:           { label: 'ว่าง',        badge: 'green', border: 'border-l-success' },
  occupied:       { label: 'เข้าพัก',     badge: 'blue',  border: 'border-l-primary' },
  checkout:       { label: 'เช็คเอาท์',   badge: 'amber', border: 'border-l-warning' },
  out_of_service: { label: 'ปิดปรับปรุง',  badge: 'gray',  border: 'border-l-muted-foreground/40' },
}

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all',      label: 'ทั้งหมด' },
  { value: 'free',     label: 'ว่าง' },
  { value: 'occupied', label: 'เข้าพัก' },
  { value: 'checkout', label: 'เช็คเอาท์' },
]

// ─── Operations types ────────────────────────────────────────────────────────

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
  booking?: TimelineBooking
}

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
  const [filter, setFilter] = useState<FilterValue>('all')
  const [freeRoomMode, setFreeRoomMode] = useState<'selected' | 'range'>('selected')
  const [stayRange, setStayRange] = useState<DateRange>(() => {
    const t = format(new Date(), 'yyyy-MM-dd')
    const tm = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd')
    return { checkIn: t, checkOut: tm }
  })
  const [assignSheetBookingId, setAssignSheetBookingId] = useState<string | null>(null)

  const selectedDate = parseISO(selectedDateStr)
  const viewingToday = isToday(selectedDate)
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const stayRangeValid = stayRange.checkIn && stayRange.checkOut && stayRange.checkOut > stayRange.checkIn

  // ══════════════════════════════════════════════════════════════════════════
  // TODAY KPI — always computed from today
  // ══════════════════════════════════════════════════════════════════════════

  const todayKPI = useMemo(() => {
    let freeCount = 0
    let checkinCount = 0
    let checkoutCount = 0
    const checkinBookingIds = new Set<string>()
    const checkoutBookingIds = new Set<string>()

    for (const room of rooms) {
      if (room.status !== 'ACTIVE') continue
      let roomOccupiedToday = false

      for (const b of room.bookings) {
        const ci = toDateStr(b.check_in)
        const co = toDateStr(b.check_out)

        if (ci === todayStr) {
          roomOccupiedToday = true
          checkinBookingIds.add(b.booking_id)
        } else if (isOccupied(b, todayStr)) {
          roomOccupiedToday = true
        }

        if (co === todayStr) {
          checkoutBookingIds.add(b.booking_id)
        }
      }

      if (!roomOccupiedToday) freeCount++
    }

    // Count unassigned stays checking in today as checkins too
    for (const s of unassignedStays) {
      if (toDateStr(s.check_in) === todayStr) {
        checkinBookingIds.add(s.booking_id)
      }
    }

    checkinCount = checkinBookingIds.size
    checkoutCount = checkoutBookingIds.size

    return { freeCount, checkinCount, checkoutCount }
  }, [rooms, todayStr, unassignedStays])

  // ══════════════════════════════════════════════════════════════════════════
  // OPERATIONS — scoped to selectedDate (unified check-in section)
  // ══════════════════════════════════════════════════════════════════════════

  const dateOps = useMemo(() => {
    const checkinMap = new Map<string, CheckinBooking>()
    const checkoutMap = new Map<string, CheckoutBooking>()

    for (const room of rooms) {
      if (room.status !== 'ACTIVE') continue

      for (const b of room.bookings) {
        const ci = toDateStr(b.check_in)
        const co = toDateStr(b.check_out)

        // Check-in on selectedDate
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

        // Check-out on selectedDate
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

  // ══════════════════════════════════════════════════════════════════════════
  // ROOM LIST — scoped to selectedDate
  // ══════════════════════════════════════════════════════════════════════════

  const { entries, counts } = useMemo(() => {
    const dateStr = selectedDateStr
    const result: RoomEntry[] = []
    const c = { free: 0, occupied: 0, checkout: 0, out_of_service: 0 }

    for (const room of rooms) {
      const typeName = roomTypeNameMap[room.id] ?? ''

      if (room.status !== 'ACTIVE') {
        c.out_of_service++
        result.push({ room, typeName, status: 'out_of_service' })
        continue
      }

      const occupying = room.bookings.find((b) => isOccupied(b, dateStr))
      if (occupying) {
        c.occupied++
        result.push({
          room, typeName, status: 'occupied',
          guestName: occupying.guest_name,
          booking: occupying,
          balance: occupying.balance_amount,
        })
        continue
      }

      const checkingOut = room.bookings.find((b) => toDateStr(b.check_out) === dateStr)
      if (checkingOut) {
        c.checkout++
        result.push({
          room, typeName, status: 'checkout',
          guestName: checkingOut.guest_name,
          booking: checkingOut,
          balance: checkingOut.balance_amount,
        })
        continue
      }

      c.free++
      result.push({ room, typeName, status: 'free' })
    }

    return { entries: result, counts: c }
  }, [rooms, selectedDateStr, roomTypeNameMap])

  // ── Free rooms for stay range ────────────────────────────────────────────
  const freeForRange = useMemo(() => {
    if (!stayRangeValid) return []
    return entries.filter((e) => {
      if (e.room.status !== 'ACTIVE') return false
      return !e.room.bookings.some((b) => overlapsRange(b, stayRange.checkIn, stayRange.checkOut))
    })
  }, [entries, stayRange, stayRangeValid])

  const displayedEntries = freeRoomMode === 'range' && stayRangeValid
    ? freeForRange
    : entries

  const filtered = useMemo(
    () => filter === 'all' ? displayedEntries : displayedEntries.filter((e) => e.status === filter),
    [displayedEntries, filter],
  )

  const handleTap = useCallback(
    (entry: RoomEntry) => {
      if (entry.booking) onSelectBooking(entry.booking)
    },
    [onSelectBooking],
  )

  const total = displayedEntries.length
  const hasOps = dateOps.checkins.length > 0 || dateOps.checkouts.length > 0

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-auto pb-6">

      {/* ════════════════════════════════════════════════════════════════════
          SECTION: Today KPI — always today's numbers
          ════════════════════════════════════════════════════════════════════ */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          สรุปวันนี้
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border bg-card px-3 py-2.5 text-center">
            <p className="text-2xl font-bold tabular-nums text-success leading-none">
              {todayKPI.freeCount}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">ว่าง</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-3 py-2.5 text-center">
            <p className="text-2xl font-bold tabular-nums text-primary leading-none">
              {todayKPI.checkinCount}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">เช็คอิน</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-3 py-2.5 text-center">
            <p className="text-2xl font-bold tabular-nums text-warning leading-none">
              {todayKPI.checkoutCount}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">เช็คเอาท์</p>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION: Operations — scoped to selectedDate
          ════════════════════════════════════════════════════════════════════ */}
      {hasOps && (
        <div className="px-4 pt-4 space-y-4">

          {/* ── Check-in ─────────────────────────────────────────────── */}
          {dateOps.checkins.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                เช็คอิน{viewingToday ? 'วันนี้' : ` ${fmtShort(selectedDate)}`} ({dateOps.checkins.length})
              </p>
              {dateOps.checkins.map((ci) => {
                const needsAssign = ci.unassignedCount > 0
                const assignedCount = ci.totalStays - ci.unassignedCount
                const allAssigned = ci.unassignedCount === 0
                return (
                  <button
                    key={ci.bookingId}
                    type="button"
                    onClick={() => setAssignSheetBookingId(ci.bookingId)}
                    className="w-full rounded-xl border border-primary/20 bg-accent/5 px-3 py-3 text-left active:bg-accent/10 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold truncate">{ci.guestName}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                          variant={allAssigned ? 'green' : 'amber'}
                          className="text-[9px] px-1.5 py-0"
                        >
                          Assigned {assignedCount}/{ci.totalStays}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">{ci.nights} คืน</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      <span>{ci.typeName}</span>
                      {ci.assignedRooms.length > 0 && (
                        <span className="font-medium text-foreground/70">
                          ห้อง {ci.assignedRooms.join(', ')}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-end mt-2">
                      <span className={cn(
                        'text-xs font-medium flex items-center gap-0.5',
                        needsAssign ? 'text-warning' : 'text-primary',
                      )}>
                        {needsAssign ? 'Assign + Check-in' : 'Check-in'}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* ── Check-out ────────────────────────────────────────────── */}
          {dateOps.checkouts.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                เช็คเอาท์{viewingToday ? 'วันนี้' : ` ${fmtShort(selectedDate)}`} ({dateOps.checkouts.length})
              </p>
              {dateOps.checkouts.map((co) => {
                const hasBalance = co.balance > 0
                return (
                  <button
                    key={co.bookingId}
                    type="button"
                    onClick={() => navigate(ROUTES.bookings.detail(co.bookingId))}
                    className="w-full rounded-xl border border-warning/20 bg-warning-muted/30 px-3 py-3 text-left active:bg-warning-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold truncate">{co.guestName}</span>
                      {hasBalance && (
                        <span className="text-[10px] text-destructive font-medium shrink-0">
                          ค้าง ฿{co.balance.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground/70">
                        ห้อง {co.roomNumbers.join(', ')}
                      </span>
                    </div>
                    <div className="flex justify-end mt-2">
                      <span className="text-xs font-medium text-warning flex items-center gap-0.5">
                        Check-out
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SECTION: Stay Availability Checker
          ════════════════════════════════════════════════════════════════════ */}
      <div className="px-4 pt-4">
        <StayAvailabilityCard range={stayRange} onRangeChange={setStayRange} />
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION: Room Availability — scoped to selectedDate or range
          ════════════════════════════════════════════════════════════════════ */}
      <div className="pt-4">
        {/* Section header + summary */}
        <div className="px-4 pb-2">
          {/* Section title + mode toggle */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                ห้องพัก
              </p>
              {freeRoomMode === 'selected' ? (
                viewingToday ? (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0">วันนี้</Badge>
                ) : (
                  <span className="text-[11px] text-muted-foreground">{fmtShort(selectedDate)}</span>
                )
              ) : (
                <span className="text-[10px] text-muted-foreground">
                  {fmtShortISO(stayRange.checkIn)} → {fmtShortISO(stayRange.checkOut)}
                </span>
              )}
            </div>

            {/* Toggle: วันที่เลือก / ช่วงเข้าพัก */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setFreeRoomMode('selected')}
                className={cn(
                  'px-2.5 py-1 text-[10px] font-medium transition-colors',
                  freeRoomMode === 'selected'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:bg-muted',
                )}
              >
                วันที่เลือก
              </button>
              <button
                type="button"
                onClick={() => setFreeRoomMode('range')}
                disabled={!stayRangeValid}
                className={cn(
                  'px-2.5 py-1 text-[10px] font-medium transition-colors',
                  freeRoomMode === 'range'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:bg-muted',
                  !stayRangeValid && 'opacity-40 cursor-not-allowed',
                )}
              >
                ช่วงเข้าพัก
              </button>
            </div>
          </div>

          {/* Summary counts */}
          <div className="flex items-center gap-3 text-[11px] font-medium tabular-nums mb-2">
            {freeRoomMode === 'selected' ? (
              <>
                <span className="text-success">{counts.free} ว่าง</span>
                <span className="text-primary">{counts.occupied} เข้าพัก</span>
                {counts.checkout > 0 && (
                  <span className="text-warning">{counts.checkout} CO</span>
                )}
              </>
            ) : (
              <span className="text-success">{freeForRange.length} ว่างตลอดช่วง</span>
            )}
          </div>

          {/* Filter chips */}
          <div className="flex gap-1.5 overflow-x-auto">
            {FILTERS.map(({ value, label }) => {
              const count = value === 'all' ? total : counts[value]
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={cn(
                    'shrink-0 h-8 px-3 rounded-full text-xs font-medium transition-colors',
                    filter === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary/70 text-secondary-foreground active:bg-secondary',
                  )}
                >
                  {label} {count}
                </button>
              )
            })}
          </div>
        </div>

        {/* Room cards */}
        <div className="px-4 pt-2 space-y-1.5">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">ไม่พบห้อง</p>
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
    </div>
  )
})

// ─── RoomCard ─────────────────────────────────────────────────────────────────

const RoomCard = React.memo(function RoomCard({
  entry,
  onTap,
}: {
  entry: RoomEntry
  onTap: (entry: RoomEntry) => void
}) {
  const cfg = STATUS_CFG[entry.status]
  const hasTap = entry.status === 'occupied' || entry.status === 'checkout'
  const hasBalance = (entry.balance ?? 0) > 0

  const cardClasses = cn(
    'w-full rounded-xl border border-border bg-card px-3 py-3',
    'border-l-[3px]',
    cfg.border,
    entry.status === 'out_of_service' && 'opacity-50',
  )

  const cardBody = (
    <>
      {/* Main row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-sm font-bold tabular-nums shrink-0">
            {entry.room.room_number}
          </span>
          <span className="text-[11px] text-muted-foreground truncate">
            {entry.typeName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {hasBalance && (
            <span className="text-[10px] text-destructive font-medium">
              ค้าง ฿{entry.balance!.toLocaleString()}
            </span>
          )}
          <Badge variant={cfg.badge} className="text-[10px] px-2 py-0">
            {cfg.label}
          </Badge>
        </div>
      </div>

      {/* Guest name (occupied/checkout only) */}
      {entry.guestName && (
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
          {entry.guestName}
        </p>
      )}
    </>
  )

  if (hasTap) {
    return (
      <button
        type="button"
        onClick={() => onTap(entry)}
        className={cn(cardClasses, 'text-left active:bg-muted/60 transition-colors')}
      >
        {cardBody}
      </button>
    )
  }

  return <div className={cardClasses}>{cardBody}</div>
})
