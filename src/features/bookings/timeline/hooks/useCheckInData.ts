import { useMemo } from 'react'
import { todayISO } from '@/shared/utils'
import type { RoomStayResponse } from '../../types'
import { useBooking, useAvailabilityGrouped } from '../../hooks'

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
  roomsByType: { typeId: string; typeName: string; rooms: { room_id: string; room_number: string; available: boolean }[] }[]
  isLoading: boolean
  availLoading: boolean
}

export function useCheckInPanelData(bookingId: string): CheckInPanelData {
  const { data: booking, isLoading: bookingLoading } = useBooking(bookingId)
  const today = todayISO()

  const { unassignedStays, assignedStays, checkedInStays, totalActive } = useMemo(() => {
    if (!booking) return { unassignedStays: [] as RoomStayResponse[], assignedStays: [] as RoomStayResponse[], checkedInStays: [] as RoomStayResponse[], totalActive: 0 }
    const active = booking.room_stays.filter((s) => s.status !== 'CANCELLED' && s.status !== 'CHECKED_OUT')
    return {
      unassignedStays: active.filter((s) => s.status === 'RESERVED' && !s.room_id),
      assignedStays: active.filter((s) => (s.status === 'RESERVED' || s.status === 'ASSIGNED') && s.room_id),
      checkedInStays: active.filter((s) => s.status === 'CHECKED_IN'),
      totalActive: active.length,
    }
  }, [booking])

  const ciDate = (unassignedStays[0] ?? assignedStays[0] ?? checkedInStays[0])?.check_in?.slice(0, 10) ?? ''
  const coDate = (unassignedStays[0] ?? assignedStays[0] ?? checkedInStays[0])?.check_out?.slice(0, 10) ?? ''
  const isCheckInDay = ciDate <= today

  const { data: availability, isLoading: availLoading } = useAvailabilityGrouped(
    ciDate, coDate, unassignedStays.length > 0 && Boolean(ciDate && coDate), bookingId,
  )

  const assignedRoomIds = useMemo(() => {
    if (!booking) return new Set<string>()
    return new Set(booking.room_stays.filter((s: RoomStayResponse) => s.room_id).map((s: RoomStayResponse) => s.room_id!))
  }, [booking])

  const roomsByType = useMemo(() => {
    if (!availability) return []
    const needed = new Set(unassignedStays.map((s) => s.room_type_id))
    return availability.room_types
      .filter((rt) => needed.has(rt.room_type_id))
      .map((rt) => ({ typeId: rt.room_type_id, typeName: rt.room_type_name, rooms: rt.rooms.filter((r) => r.available && !assignedRoomIds.has(r.room_id)) }))
      .filter((rt) => rt.rooms.length > 0)
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

// ── Shared hook (InlineCheckIn) ──────────────────────────────────────────────

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
