import { parseISO, differenceInDays } from 'date-fns'
import type { TimelineRoom, UnassignedStay } from '../../types'
import { toDateStr, type CheckinBooking, type CheckoutBooking, type CheckoutStay } from './operationTypes'

/**
 * Compute check-in / check-out operations for a given date.
 * Shared between DesktopOperationsPanel and MobileTimelineList.
 *
 * Handles early checkouts by using `checked_out_at` when available
 * instead of the scheduled `check_out` date.
 */
export function computeDateOps(
  rooms: TimelineRoom[],
  unassignedStays: UnassignedStay[],
  selectedDateStr: string,
  roomTypeNameMap: Record<string, string>,
): {
  checkins: CheckinBooking[]
  doneCheckins: CheckinBooking[]
  checkouts: CheckoutBooking[]
  doneCheckouts: CheckoutBooking[]
} {
  const checkinMap = new Map<string, CheckinBooking>()
  const checkoutMap = new Map<string, CheckoutBooking>()

  for (const room of rooms) {
    if (room.status === 'MAINTENANCE') continue

    for (const b of room.bookings) {
      const ci = toDateStr(b.check_in)
      const co = toDateStr(b.check_out)

      // Check-in on selectedDate
      if (ci === selectedDateStr) {
        const stayNights = differenceInDays(parseISO(b.check_out), parseISO(b.check_in))
        const existing = checkinMap.get(b.booking_id)
        if (existing) {
          existing.assignedRooms.push(room.room_number)
          existing.stayStatuses.push(b.status)
          existing.roomNights.push({ roomNumber: room.room_number, nights: stayNights })
          existing.totalStays++
        } else {
          checkinMap.set(b.booking_id, {
            bookingId: b.booking_id,
            guestName: b.guest_name,
            typeName: roomTypeNameMap[room.id] ?? '',
            nights: stayNights,
            assignedRooms: [room.room_number],
            unassignedCount: 0,
            totalStays: 1,
            stayStatuses: [b.status],
            roomNights: [{ roomNumber: room.room_number, nights: stayNights }],
            unassignedTypes: [],
            booking: b,
            roomStayId: b.room_stay_id,
            roomId: room.id,
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
            keyDepositAmount: b.key_deposit_amount,
            depositStatus: b.deposit_status,
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
        existing.unassignedTypes.push(s.room_type_name)
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
          roomNights: [],
          unassignedTypes: [s.room_type_name],
          booking: {
            room_stay_id: '', booking_id: s.booking_id, guest_name: s.guest_name,
            check_in: s.check_in, check_out: s.check_out, status: s.status,
            balance_amount: s.balance_amount, key_deposit_amount: s.key_deposit_amount,
            deposit_status: s.deposit_status, source: '',
          },
        })
      }
    }
  }

  // Separate fully-checked-in bookings from pending.
  // A booking is "done" only when ALL its stays are CHECKED_IN or CHECKED_OUT.
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
}
