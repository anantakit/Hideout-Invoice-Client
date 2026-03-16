import React, { useState, useMemo, useCallback } from 'react'
import { parseISO, isToday, differenceInDays, format, addDays } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronDown, BedDouble, CheckCircle2, LogOut, Phone, ExternalLink } from 'lucide-react'
import { cn, fmtShort, fmtShortISO, formatTHBCurrency, todayISO as todayISOUtil, addDaysISO } from '@/shared/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,
  AlertDialogHeader, AlertDialogFooter, AlertDialogTitle,
  AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/shared/ui/alert-dialog'
import { ROUTES } from '@/app/routes'
import type { TimelineRoom, TimelineBooking, UnassignedStay } from '../../types'
import { computeDateKPI } from './computeDateKPI'
import { StayAvailabilityCard } from '../availability/StayAvailabilityCard'
import type { DateRange } from '../../shared/components/DateRangePicker'
import CheckInBottomSheet from './AssignRoomBottomSheet'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(s: string): string {
  return s.slice(0, 10)
}

function overlapsRange(stay: { check_in: string; check_out: string }, rangeStart: string, rangeEnd: string): boolean {
  const ci = toDateStr(stay.check_in)
  const co = toDateStr(stay.check_out)
  return ci < rangeEnd && co > rangeStart
}

// ─── Room state classification ───────────────────────────────────────────────
// Each room belongs to exactly ONE state on a given date.
// This is the single source of truth for KPI, room list, and filter chips.

type RoomStatus = 'available' | 'reserved' | 'checked_in' | 'checkout_today' | 'turnover' | 'maintenance'
type RangeStatus = 'range_available' | 'range_occupied' | 'maintenance'
type FilterValue = RoomStatus | RangeStatus | 'all'

interface RoomEntry {
  room: TimelineRoom
  typeName: string
  status: RoomStatus | RangeStatus
  guestName?: string
  booking?: TimelineBooking
  balance?: number
  /** For turnover: the guest checking out */
  checkoutGuestName?: string
  checkoutBooking?: TimelineBooking
  checkoutBalance?: number
}

type RoomCounts = Record<RoomStatus, number>

const STATUS_CFG: Record<RoomStatus | RangeStatus, {
  label: string
  badge: 'green' | 'blue' | 'amber' | 'gray' | 'red'
  cardClass: string
}> = {
  available:       { label: 'ว่าง',        badge: 'green', cardClass: 'room-available' },
  reserved:        { label: 'จองแล้ว',     badge: 'amber', cardClass: 'room-booked' },
  checked_in:      { label: 'เข้าพัก',     badge: 'blue',  cardClass: 'room-occupied' },
  checkout_today:  { label: 'เช็คเอาท์',   badge: 'amber', cardClass: 'room-checkout' },
  turnover:        { label: 'เปลี่ยนแขก',  badge: 'red',   cardClass: 'room-turnover' },
  maintenance:     { label: 'ปิดปรับปรุง',  badge: 'gray',  cardClass: 'room-maintenance' },
  range_available: { label: 'ว่าง',        badge: 'green', cardClass: 'room-available' },
  range_occupied:  { label: 'ไม่ว่าง',     badge: 'red',   cardClass: 'room-turnover' },
}

const ALL_FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all',           label: 'ทั้งหมด' },
  { value: 'available',     label: 'ว่าง' },
  { value: 'reserved',      label: 'จองแล้ว' },
  { value: 'checked_in',    label: 'เข้าพัก' },
  { value: 'checkout_today', label: 'เช็คเอาท์' },
  { value: 'turnover',      label: 'เปลี่ยนแขก' },
  { value: 'maintenance',   label: 'ปิดปรับปรุง' },
]

const RANGE_FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all',             label: 'ทั้งหมด' },
  { value: 'range_available', label: 'ว่าง' },
  { value: 'range_occupied',  label: 'ไม่ว่าง' },
  { value: 'maintenance',     label: 'ปิดปรับปรุง' },
]

/**
 * Classify every room into exactly ONE state using strict priority evaluation.
 * This is the single source of truth for KPI, room list, and filter chips.
 *
 * Priority order (first match wins):
 *   P1  ปิดปรับปรุง   room.status IN (MAINTENANCE, CLEANING)
 *   P2  เปลี่ยนแขก    EXISTS stay check_out=D AND EXISTS stay check_in=D (different booking)
 *   P3  เช็คเอาท์      EXISTS stay check_out=D (and not turnover)
 *   P4  เข้าพัก        stay.status=CHECKED_IN AND overlaps D (check_in<=D AND check_out>D)
 *   P5  จองแล้ว       stay.status IN (RESERVED,ASSIGNED) AND overlaps D
 *   P6  ว่าง          none of the above
 */
