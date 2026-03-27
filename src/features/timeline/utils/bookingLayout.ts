import type { TimelineBooking } from '@/features/bookings/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BookingLayerInfo {
  /** Zero-based vertical layer index within the room row. */
  layerIndex: number
}

export interface RoomLayoutResult {
  /** Maps room_stay_id → layer assignment. */
  layers: Map<string, BookingLayerInfo>
  /** Total number of vertical layers needed for this room. */
  totalLayers: number
}

// ─── Layout Algorithm ─────────────────────────────────────────────────────────

/**
 * Assigns vertical layers to bookings that may overlap in time within a single room.
 *
 * Algorithm:
 *  1. Sort bookings by clamped check-in date, then longer spans first.
 *  2. Greedily assign each booking to the earliest layer whose previous
 *     occupant has ended (check_out <= this check_in).
 *  3. If no layer is free, open a new one.
 *
 * Performance: O(B × L) where B = bookings count and L = max layers.
 * For a hotel PMS (typically 0–2 overlaps per room), this is effectively O(B).
 */
export function computeRoomLayout(
  bookings: ReadonlyArray<TimelineBooking>,
  windowStartStr: string,
  windowEndStr: string,
): RoomLayoutResult {
  if (bookings.length === 0) {
    return { layers: new Map(), totalLayers: 0 }
  }

  if (bookings.length === 1) {
    const layers = new Map<string, BookingLayerInfo>()
    layers.set(bookings[0].room_stay_id, { layerIndex: 0 })
    return { layers, totalLayers: 1 }
  }

  // Sort by clamped start, then by creation time (older stays on top, newer below).
  // Using created_at ensures stable layer ordering that doesn't change on extend/resize.
  const sorted = [...bookings].sort((a, b) => {
    const aCi = a.check_in.slice(0, 10)
    const bCi = b.check_in.slice(0, 10)
    const aStart = aCi < windowStartStr ? windowStartStr : aCi
    const bStart = bCi < windowStartStr ? windowStartStr : bCi
    if (aStart !== bStart) return aStart < bStart ? -1 : 1
    // Stable tiebreaker: older stays first (top layer), newer stays below.
    const aCreated = a.created_at ?? ''
    const bCreated = b.created_at ?? ''
    if (aCreated !== bCreated) return aCreated < bCreated ? -1 : 1
    // Final fallback: room_stay_id for determinism.
    return a.room_stay_id < b.room_stay_id ? -1 : a.room_stay_id > b.room_stay_id ? 1 : 0
  })

  // layerEnds[i] = the clamped check_out of the last booking placed in layer i.
  const layerEnds: string[] = []
  const result = new Map<string, BookingLayerInfo>()

  for (const booking of sorted) {
    const ciStr = booking.check_in.slice(0, 10)
    const coStr = booking.check_out.slice(0, 10)
    const clampedStart = ciStr < windowStartStr ? windowStartStr : ciStr
    const clampedEnd   = coStr > windowEndStr   ? windowEndStr   : coStr

    // Skip bookings entirely outside the visible window.
    if (clampedStart >= clampedEnd) continue

    // Find the first layer where this booking fits without overlap.
    let assignedLayer = -1
    for (let i = 0; i < layerEnds.length; i++) {
      if (layerEnds[i] <= clampedStart) {
        assignedLayer = i
        break
      }
    }

    if (assignedLayer === -1) {
      assignedLayer = layerEnds.length
      layerEnds.push('')
    }

    layerEnds[assignedLayer] = clampedEnd
    result.set(booking.room_stay_id, { layerIndex: assignedLayer })
  }

  return { layers: result, totalLayers: Math.max(layerEnds.length, 1) }
}
