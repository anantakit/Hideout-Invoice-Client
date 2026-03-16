import type { TimelineRoom, TimelineBooking } from '../../types'
import { toDateStr } from './operationTypes'

// ─── Types ───────────────────────────────────────────────────────────────────

export type RoomStatus = 'available' | 'reserved' | 'checked_in' | 'checkout_today' | 'turnover' | 'maintenance'
export type RangeStatus = 'range_available' | 'range_occupied' | 'maintenance'
export type FilterValue = RoomStatus | RangeStatus | 'all'

export interface RoomEntry {
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

export type RoomCounts = Record<RoomStatus, number>

export const STATUS_CFG: Record<RoomStatus | RangeStatus, {
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

export const ALL_FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all',           label: 'ทั้งหมด' },
  { value: 'available',     label: 'ว่าง' },
  { value: 'reserved',      label: 'จองแล้ว' },
  { value: 'checked_in',    label: 'เข้าพัก' },
  { value: 'checkout_today', label: 'เช็คเอาท์' },
  { value: 'turnover',      label: 'เปลี่ยนแขก' },
  { value: 'maintenance',   label: 'ปิดปรับปรุง' },
]

export const RANGE_FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all',             label: 'ทั้งหมด' },
  { value: 'range_available', label: 'ว่าง' },
  { value: 'range_occupied',  label: 'ไม่ว่าง' },
  { value: 'maintenance',     label: 'ปิดปรับปรุง' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function overlapsRange(stay: { check_in: string; check_out: string }, rangeStart: string, rangeEnd: string): boolean {
  const ci = toDateStr(stay.check_in)
  const co = toDateStr(stay.check_out)
  return ci < rangeEnd && co > rangeStart
}

// ─── Main classification ─────────────────────────────────────────────────────

/**
 * Classify every room into exactly ONE state using strict priority evaluation.
 * Single source of truth for KPI, room list, and filter chips.
 *
 * Priority order (first match wins):
 *   P1  ปิดปรับปรุง   room.status IN (MAINTENANCE, CLEANING)
 *   P2  เปลี่ยนแขก    EXISTS stay check_out=D AND EXISTS stay check_in=D (different booking)
 *   P3  เช็คเอาท์      EXISTS stay check_out=D (and not turnover)
 *   P4  เข้าพัก        stay.status=CHECKED_IN AND overlaps D
 *   P5  จองแล้ว       stay.status IN (RESERVED,ASSIGNED) AND overlaps D
 *   P6  ว่าง          none of the above
 */
export function classifyRooms(
  rooms: TimelineRoom[],
  dateStr: string,
  roomTypeNameMap: Record<string, string>,
): { entries: RoomEntry[]; counts: RoomCounts } {
  const result: RoomEntry[] = []
  const c: RoomCounts = { available: 0, reserved: 0, checked_in: 0, checkout_today: 0, turnover: 0, maintenance: 0 }

  for (const room of rooms) {
    const typeName = roomTypeNameMap[room.id] ?? ''

    if (room.status === 'MAINTENANCE') {
      c.maintenance++
      result.push({ room, typeName, status: 'maintenance' })
      continue
    }

    const activeBookings = room.bookings.filter(
      (b) => b.status !== 'CHECKED_OUT' && b.status !== 'CANCELLED',
    )
    const nonCancelled = room.bookings.filter((b) => b.status !== 'CANCELLED')

    const coStay = nonCancelled.find((b) => {
      const coDate = b.status === 'CHECKED_OUT' && b.checked_out_at
        ? toDateStr(b.checked_out_at)
        : toDateStr(b.check_out)
      return coDate === dateStr
    })
    const ciStay = activeBookings.find((b) => toDateStr(b.check_in) === dateStr)

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

    const activeOverlapping = activeBookings.find((b) => {
      const ci = toDateStr(b.check_in)
      const co = toDateStr(b.check_out)
      return ci <= dateStr && co > dateStr
    })

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

    const overlapping = activeOverlapping ?? activeBookings.find((b) => {
      const ci = toDateStr(b.check_in)
      const co = toDateStr(b.check_out)
      return ci <= dateStr && co > dateStr
    })

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

    c.available++
    result.push({ room, typeName, status: 'available' })
  }

  return { entries: result, counts: c }
}