function classifyRooms(
  rooms: TimelineRoom[],
  dateStr: string,
  roomTypeNameMap: Record<string, string>,
): { entries: RoomEntry[]; counts: RoomCounts } {
  const result: RoomEntry[] = []
  const c: RoomCounts = { available: 0, reserved: 0, checked_in: 0, checkout_today: 0, turnover: 0, maintenance: 0 }

  for (const room of rooms) {
    const typeName = roomTypeNameMap[room.id] ?? ''

    // ── P1: MAINTENANCE (only truly out-of-service rooms) ─────────────
    if (room.status === 'MAINTENANCE') {
      c.maintenance++
      result.push({ room, typeName, status: 'maintenance' })
      continue
    }

    // Active stays exclude completed checkouts and cancellations
    const activeBookings = room.bookings.filter(
      (b) => b.status !== 'CHECKED_OUT' && b.status !== 'CANCELLED',
    )
    // Non-cancelled stays (includes CHECKED_OUT — needed for checkout-today display)
    const nonCancelled = room.bookings.filter((b) => b.status !== 'CANCELLED')

    // Precompute: checkout today — for CHECKED_OUT stays, use actual checkout date
    const coStay = nonCancelled.find((b) => {
      const coDate = b.status === 'CHECKED_OUT' && b.checked_out_at
        ? toDateStr(b.checked_out_at)
        : toDateStr(b.check_out)
      return coDate === dateStr
    })
    // Checkin today — only active stays (CHECKED_OUT check-ins are historical)
    const ciStay = activeBookings.find((b) => toDateStr(b.check_in) === dateStr)

    // ── P2: TURNOVER — only if checkout is still pending (not already CHECKED_OUT)
    if (coStay && coStay.status !== 'CHECKED_OUT' && ciStay && coStay.booking_id !== ciStay.booking_id) {
      c.turnover++
      result.push({
        room, typeName, status: 'turnover',
        guestName: ciStay.guest_name,
        booking: ciStay,
        balance: ciStay.balance_amount,
        checkoutGuestName: coStay.guest_name,
        checkoutBooking: coStay,
        checkoutBalance: coStay.balance_amount,
      })
      continue
    }

    // Active stay overlapping D — takes priority over historical checkout
    const activeOverlapping = activeBookings.find((b) => {
      const ci = toDateStr(b.check_in)
      const co = toDateStr(b.check_out)
      return ci <= dateStr && co > dateStr
    })

    // ── P3: CHECKOUT TODAY — only if no active stay currently occupies the room
    if (coStay && !activeOverlapping) {
      c.checkout_today++
      result.push({
        room, typeName, status: 'checkout_today',
        guestName: coStay.guest_name,
        booking: coStay,
        balance: coStay.balance_amount,
      })
      continue
    }

    // Stay overlapping D: check_in <= D AND check_out > D
    const overlapping = activeOverlapping ?? activeBookings.find((b) => {
      const ci = toDateStr(b.check_in)
      const co = toDateStr(b.check_out)
      return ci <= dateStr && co > dateStr
    })

    // ── P4: CHECKED_IN ───────────────────────────────────────────────
    if (overlapping?.status === 'CHECKED_IN') {
      c.checked_in++
      result.push({
        room, typeName, status: 'checked_in',
        guestName: overlapping.guest_name,
        booking: overlapping,
        balance: overlapping.balance_amount,
      })
      continue
    }

    // ── P5: RESERVED ─────────────────────────────────────────────────
    if (overlapping && (overlapping.status === 'RESERVED' || overlapping.status === 'ASSIGNED')) {
      c.reserved++
      result.push({
        room, typeName, status: 'reserved',
        guestName: overlapping.guest_name,
        booking: overlapping,
        balance: overlapping.balance_amount,
      })
      continue
    }

    // ── P6: AVAILABLE ────────────────────────────────────────────────
    c.available++
    result.push({ room, typeName, status: 'available' })
  }

  return { entries: result, counts: c }
}

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

// ─── Extracted memoized cards ────────────────────────────────────────────────

