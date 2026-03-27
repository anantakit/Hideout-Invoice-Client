import { useMemo } from 'react'
import { parseISO, differenceInDays } from 'date-fns'
import { todayISO, addDaysISO, fmtShort } from '@/shared/utils'
import type { UnassignedStay } from '../../types'
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

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePendingGroups(unassignedStays: UnassignedStay[]) {
  const todayStr = todayISO()

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

  const sections = useMemo(() => {
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
        const d = parseISO(dateStr)
        const label =
          dateStr === todayStr ? 'วันนี้' :
          dateStr === addDaysISO(1) ? 'พรุ่งนี้' :
          fmtShort(d)
        const isUrgent = dateStr <= todayStr
        const stayCount = bookings.reduce((sum, b) => sum + b.totalRooms, 0)
        return { dateStr, label, isUrgent, bookings, stayCount } as PendingDateSectionData
      })
  }, [grouped, todayStr])

  const totalStays = unassignedStays.filter(
    (s) => s.status !== 'CANCELLED' && s.status !== 'CHECKED_OUT' && toDateStr(s.check_in) !== todayStr,
  ).length

  return { sections, totalStays, todayStr }
}
