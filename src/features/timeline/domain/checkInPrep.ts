// timeline/domain/checkInPrep.ts — pure functions for check-in panel data preparation

import type { RoomStayResponse, AvailabilityGroupedResponse } from '@/features/bookings/types'

// ── Types ────────────────────────────────────────────────────────────────────

export interface PartitionedStays {
  unassignedStays: RoomStayResponse[]
  assignedStays: RoomStayResponse[]
  checkedInStays: RoomStayResponse[]
  totalActive: number
}

export interface RoomTypeGroup {
  typeId: string
  typeName: string
  rooms: { room_id: string; room_number: string; available: boolean }[]
}

// ── Functions ────────────────────────────────────────────────────────────────

/** Partition active (non-cancelled, non-checked-out) stays by assignment status. */
export function partitionStaysByStatus(stays: RoomStayResponse[]): PartitionedStays {
  const active = stays.filter((s) => s.status !== 'CANCELLED' && s.status !== 'CHECKED_OUT')
  return {
    unassignedStays: active.filter((s) => s.status === 'RESERVED' && !s.room_id),
    assignedStays: active.filter((s) => (s.status === 'RESERVED' || s.status === 'ASSIGNED') && s.room_id),
    checkedInStays: active.filter((s) => s.status === 'CHECKED_IN'),
    totalActive: active.length,
  }
}

/** Extract check-in/check-out date strings from the first available stay (unassigned → assigned → checkedIn). */
export function extractCheckInCheckOutDates(
  unassignedStays: RoomStayResponse[],
  assignedStays: RoomStayResponse[],
  checkedInStays: RoomStayResponse[],
): { checkIn: string; checkOut: string } {
  const representative = unassignedStays[0] ?? assignedStays[0] ?? checkedInStays[0]
  return {
    checkIn: representative?.check_in?.slice(0, 10) ?? '',
    checkOut: representative?.check_out?.slice(0, 10) ?? '',
  }
}

/** Collect room IDs already assigned to any stay in the booking. */
export function extractAssignedRoomIds(roomStays: RoomStayResponse[]): Set<string> {
  return new Set(roomStays.filter((s) => s.room_id).map((s) => s.room_id!))
}

/** Build list of room type groups filtered to needed types, excluding already-assigned rooms. */
export function buildAvailableRoomsByType(
  availability: AvailabilityGroupedResponse | undefined,
  neededTypeIds: Set<string>,
  assignedRoomIds: Set<string>,
): RoomTypeGroup[] {
  if (!availability) return []
  return availability.room_types
    .filter((rt) => neededTypeIds.has(rt.room_type_id))
    .map((rt) => ({
      typeId: rt.room_type_id,
      typeName: rt.room_type_name,
      rooms: rt.rooms.filter((r) => r.available && !assignedRoomIds.has(r.room_id)),
    }))
    .filter((rt) => rt.rooms.length > 0)
}
