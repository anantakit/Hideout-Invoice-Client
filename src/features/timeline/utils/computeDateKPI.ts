import type { TimelineRoom, UnassignedStay } from '@/features/bookings/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DateKPI {
  /** Total active rooms (excluding MAINTENANCE) */
  total: number
  /** Rooms with an assigned stay overlapping the date */
  occupied: number
  /** Unassigned reservations overlapping the date */
  unassigned: number
  /** Rooms bookable for new guests = total - occupied - unassigned */
  available: number
  /** occupied / total as percentage */
  occupancyPct: number
  /** Breakdown per room type */
  byType: { name: string; total: number; available: number }[]
  /** Check-in progress for the date */
  checkinTotal: number
  checkinDone: number
  /** Check-out progress for the date */
  checkoutTotal: number
  checkoutDone: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(s: string): string {
  return s.slice(0, 10)
}

// ─── Main computation ─────────────────────────────────────────────────────────

/**
 * Single source of truth for all date-based KPI metrics.
 * Used by TimelinePage (toolbar), DesktopOperationsPanel (drawer),
 * and MobileTimelineList.
 */
export function computeDateKPI(
  rooms: TimelineRoom[],
  unassignedStays: UnassignedStay[],
  dateStr: string,
  roomTypeNameMap: Record<string, string>,
): DateKPI {
  let physicallyAvailable = 0
  let checkinTotal = 0
  let checkinDone = 0
  let checkoutTotal = 0
  let checkoutDone = 0

  const byType = new Map<string, { total: number; available: number }>()
  let totalActive = 0

  for (const room of rooms) {
    if (room.status === 'MAINTENANCE') continue
    totalActive++

    const typeName = roomTypeNameMap[room.id] ?? ''
    const t = byType.get(typeName) ?? { total: 0, available: 0 }
    t.total++

    const activeBookings = room.bookings.filter(
      (b) => b.status !== 'CHECKED_OUT' && b.status !== 'CANCELLED',
    )
    const nonCancelled = room.bookings.filter((b) => b.status !== 'CANCELLED')

    // Checkout today — for CHECKED_OUT stays, use actual checkout date
    const coStay = nonCancelled.find((b) => {
      const coDate = b.status === 'CHECKED_OUT' && b.checked_out_at
        ? toDateStr(b.checked_out_at)
        : toDateStr(b.check_out)
      return coDate === dateStr
    })

    // Active stay overlapping the date
    const activeOverlapping = activeBookings.find((b) => {
      const ci = toDateStr(b.check_in)
      const co = toDateStr(b.check_out)
      return ci <= dateStr && co > dateStr
    })

    // Classify for "available" count:
    // "ว่าง" = รับ booking ใหม่ได้ (ไม่ใช่แค่ว่างตอนนี้)
    // - Turnover (checkout + incoming checkin same day): NOT available
    // - Checkout today (ยังไม่ออก or ออกแล้ว) with no new checkin: available
    // - Active overlapping stay: NOT available
    // - Otherwise: available
    if (coStay && activeBookings.find((b) => toDateStr(b.check_in) === dateStr && coStay.booking_id !== b.booking_id)) {
      // turnover — not available (มีคนเข้าใหม่ห้องเดียวกันวันนี้)
    } else if (coStay && !activeOverlapping) {
      // checkout วันนี้ ไม่มีคนเข้าใหม่ → ว่างรับ booking ได้
      physicallyAvailable++; t.available++
    } else if (activeOverlapping) {
      // occupied — not available
    } else {
      physicallyAvailable++
      t.available++
    }

    byType.set(typeName, t)

    // Check-in / check-out counting
    for (const b of room.bookings) {
      if (b.status === 'CANCELLED') continue
      if (toDateStr(b.check_in) === dateStr && b.status !== 'CHECKED_OUT') {
        checkinTotal++
        if (b.status === 'CHECKED_IN') checkinDone++
      }
      const coDate = b.status === 'CHECKED_OUT' && b.checked_out_at
        ? toDateStr(b.checked_out_at)
        : toDateStr(b.check_out)
      if (coDate === dateStr) {
        checkoutTotal++
        if (b.status === 'CHECKED_OUT') checkoutDone++
      }
    }
  }

  // Unassigned stays — checkin counting + inventory consumption per type
  let unassignedCount = 0
  const unassignedByType = new Map<string, number>()
  for (const s of unassignedStays) {
    if (toDateStr(s.check_in) === dateStr) {
      checkinTotal++
      if (s.status === 'CHECKED_IN' || s.status === 'CHECKED_OUT') checkinDone++
    }
    const ci = toDateStr(s.check_in)
    const co = toDateStr(s.check_out)
    if (ci <= dateStr && co > dateStr && s.status !== 'CANCELLED' && s.status !== 'CHECKED_OUT') {
      unassignedCount++
      unassignedByType.set(s.room_type_name, (unassignedByType.get(s.room_type_name) ?? 0) + 1)
    }
  }

  const occupied = totalActive - physicallyAvailable
  const available = Math.max(0, physicallyAvailable - unassignedCount)
  const occupancyPct = totalActive > 0 ? Math.round((occupied / totalActive) * 100) : 0

  return {
    total: totalActive,
    occupied,
    unassigned: unassignedCount,
    available,
    occupancyPct,
    byType: Array.from(byType.entries()).map(([name, v]) => ({
      name,
      total: v.total,
      available: Math.max(0, v.available - (unassignedByType.get(name) ?? 0)),
    })),
    checkinTotal,
    checkinDone,
    checkoutTotal,
    checkoutDone,
  }
}
