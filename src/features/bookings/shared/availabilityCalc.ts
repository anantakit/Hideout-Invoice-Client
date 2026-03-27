/**
 * Calculate available room count by subtracting unassigned bookings
 * from physically available rooms.
 */
export function calcAvailableCount(physicalAvail: number, unassignedCount: number): number {
  return Math.max(0, physicalAvail - unassignedCount)
}
