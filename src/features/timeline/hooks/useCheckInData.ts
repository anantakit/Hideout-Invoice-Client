import { useMemo } from 'react'
import { todayISO } from '@/shared/utils'
import type { RoomStayResponse } from '@/features/bookings/types'
import { useBooking, useAvailabilityGrouped } from '@/features/bookings/hooks'
import {
  partitionStaysByStatus,
  extractCheckInCheckOutDates,
  extractAssignedRoomIds,
  buildAvailableRoomsByType,
} from '../domain/checkInPrep'
import type { RoomTypeGroup } from '../domain/checkInPrep'

// ── Panel hook (InlineCheckInPanel) ──────────────────────────────────────────

interface CheckInPanelData {
  unassignedStays: RoomStayResponse[]
  assignedStays: RoomStayResponse[]
  checkedInStays: RoomStayResponse[]
  totalActive: number
  ciDate: string
  coDate: string
  isCheckInDay: boolean
  assignedRoomIds: Set<string>
  roomsByType: RoomTypeGroup[]
  isLoading: boolean
  availLoading: boolean
}

export function useCheckInPanelData(bookingId: string): CheckInPanelData {
  const { data: booking, isLoading: bookingLoading } = useBooking(bookingId)
  const today = todayISO()

  const { unassignedStays, assignedStays, checkedInStays, totalActive } = useMemo(
    () => partitionStaysByStatus(booking?.room_stays ?? []),
    [booking],
  )

  const { checkIn: ciDate, checkOut: coDate } = extractCheckInCheckOutDates(unassignedStays, assignedStays, checkedInStays)
  const isCheckInDay = ciDate <= today

  const { data: availability, isLoading: availLoading } = useAvailabilityGrouped(
    ciDate, coDate, unassignedStays.length > 0 && Boolean(ciDate && coDate), bookingId,
  )

  const assignedRoomIds = useMemo(
    () => extractAssignedRoomIds(booking?.room_stays ?? []),
    [booking],
  )

  const roomsByType = useMemo(() => {
    const needed = new Set(unassignedStays.map((s) => s.room_type_id))
    return buildAvailableRoomsByType(availability, needed, assignedRoomIds)
  }, [availability, unassignedStays, assignedRoomIds])

  return {
    unassignedStays,
    assignedStays,
    checkedInStays,
    totalActive,
    ciDate,
    coDate,
    isCheckInDay,
    assignedRoomIds,
    roomsByType,
    isLoading: bookingLoading,
    availLoading,
  }
}
