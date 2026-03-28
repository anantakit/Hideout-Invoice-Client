// timeline/domain/roomFiltering.ts — pure functions for room filtering & range classification

import type { UnassignedStay } from '@/features/bookings/types'
import type { DateRange } from '@/features/bookings/shared/components/DateRangePicker'
import { toDateStr } from '../utils/operationTypes'
import { overlapsRange, type RoomEntry, type RangeStatus } from '../utils/classifyRooms'

// ── Types ────────────────────────────────────────────────────────────────────

export type RangeCounts = Record<RangeStatus, number>

// ── Functions ────────────────────────────────────────────────────────────────

/**
 * Count unassigned stays that overlap a given date (excluding cancelled/checked-out).
 */
export function countUnassignedForDate(
  unassignedStays: UnassignedStay[],
  dateStr: string,
): number {
  let count = 0
  for (const s of unassignedStays) {
    const ci = toDateStr(s.check_in)
    const co = toDateStr(s.check_out)
    if (ci <= dateStr && co > dateStr && s.status !== 'CANCELLED' && s.status !== 'CHECKED_OUT') {
      count++
    }
  }
  return count
}

/**
 * Classify rooms for "ช่วงเข้าพัก" (stay range) mode.
 * Each room becomes range_available, range_occupied, or maintenance.
 */
export function buildRangeEntries(
  entries: RoomEntry[],
  stayRange: DateRange,
): { entries: RoomEntry[]; counts: RangeCounts } {
  const result: RoomEntry[] = []
  const c: RangeCounts = { range_available: 0, range_occupied: 0, maintenance: 0 }
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
}

/**
 * Filter entries by status. Returns all entries when filter is 'all'.
 */
export function filterEntriesByStatus(
  entries: RoomEntry[],
  filter: string,
): RoomEntry[] {
  return filter === 'all' ? entries : entries.filter((e) => e.status === filter)
}
