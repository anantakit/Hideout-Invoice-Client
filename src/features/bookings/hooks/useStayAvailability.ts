import { useQuery } from '@tanstack/react-query'
import { bookingsApi } from '../api'
import { calcAvailableCount } from '../shared/availabilityCalc'

export interface StayRoomTypeAvailability {
  id: string
  name: string
  available: number
  total: number
}

export interface StayAvailabilityResult {
  checkIn: string
  checkOut: string
  roomTypes: StayRoomTypeAvailability[]
}

/**
 * Fetch stay availability for a check-in/check-out range.
 *
 * Uses the existing `/rooms/availability-grouped` endpoint which already
 * accounts for assigned stays, unassigned bookings, and maintenance rooms.
 * The `available` count per room type = number of rooms available for the
 * ENTIRE stay (the backend computes overlap across the full date window).
 */
export function useStayAvailability(checkIn: string, checkOut: string) {
  return useQuery<StayAvailabilityResult>({
    queryKey: ['stay-availability', checkIn, checkOut],
    queryFn: async () => {
      const data = await bookingsApi.getAvailabilityGrouped(checkIn, checkOut)
      return {
        checkIn: data.check_in,
        checkOut: data.check_out,
        roomTypes: data.room_types.map((rt) => ({
          id: rt.room_type_id,
          name: rt.room_type_name,
          available: calcAvailableCount(rt.rooms.filter((r) => r.available).length, rt.unassigned_count ?? 0),
          total: rt.rooms.length,
        })),
      }
    },
    enabled: Boolean(checkIn && checkOut && checkOut > checkIn),
    staleTime: 30 * 1000,
  })
}
