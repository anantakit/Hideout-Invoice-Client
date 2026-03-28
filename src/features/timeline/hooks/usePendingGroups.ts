import { useMemo } from 'react'
import { todayISO, addDaysISO } from '@/shared/utils'
import type { UnassignedStay } from '@/features/bookings/types'
import { toDateStr } from '../utils/operationTypes'
import {
  groupUnassignedStaysByBooking,
  createDateSections,
} from '../domain/stayAggregation'

// Re-export types so consumers don't need to change imports
export type { PendingBookingGroup, PendingDateSectionData } from '../domain/stayAggregation'

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePendingGroups(unassignedStays: UnassignedStay[]) {
  const todayStr = todayISO()
  const tomorrowStr = addDaysISO(1)

  const grouped = useMemo(
    () => groupUnassignedStaysByBooking(unassignedStays, todayStr),
    [unassignedStays, todayStr],
  )

  const sections = useMemo(
    () => createDateSections(grouped, todayStr, tomorrowStr),
    [grouped, todayStr, tomorrowStr],
  )

  const totalStays = unassignedStays.filter(
    (s) => s.status !== 'CANCELLED' && s.status !== 'CHECKED_OUT' && toDateStr(s.check_in) !== todayStr,
  ).length

  return { sections, totalStays, todayStr }
}
