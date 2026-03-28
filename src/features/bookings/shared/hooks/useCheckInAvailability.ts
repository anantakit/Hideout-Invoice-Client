import { useMemo } from 'react'
import type { RoomStayResponse } from '../../types'
import { useAvailabilityGrouped } from '../../hooks'
import {
  type AvailableRoom,
  extractDateRange,
  buildRoomsByTypeMap,
  extractSelectedRoomIds,
} from '../../domain/checkInAvailability'

// ── Types ────────────────────────────────────────────────────────────────────

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
  const { checkIn, checkOut } = extractDateRange(pendingStays)

  const { data: availability, isLoading: availabilityLoading } =
    useAvailabilityGrouped(checkIn, checkOut, unassignedCount > 0, bookingId)

  const roomsByType = useMemo(
    () => (availability ? buildRoomsByTypeMap(availability) : new Map<string, AvailableRoom[]>()),
    [availability],
  )

  const selectedRoomIds = useMemo(
    () => extractSelectedRoomIds(pendingStays, selections),
    [pendingStays, selections],
  )

  return { roomsByType, selectedRoomIds, availabilityLoading }
}
