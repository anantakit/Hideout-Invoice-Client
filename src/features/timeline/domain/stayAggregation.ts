// timeline/domain/stayAggregation.ts — pure functions for stay grouping & date sections

import { parseISO, differenceInDays } from 'date-fns'
import { fmtShort } from '@/shared/utils'
import type { UnassignedStay } from '@/features/bookings/types'
import { toDateStr } from '../utils/operationTypes'

// ── Types ────────────────────────────────────────────────────────────────────

export interface PendingBookingGroup {
  bookingId: string
  guestName: string
  checkIn: string
  checkOut: string
  roomTypeNames: string[]
  totalRooms: number
  nights: number
}

export interface PendingDateSectionData {
  dateStr: string
  label: string
  isUrgent: boolean
  bookings: PendingBookingGroup[]
  stayCount: number
}

// ── Pure Functions ───────────────────────────────────────────────────────────

export function groupUnassignedStaysByBooking(
  stays: UnassignedStay[],
  todayStr: string,
): PendingBookingGroup[] {
  const map = new Map<string, PendingBookingGroup>()
  for (const s of stays) {
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
}

export function formatDateLabel(
  dateStr: string,
  todayStr: string,
  tomorrowStr: string,
): string {
  if (dateStr === todayStr) return 'วันนี้'
  if (dateStr === tomorrowStr) return 'พรุ่งนี้'
  return fmtShort(parseISO(dateStr))
}

export function createDateSections(
  grouped: PendingBookingGroup[],
  todayStr: string,
  tomorrowStr: string,
): PendingDateSectionData[] {
  const dateMap = new Map<string, PendingBookingGroup[]>()
  for (const g of grouped) {
    const key = g.checkIn
    const arr = dateMap.get(key) ?? []
    arr.push(g)
    dateMap.set(key, arr)
  }
  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateStr, bookings]) => {
      const label = formatDateLabel(dateStr, todayStr, tomorrowStr)
      const isUrgent = dateStr <= todayStr
      const stayCount = bookings.reduce((sum, b) => sum + b.totalRooms, 0)
      return { dateStr, label, isUrgent, bookings, stayCount }
    })
}