const PendingCheckinCard = React.memo(function PendingCheckinCard({
  ci,
  onAssign,
}: {
  ci: CheckinBooking
  onAssign: (bookingId: string) => void
}) {
  const isSingleRoom = ci.totalStays === 1
  const assignedCount = ci.totalStays - ci.unassignedCount
  const allAssigned = ci.unassignedCount === 0
  const progressPct = ci.totalStays > 0 ? (assignedCount / ci.totalStays) * 100 : 0

  return (
    <button
      key={ci.bookingId}
      type="button"
      onClick={() => onAssign(ci.bookingId)}
      className="w-full radius-card border border-primary/20 bg-accent/5 px-3 py-2.5 text-left active:bg-accent/10 transition-colors"
    >
      {/* Row 1: name + info */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-body font-semibold truncate">{ci.guestName}</span>
        <span className="text-helper shrink-0">
          {isSingleRoom ? `${ci.nights} คืน` : `${ci.totalStays} ห้อง · ${ci.nights} คืน`}
        </span>
      </div>

      {/* Row 2: type · assigned rooms + chevron */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center space-inline text-helper min-w-0">
          <span>{ci.typeName}</span>
          {ci.assignedRooms.length > 0 && (
            <>
              <span>·</span>
              <span className="font-medium text-foreground/70 truncate">
                ห้อง {ci.assignedRooms.join(', ')}
              </span>
            </>
          )}
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 ml-1" />
      </div>
      {ci.booking?.guest_phone && (
        <div className="flex items-center gap-1 text-helper text-primary mt-1">
          <Phone className="w-3 h-3" />{ci.booking.guest_phone}
        </div>
      )}

      {/* Row 3: mini progress bar + count (only if multi-room) */}
      {ci.totalStays > 1 && (
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 h-1 radius-badge bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full radius-badge transition-all duration-300',
                allAssigned ? 'bg-success' : 'bg-warning',
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-helper tabular-nums shrink-0">
            {assignedCount}/{ci.totalStays}
          </span>
        </div>
      )}
    </button>
  )
})

const DoneCheckinCard = React.memo(function DoneCheckinCard({
  ci,
  onNavigate,
}: {
  ci: CheckinBooking
  onNavigate: (bookingId: string) => void
}) {
  return (
    <div
      className="w-full radius-card border border-success/20 bg-success/5 px-3 py-2.5 opacity-60"
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
      <div className="flex items-center gap-3 mt-1">
        {ci.booking?.guest_phone && (
          <a href={`tel:${ci.booking.guest_phone}`} className="flex items-center gap-1 text-helper text-primary active:opacity-70">
            <Phone className="w-3 h-3" />{ci.booking.guest_phone}
          </a>
        )}
        <button type="button" onClick={() => onNavigate(ci.bookingId)} className="flex items-center gap-1 text-helper text-muted-foreground active:text-foreground">
          <ExternalLink className="w-3 h-3" />รายละเอียด
        </button>
      </div>
    </div>
  )
})

// ─── Props ────────────────────────────────────────────────────────────────────

interface MobileTimelineListProps {
  rooms: TimelineRoom[]
  selectedDateStr: string
  bookingColorMap: Record<string, string>
  roomTypeNameMap: Record<string, string>
  unassignedStays: UnassignedStay[]
  onSelectBooking: (booking: TimelineBooking, roomNumbers?: string[]) => void
  onQuickCheckOut?: (booking: TimelineBooking) => void
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const MobileTimelineList = React.memo(function MobileTimelineList({
  rooms,
  selectedDateStr,
  roomTypeNameMap,
  unassignedStays,
  onSelectBooking,
  onQuickCheckOut,
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
  const [expandedCheckoutId, setExpandedCheckoutId] = useState<string | null>(null)
  const [availCheckerOpen, setAvailCheckerOpen] = useState(false)

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
  // Alias to keep existing UI references working
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

    // Separate fully-checked-in bookings from pending
    const allCheckins = Array.from(checkinMap.values())
    const pendingCheckins = allCheckins.filter((ci) => {
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
            <div className="radius-card border border-amber-500/30 bg-amber-500/10 px-3 py-2 flex flex-col items-center">
              <span className="text-helper text-amber-400 leading-none mb-1">รอกำหนด</span>
              <span className="text-lg font-bold tabular-nums leading-none text-amber-400">
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
          เช็คเอาท์{viewingToday ? 'วันนี้' : ` ${fmtShort(selectedDate)}`}
          <Badge variant="amber" className="tabular-nums ml-0.5 text-micro px-1.5 py-0">
            {dateKPI.checkoutDone}/{dateKPI.checkoutTotal}
          </Badge>
        </div>

        <>

              {/* Pending checkouts */}
              {dateOps.checkouts.map((co) => {
                const hasBalance = co.balance > 0
                const isSingleRoom = co.stays.length === 1
                const pendingStays = co.stays.filter((s) => s.status === 'CHECKED_IN')
                const doneStays = co.stays.filter((s) => s.status === 'CHECKED_OUT')
                const isExpanded = expandedCheckoutId === co.bookingId

                // Single-room: flat card with inline checkout
                if (isSingleRoom) {
                  const stay = co.stays[0]
                  return (
                    <div
                      key={co.bookingId}
                      className="w-full radius-card border border-border bg-card px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-body font-semibold truncate">{co.guestName}</span>
                            <span className="text-helper shrink-0">{co.nights} คืน</span>
                          </div>
                          <p className="text-helper mt-0.5">ห้อง {stay.roomNumber}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {co.booking?.guest_phone && (
                              <a href={`tel:${co.booking.guest_phone}`} className="flex items-center gap-1 text-helper text-primary active:opacity-70">
                                <Phone className="w-3 h-3" />{co.booking.guest_phone}
                              </a>
                            )}
                            <button type="button" onClick={() => navigate(`/bookings/${co.bookingId}`)} className="flex items-center gap-1 text-helper text-muted-foreground active:text-foreground">
                              <ExternalLink className="w-3 h-3" />รายละเอียด
                            </button>
                          </div>
                        </div>
                        {onQuickCheckOut && stay.status === 'CHECKED_IN' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="h-8 px-3 text-sm font-semibold gap-1.5 shrink-0">
                                <LogOut className="w-3.5 h-3.5" />
                                เช็คเอาท์
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>ยืนยันเช็คเอาท์</AlertDialogTitle>
                                <AlertDialogDescription>
                                  เช็คเอาท์ {co.guestName} ห้อง {stay.roomNumber} ?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onQuickCheckOut(stay.booking)}>
                                  เช็คเอาท์
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                      {hasBalance && (
                        <p className="text-helper text-destructive font-medium mt-1">
                          ค้าง {formatTHBCurrency(co.balance)}
                        </p>
                      )}
                    </div>
                  )
                }

                // Multi-room: expandable
                return (
                  <div key={co.bookingId}>
                    <button
                      type="button"
                      onClick={() => setExpandedCheckoutId(isExpanded ? null : co.bookingId)}
                      className={cn(
                        'w-full radius-card border space-card text-left transition-colors',
                        isExpanded
                          ? 'border-border bg-card'
                          : 'border-border bg-card active:bg-accent/10',
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
                      <div className="flex items-center gap-3 mt-1" onClick={(e) => e.stopPropagation()}>
                        {co.booking?.guest_phone && (
                          <a href={`tel:${co.booking.guest_phone}`} className="flex items-center gap-1 text-helper text-primary active:opacity-70">
                            <Phone className="w-3 h-3" />{co.booking.guest_phone}
                          </a>
                        )}
                        <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); navigate(`/bookings/${co.bookingId}`) }} className="flex items-center gap-1 text-helper text-muted-foreground active:text-foreground cursor-pointer">
                          <ExternalLink className="w-3 h-3" />รายละเอียด
                        </span>
                      </div>
                      {hasBalance && (
                        <p className="text-helper text-destructive font-medium mt-1">
                          ค้าง {formatTHBCurrency(co.balance)}
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

                        {/* Pending stays */}
                        {pendingStays.map((stay) => (
                          <div
                            key={stay.roomStayId}
                            className="flex items-center justify-between radius-button border border-border bg-accent/5 px-3 py-2.5"
                          >
                            <span className="text-body font-bold tabular-nums">ห้อง {stay.roomNumber}</span>
                            {onQuickCheckOut && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-8 px-3 text-sm font-semibold gap-1.5">
                                    <LogOut className="w-3.5 h-3.5" />
                                    เช็คเอาท์
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>ยืนยันเช็คเอาท์</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      เช็คเอาท์ {co.guestName} ห้อง {stay.roomNumber} ?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onQuickCheckOut(stay.booking)}>
                                      เช็คเอาท์
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        ))}

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
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-helper">{co.nights} คืน</span>
                    <span className="text-helper text-success/80">เช็คเอาท์แล้ว</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {co.booking?.guest_phone && (
                      <a href={`tel:${co.booking.guest_phone}`} className="flex items-center gap-1 text-helper text-primary active:opacity-70">
                        <Phone className="w-3 h-3" />{co.booking.guest_phone}
                      </a>
                    )}
                    <button type="button" onClick={() => navigate(`/bookings/${co.bookingId}`)} className="flex items-center gap-1 text-helper text-muted-foreground active:text-foreground">
                      <ExternalLink className="w-3 h-3" />รายละเอียด
                    </button>
                  </div>
                </div>
              ))}
          </>
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
            <button
              key={booking.bookingId}
              type="button"
              onClick={() => setAssignSheetBookingId(booking.bookingId)}
              className="w-full radius-card border border-border bg-card px-3 py-2.5 text-left active:bg-muted/50 transition-colors"
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
            </button>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 3: ตรวจสอบห้องว่าง — collapsible
          ════════════════════════════════════════════════════════════════════ */}
      <div className="px-4 space-section">
        <button
          type="button"
          onClick={() => setAvailCheckerOpen((v) => !v)}
          className="w-full flex items-center justify-between py-2"
        >
          <span className="text-label text-muted-foreground">ตรวจสอบห้องว่าง</span>
          <ChevronDown className={cn(
            'w-4 h-4 text-muted-foreground/50 transition-transform',
            availCheckerOpen && 'rotate-180',
          )} />
        </button>
        {availCheckerOpen && (
          <StayAvailabilityCard range={stayRange} onRangeChange={setStayRange} />
        )}
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
              <button
                type="button"
                onClick={() => { setFreeRoomMode('selected'); setFilter('all') }}
                className={cn(
                  'px-2.5 py-1 text-caption transition-colors',
                  freeRoomMode === 'selected'
                    ? 'date-selected'
                    : 'bg-card text-muted-foreground date-hover',
                )}
              >
                วันที่เลือก
              </button>
              <button
                type="button"
                onClick={() => { setFreeRoomMode('range'); setFilter('all') }}
                disabled={!stayRangeValid}
                className={cn(
                  'px-2.5 py-1 text-caption transition-colors',
                  freeRoomMode === 'range'
                    ? 'date-selected'
                    : 'bg-card text-muted-foreground date-hover',
                  !stayRangeValid && 'date-disabled',
                )}
              >
                ช่วงเข้าพัก
              </button>
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
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFilter(value)}
                        className={cn(
                          'shrink-0 h-8 px-3 radius-badge text-caption transition-colors',
                          filter === value
                            ? 'date-selected'
                            : isZero
                              ? 'bg-secondary/40 text-muted-foreground/50'
                              : 'bg-secondary/70 text-secondary-foreground active:bg-secondary',
                        )}
                      >
                        {label} {count}
                      </button>
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
  const isInteractive = entry.status !== 'maintenance'
    && entry.status !== 'range_available'
    && entry.status !== 'range_occupied'
  const hasBalance = (entry.balance ?? 0) > 0
  const hasGuest = entry.status !== 'available' && entry.status !== 'maintenance'
    && entry.status !== 'range_available' && entry.status !== 'range_occupied'

  const isSimple = entry.status === 'available' || entry.status === 'maintenance'
    || entry.status === 'range_available' || entry.status === 'range_occupied'

  const cardClasses = cn(
    'w-full px-3',
    isSimple ? 'py-1.5' : 'py-2.5',
    cfg.cardClass,
  )

  const checkoutHasBalance = (entry.checkoutBalance ?? 0) > 0

  const cardBody = (
    <div className="flex items-center gap-3">
      {/* Left: room number (hero) */}
      <div className="shrink-0 w-10">
        <span className="text-room-number">
          {entry.room.room_number}
        </span>
      </div>

      {/* Center: type + guest info */}
      <div className="flex-1 min-w-0">
        <span className="text-helper leading-none">
          {entry.typeName}
        </span>
        {entry.status === 'turnover' ? (
          <div className="mt-0.5 space-y-0 text-helper leading-tight">
            <p className="text-warning truncate">
              ออก: {entry.checkoutGuestName}
              {checkoutHasBalance && (
                <span className="text-destructive font-medium ml-1">
                  {formatTHBCurrency(entry.checkoutBalance!)}
                </span>
              )}
            </p>
            <p className="text-primary truncate">เข้า: {entry.guestName}</p>
          </div>
        ) : hasGuest && (
          <div className="flex items-center gap-1 mt-0.5 text-helper leading-tight">
            {entry.guestName && <span className="truncate">{entry.guestName}</span>}
            {entry.booking && (
              <>
                {entry.guestName && <span>·</span>}
                <span className="shrink-0">
                  ออก {fmtShortISO(entry.booking.check_out)}
                  {' '}({differenceInDays(parseISO(entry.booking.check_out), parseISO(entry.booking.check_in))} คืน)
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right: balance + badge */}
      <div className="shrink-0 flex flex-col items-end gap-0.5">
        <Badge variant={cfg.badge} className="text-helper px-2 py-0 leading-relaxed">
          {cfg.label}
        </Badge>
        {hasBalance && (
          <span className="text-helper text-destructive font-medium tabular-nums">
            ค้าง {formatTHBCurrency(entry.balance!)}
          </span>
        )}
      </div>
    </div>
  )

  if (isInteractive) {
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
