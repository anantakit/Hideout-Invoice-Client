// timeline/domain/computeState.ts — pure derived computations for useTimelineState
// No React imports. No API calls.

import { addDays, subDays } from 'date-fns'
import type {
  TimelineRoom,
  UnassignedStay,
  AvailabilityGroupedRoomType,
} from '@/features/bookings/types'
import { computeRoomLayout } from '../utils/bookingLayout'
import { getStatusColorClass } from '../utils/statusColors'

// ── 1. Booking room count ────────────────────────────────────────────────────

/**
 * Count how many distinct rooms each booking spans.
 * Returns Record<booking_id, room_count>.
 */
export function buildBookingRoomCountMap(
  allRooms: ReadonlyArray<TimelineRoom>,
): Record<string, number> {
  const roomSets: Record<string, Set<string>> = {}
  for (const room of allRooms) {
    for (const b of room.bookings) {
      if (!roomSets[b.booking_id]) roomSets[b.booking_id] = new Set()
      roomSets[b.booking_id].add(room.id)
    }
  }
  const counts: Record<string, number> = {}
  for (const [bid, s] of Object.entries(roomSets)) counts[bid] = s.size
  return counts
}

// ── 2. Booking color map ─────────────────────────────────────────────────────

/**
 * Map each room_stay_id → CSS color class based on booking status.
 */
export function buildBookingColorMap(
  allRooms: ReadonlyArray<TimelineRoom>,
): Record<string, string> {
  const colors: Record<string, string> = {}
  for (const room of allRooms) {
    for (const b of room.bookings) {
      colors[b.room_stay_id] = getStatusColorClass(b.status)
    }
  }
  return colors
}

// ── 3. Room layer count map ──────────────────────────────────────────────────

/**
 * Compute number of overlapping booking layers per room (for row height sizing).
 */
export function buildRoomLayerCountMap(
  allRooms: ReadonlyArray<TimelineRoom>,
  fromStr: string,
  toStr: string,
): Record<string, number> {
  const map: Record<string, number> = {}
  for (const room of allRooms) {
    if (room.bookings.length <= 1) {
      map[room.id] = room.bookings.length
    } else {
      const layout = computeRoomLayout(room.bookings, fromStr, toStr)
      map[room.id] = layout.totalLayers
    }
  }
  return map
}

// ── 4. Room maps ─────────────────────────────────────────────────────────────

export interface RoomMaps {
  roomTypeIdByRoomId: Record<string, string>
  roomTypeNameByRoomId: Record<string, string>
  priceByRoomTypeId: Record<string, number>
}

/**
 * Build lookup maps from availability-grouped room types.
 */
export function buildRoomMaps(
  availRoomTypes: ReadonlyArray<AvailabilityGroupedRoomType>,
): RoomMaps {
  const idMap: Record<string, string> = {}
  const nameMap: Record<string, string> = {}
  const priceMap: Record<string, number> = {}
  for (const rt of availRoomTypes) {
    priceMap[rt.room_type_id] = rt.price_per_night
    for (const r of rt.rooms) {
      idMap[r.room_id] = rt.room_type_id
      nameMap[r.room_id] = rt.room_type_name
    }
  }
  return {
    roomTypeIdByRoomId: idMap,
    roomTypeNameByRoomId: nameMap,
    priceByRoomTypeId: priceMap,
  }
}

// ── 5. Filter rooms by type ──────────────────────────────────────────────────

/**
 * Filter rooms to only those matching selectedTypeId.
 * Returns all rooms when selectedTypeId is null.
 */
export function filterRoomsByType(
  allRooms: ReadonlyArray<TimelineRoom>,
  selectedTypeId: string | null,
  roomTypeIdByRoomId: Record<string, string>,
): TimelineRoom[] {
  if (!selectedTypeId) return [...allRooms]
  return allRooms.filter((r) => roomTypeIdByRoomId[r.id] === selectedTypeId)
}

// ── 6. Mobile date strip ─────────────────────────────────────────────────────

/**
 * Build an array of dates for the mobile horizontal date strip.
 */
export function buildMobileDateStrip(
  mobileAnchor: Date,
  stripDays: number,
  centerOffset: number,
): Date[] {
  const start = subDays(mobileAnchor, centerOffset)
  return Array.from({ length: stripDays }, (_, i) => addDays(start, i))
}

// ── 7. Today pending check-in count ──────────────────────────────────────────

/**
 * Count bookings that need check-in today:
 *  - Unassigned stays checking in today (not CANCELLED/CHECKED_OUT)
 *  - Assigned stays checking in today with status RESERVED or ASSIGNED
 */
export function calculateTodayPendingCheckinCount(
  unassignedStays: ReadonlyArray<UnassignedStay>,
  allRooms: ReadonlyArray<TimelineRoom>,
  todayStr: string,
): number {
  let count = 0
  count += unassignedStays.filter(
    (s) =>
      s.check_in.slice(0, 10) === todayStr &&
      s.status !== 'CANCELLED' &&
      s.status !== 'CHECKED_OUT',
  ).length
  for (const room of allRooms) {
    for (const b of room.bookings) {
      if (
        b.check_in.slice(0, 10) === todayStr &&
        (b.status === 'RESERVED' || b.status === 'ASSIGNED')
      ) {
        count++
      }
    }
  }
  return count
}
