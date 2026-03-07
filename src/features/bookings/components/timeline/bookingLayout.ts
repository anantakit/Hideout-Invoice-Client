import type { TimelineBooking } from '../../types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BookingLayerInfo {
  /** Zero-based vertical layer index within the room row. */
  layerIndex: number
}

export interface RoomLayoutResult {
  /** Maps booking_id → layer assignment. */
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
    layers.set(bookings[0].booking_id, { layerIndex: 0 })
    return { layers, totalLayers: 1 }
  }

  // Sort by clamped start, then longer spans first for visual stability.
  const sorted = [...bookings].sort((a, b) => {
    const aStart = a.check_in < windowStartStr ? windowStartStr : a.check_in
    const bStart = b.check_in < windowStartStr ? windowStartStr : b.check_in
    if (aStart !== bStart) return aStart < bStart ? -1 : 1
    // Longer bookings first — they anchor the top layer.
    const aEnd = a.check_out > windowEndStr ? windowEndStr : a.check_out
    const bEnd = b.check_out > windowEndStr ? windowEndStr : b.check_out
    if (aEnd !== bEnd) return aEnd > bEnd ? -1 : 1
    return 0
  })

  // layerEnds[i] = the clamped check_out of the last booking placed in layer i.
  const layerEnds: string[] = []
  const result = new Map<string, BookingLayerInfo>()

  for (const booking of sorted) {
    const clampedStart =
      booking.check_in < windowStartStr ? windowStartStr : booking.check_in

    const clampedEnd =
      booking.check_out > windowEndStr ? windowEndStr : booking.check_out

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
    result.set(booking.booking_id, { layerIndex: assignedLayer })
  }

  return { layers: result, totalLayers: Math.max(layerEnds.length, 1) }
}
