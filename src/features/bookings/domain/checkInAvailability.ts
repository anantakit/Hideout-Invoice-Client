// ── Check-in availability — pure functions ──────────────────────────────────

import type { RoomStayResponse, AvailabilityGroupedResponse } from '../types'

// ── Types ───────────────────────────────────────────────────────────────────

export interface AvailableRoom {
  room_id: string
  room_number: string
  available: boolean
}

export interface DateRange {
  checkIn: string
  checkOut: string
}

// ── Functions ───────────────────────────────────────────────────────────────

/** Extract the earliest check-in and latest check-out from a list of stays. */
export function extractDateRange(stays: RoomStayResponse[]): DateRange {
  const checkIn = stays.reduce((min, s) => (s.check_in < min ? s.check_in : min), stays[0].check_in)
  const checkOut = stays.reduce((max, s) => (s.check_out > max ? s.check_out : max), stays[0].check_out)
  return { checkIn, checkOut }
}

/** Build a map of room-type ID → available rooms from grouped availability data. */
export function buildRoomsByTypeMap(availability: AvailabilityGroupedResponse): Map<string, AvailableRoom[]> {
  const map = new Map<string, AvailableRoom[]>()
  for (const rt of availability.room_types) {
    map.set(rt.room_type_id, rt.rooms.map((r) => ({ room_id: r.room_id, room_number: r.room_number, available: r.available })))
  }
  return map
}

/** Collect room IDs that are currently selected (from explicit selections or existing assignments). */
export function extractSelectedRoomIds(
  stays: RoomStayResponse[],
  selections: Record<string, string>,
): Set<string> {
  const set = new Set<string>()
  for (const stay of stays) {
    const rid = selections[stay.id] || stay.room_id
    if (rid) set.add(rid)
  }
  return set
}
