import { useMemo } from 'react'
import { useBooking, useAvailabilityGrouped } from '@/features/bookings/hooks'

interface RoomOption {
  room_id: string
  room_number: string
  available: boolean
}

interface RoomTypeGroup {
  typeId: string
  typeName: string
  rooms: RoomOption[]
}

interface RoomPickerData {
  unassignedStays: ReturnType<typeof useBooking>['data'] extends infer B
    ? B extends { room_stays: infer S } ? (S extends (infer R)[] ? R[] : never) : never
    : never
  roomsByType: RoomTypeGroup[]
  isLoading: boolean
}

export function useRoomPickerData(
  bookingId: string,
  checkIn: string,
  checkOut: string,
): RoomPickerData {
  const { data: booking, isLoading: bookingLoading } = useBooking(bookingId)
  const { data: availability, isLoading: availLoading } = useAvailabilityGrouped(
    checkIn, checkOut, true, bookingId,
  )

  const unassignedStays = useMemo(() => {
    if (!booking) return []
    return booking.room_stays.filter((s) => s.status === 'RESERVED' && !s.room_id)
  }, [booking])

  const assignedRoomIds = useMemo(() => {
    if (!booking) return new Set<string>()
    return new Set(booking.room_stays.filter((s) => s.room_id).map((s) => s.room_id!))
  }, [booking])

  const neededTypeIds = useMemo(
    () => new Set(unassignedStays.map((s) => s.room_type_id)),
    [unassignedStays],
  )

  const roomsByType = useMemo(() => {
    if (!availability) return []
    return availability.room_types
      .filter((rt) => neededTypeIds.has(rt.room_type_id))
      .map((rt) => ({
        typeId: rt.room_type_id,
        typeName: rt.room_type_name,
        rooms: rt.rooms.filter((r) => r.available && !assignedRoomIds.has(r.room_id)),
      }))
      .filter((rt) => rt.rooms.length > 0)
  }, [availability, neededTypeIds, assignedRoomIds])

  return {
    unassignedStays,
    roomsByType,
    isLoading: bookingLoading || availLoading,
  }
}
