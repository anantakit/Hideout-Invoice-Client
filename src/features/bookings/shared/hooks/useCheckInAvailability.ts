import { useMemo } from 'react'
import type { RoomStayResponse } from '../../types'
import { useAvailabilityGrouped } from '../../hooks'

// ── Types ────────────────────────────────────────────────────────────────────

interface AvailableRoom {
  room_id: string
  room_number: string
  available: boolean
}

interface CheckInSharedData {
  roomsByType: Map<string, AvailableRoom[]>
  selectedRoomIds: Set<string>
  availabilityLoading: boolean
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCheckInAvailability(
  bookingId: string,
  pendingStays: RoomStayResponse[],
  unassignedCount: number,
  selections: Record<string, string>,
): CheckInSharedData {
  const checkInDate = pendingStays.reduce((min, s) => (s.check_in < min ? s.check_in : min), pendingStays[0].check_in)
  const checkOutDate = pendingStays.reduce((max, s) => (s.check_out > max ? s.check_out : max), pendingStays[0].check_out)

  const { data: availability, isLoading: availabilityLoading } =
    useAvailabilityGrouped(checkInDate, checkOutDate, unassignedCount > 0, bookingId)

  const roomsByType = useMemo(() => {
    const map = new Map<string, AvailableRoom[]>()
    if (availability) {
      for (const rt of availability.room_types) {
        map.set(rt.room_type_id, rt.rooms.map((r) => ({ room_id: r.room_id, room_number: r.room_number, available: r.available })))
      }
    }
    return map
  }, [availability])

  const selectedRoomIds = useMemo(() => {
    const set = new Set<string>()
    for (const stay of pendingStays) { const rid = selections[stay.id] || stay.room_id; if (rid) set.add(rid) }
    return set
  }, [pendingStays, selections])

  return { roomsByType, selectedRoomIds, availabilityLoading }
}
