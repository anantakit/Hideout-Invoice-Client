import { useReducer, useMemo, useEffect } from 'react'
import { todayISO as todayISOUtil, addDaysISO } from '@/shared/utils'
import type { UnassignedStay } from '../../types'
import type { DateRange } from '../../shared/components/DateRangePicker'
import { toDateStr } from '../utils/operationTypes'
import { overlapsRange, ALL_FILTERS, RANGE_FILTERS, type FilterValue, type RoomEntry, type RoomCounts } from '../utils/classifyRooms'

// ── State & Actions ───────────────────────────────────────────────────────────

export interface MobileFilterState {
  filter: FilterValue
  freeRoomMode: 'selected' | 'range'
  stayRange: DateRange
  assignSheetBookingId: string | null
  checkoutSheetBookingId: string | null
  checkinExpanded: boolean
  checkoutExpanded: boolean
}

export type MobileFilterAction =
  | { type: 'SET_FILTER'; value: FilterValue }
  | { type: 'SWITCH_MODE'; mode: 'selected' | 'range' }
  | { type: 'SET_STAY_RANGE'; value: DateRange }
  | { type: 'OPEN_ASSIGN_SHEET'; bookingId: string }
  | { type: 'CLOSE_ASSIGN_SHEET' }
  | { type: 'OPEN_CHECKOUT_SHEET'; bookingId: string }
  | { type: 'CLOSE_CHECKOUT_SHEET' }
  | { type: 'TOGGLE_CHECKIN' }
  | { type: 'TOGGLE_CHECKOUT' }
  | { type: 'RESET_EXPANDED'; checkinAllDone: boolean; checkoutAllDone: boolean }

function reducer(state: MobileFilterState, action: MobileFilterAction): MobileFilterState {
  switch (action.type) {
    case 'SET_FILTER':
      return { ...state, filter: action.value }
    case 'SWITCH_MODE':
      return { ...state, freeRoomMode: action.mode, filter: 'all' }
    case 'SET_STAY_RANGE':
      return { ...state, stayRange: action.value }
    case 'OPEN_ASSIGN_SHEET':
      return { ...state, assignSheetBookingId: action.bookingId }
    case 'CLOSE_ASSIGN_SHEET':
      return { ...state, assignSheetBookingId: null }
    case 'OPEN_CHECKOUT_SHEET':
      return { ...state, checkoutSheetBookingId: action.bookingId }
    case 'CLOSE_CHECKOUT_SHEET':
      return { ...state, checkoutSheetBookingId: null }
    case 'TOGGLE_CHECKIN':
      return { ...state, checkinExpanded: !state.checkinExpanded }
    case 'TOGGLE_CHECKOUT':
      return { ...state, checkoutExpanded: !state.checkoutExpanded }
    case 'RESET_EXPANDED':
      return { ...state, checkinExpanded: !action.checkinAllDone, checkoutExpanded: !action.checkoutAllDone }
  }
}

const INITIAL_STATE: MobileFilterState = {
  filter: 'all',
  freeRoomMode: 'selected',
  stayRange: { checkIn: todayISOUtil(), checkOut: addDaysISO(1) },
  assignSheetBookingId: null,
  checkoutSheetBookingId: null,
  checkinExpanded: true,
  checkoutExpanded: true,
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMobileTimelineFilters(
  selectedDateStr: string,
  checkinAllDone: boolean,
  checkoutAllDone: boolean,
  entries: RoomEntry[],
  counts: RoomCounts,
  unassignedStays: UnassignedStay[],
) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  // Reset expanded state when date changes
  useEffect(() => {
    dispatch({ type: 'RESET_EXPANDED', checkinAllDone, checkoutAllDone })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDateStr])

  const { filter, freeRoomMode, stayRange } = state
  const stayRangeValid = !!(stayRange.checkIn && stayRange.checkOut && stayRange.checkOut > stayRange.checkIn)

  // ── Unassigned stays overlapping selectedDate ──
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

  // ── Range entries (for "ช่วงเข้าพัก" mode) ──
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

  // ── Displayed & filtered entries ──
  const displayedEntries = freeRoomMode === 'range' && stayRangeValid
    ? rangeEntries.entries
    : entries

  const filtered = useMemo(
    () => filter === 'all' ? displayedEntries : displayedEntries.filter((e) => e.status === filter),
    [displayedEntries, filter],
  )

  const total = displayedEntries.length
  const chipList = freeRoomMode === 'range' && stayRangeValid ? RANGE_FILTERS : ALL_FILTERS
  const chipCounts = freeRoomMode === 'range' && stayRangeValid ? rangeEntries.counts : counts

  return { state, dispatch, stayRangeValid, filtered, total, chipList, chipCounts, unassignedForDate }
}
