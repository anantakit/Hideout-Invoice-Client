import type { RoomTypeBookingItemForm } from './createBookingSchema'
import type { RoomStayPayload } from './types'

/**
 * Converts grouped booking items (room-type + quantity) into a flat list of
 * RoomStayPayload objects ready for the API.
 *
 * For each item of quantity N with M assigned rooms (M ≤ N):
 *   - Slots 0…M-1  get the specified room_id.
 *   - Slots M…N-1  get room_id = null (RESERVED; assigned at check-in).
 *
 * Example:
 *   { room_type_id: "deluxe", quantity: 3, assigned_room_ids: ["101","102"] }
 *   → [
 *       { room_type_id:"deluxe", room_id:"101", check_in:…, check_out:… },
 *       { room_type_id:"deluxe", room_id:"102", check_in:…, check_out:… },
 *       { room_type_id:"deluxe", room_id:null,  check_in:…, check_out:… },
 *     ]
 */
export function expandGroupedStays(items: RoomTypeBookingItemForm[]): RoomStayPayload[] {
  return items.flatMap((item): RoomStayPayload[] => {
    const assigned = item.assigned_room_ids ?? []
    return Array.from({ length: item.quantity }, (_, i): RoomStayPayload => ({
      room_type_id: item.room_type_id,
      room_id: assigned[i] ?? null,
      check_in: item.check_in,
      check_out: item.check_out,
    }))
  })
}
