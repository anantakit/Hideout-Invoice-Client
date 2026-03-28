import type { RoomTypeBookingItemForm } from '../create-booking/utils/createBookingSchema'

// ── Room Assignment Domain — pure functions ─────────────────────────────────

/** Item dates after syncing with the first item's dates. */
export interface SyncedItemDates {
  check_in: string
  check_out: string
  assigned_room_ids: string[]
}

/**
 * Build synced date overrides for items at index > 0.
 * Returns a record of { index → SyncedItemDates } for items that should be updated.
 * Item 0 is never modified.
 */
export function syncItemDates(
  itemCount: number,
  checkIn: string,
  checkOut: string,
): Record<number, SyncedItemDates> {
  const result: Record<number, SyncedItemDates> = {}
  for (let i = 1; i < itemCount; i++) {
    result[i] = { check_in: checkIn, check_out: checkOut, assigned_room_ids: [] }
  }
  return result
}

/**
 * Returns true if any item has fewer assigned rooms than its quantity
 * (i.e. there are unassigned slots that need attention).
 */
export function calculateUnassignedSlots(
  items: Pick<RoomTypeBookingItemForm, 'room_type_id' | 'quantity' | 'assigned_room_ids'>[],
): boolean {
  return items.some((item) => {
    const assigned = item.assigned_room_ids?.length ?? 0
    return item.room_type_id && assigned < item.quantity
  })
}
