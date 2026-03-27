import type { CreateBookingFormValues } from './createBookingSchema'
import type { AvailabilityGroupedRoom, AvailabilityGroupedResponse } from '../../types'

// ─── Proximity Auto-Assign ──────────────────────────────────────────────────

/**
 * Cross-type proximity auto-assign.  Mirrors the backend AutoAssignRooms scoring:
 *   - Manhattan distance to anchors (already-assigned rooms) → closer = higher score
 *   - Same-side bonus: same y-coordinate as anchors → +20 per matching anchor
 *   - Room number tiebreak
 *
 * Processes items with larger quantities first so bigger groups get the best clusters.
 */
export function proximityAutoAssignAll(
  items: CreateBookingFormValues['items'],
  availData: AvailabilityGroupedResponse,
): Record<number, string[]> {
  // Build a coord lookup: room_id → {x, y}
  const coordMap = new Map<string, { x: number; y: number }>()
  const roomById = new Map<string, AvailabilityGroupedRoom>()
  for (const rt of availData.room_types) {
    for (const r of rt.rooms) {
      coordMap.set(r.room_id, { x: r.coord_x, y: r.coord_y })
      roomById.set(r.room_id, r)
    }
  }

  const manhattan = (a: string, b: string) => {
    const ca = coordMap.get(a)
    const cb = coordMap.get(b)
    if (!ca || !cb) return 9999
    return Math.abs(ca.x - cb.x) + Math.abs(ca.y - cb.y)
  }

  // Collect globally assigned room IDs (to avoid double-assigning across items)
  const globalAssigned = new Set<string>()

  // Process order: smaller quantity first — items with fewer rooms become
  // anchors so that larger groups cluster around them.  This prevents the
  // scenario where a 2-room single group "steals" good positions and leaves
  // a 1-room double isolated far away.
  const order = items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => a.item.quantity - b.item.quantity)

  // Growing anchor set: as rooms are assigned across ALL items, they become anchors
  const anchors: string[] = []

  const result: Record<number, string[]> = {}

  for (const { item, i } of order) {
    const typeRooms = availData.room_types
      .find((rt) => rt.room_type_id === item.room_type_id)?.rooms ?? []

    const currentAssigned = item.assigned_room_ids ?? []
    // Keep existing assignments as anchors
    for (const id of currentAssigned) {
      if (!globalAssigned.has(id)) {
        globalAssigned.add(id)
        anchors.push(id)
      }
    }

    const needed = item.quantity - currentAssigned.length
    if (needed <= 0) {
      result[i] = currentAssigned
      continue
    }

    // Candidate rooms: available, not already assigned globally or in this item
    const candidates = typeRooms.filter(
      (r) => r.available && !globalAssigned.has(r.room_id) && !currentAssigned.includes(r.room_id),
    )

    // Score and pick one at a time (growing anchor set)
    const newlyAssigned = [...currentAssigned]
    for (let n = 0; n < needed; n++) {
      const remaining = candidates.filter((r) => !globalAssigned.has(r.room_id))
      if (remaining.length === 0) break

      let bestRoom: AvailabilityGroupedRoom | null = null
      let bestScore = -Infinity

      for (const room of remaining) {
        let score = 0

        if (anchors.length > 0) {
          let minDist = 9999
          let sameSideCount = 0
          const roomCoord = coordMap.get(room.room_id)

          for (const anchorId of anchors) {
            const d = manhattan(room.room_id, anchorId)
            if (d < minDist) minDist = d
            const anchorCoord = coordMap.get(anchorId)
            if (roomCoord && anchorCoord && anchorCoord.y === roomCoord.y) {
              sameSideCount++
            }
          }

          // Proximity score: distance 0 → +30, distance 1 → +15, distance 2 → +10
          score += 30.0 / (1 + minDist)
          // Same-side bonus: +20 per matching anchor
          score += (20.0 * sameSideCount) / anchors.length
        } else {
          // No anchor yet: score by average min-distance to available rooms
          // of OTHER room types so the first pick is central to all types.
          const otherTypeRooms = availData.room_types
            .filter((rt) => rt.room_type_id !== item.room_type_id)
            .flatMap((rt) => rt.rooms.filter((r) => r.available && !globalAssigned.has(r.room_id)))
          if (otherTypeRooms.length > 0) {
            let totalDist = 0
            for (const other of otherTypeRooms) {
              totalDist += manhattan(room.room_id, other.room_id)
            }
            const avgDist = totalDist / otherTypeRooms.length
            // Lower avg distance → higher score
            score += 30.0 / (1 + avgDist)
          }
        }

        // Room number tiebreak: prefer lower numbers
        const num = parseInt(room.room_number, 10)
        if (num > 0) score += 0.01 / num

        if (score > bestScore) {
          bestScore = score
          bestRoom = room
        }
      }

      if (bestRoom) {
        newlyAssigned.push(bestRoom.room_id)
        globalAssigned.add(bestRoom.room_id)
        anchors.push(bestRoom.room_id)
      }
    }

    result[i] = newlyAssigned
  }

  return result
}
