// ── Stay Management — pure functions, no React imports ──────────────────────

import type { RoomTypeResponse, RoomStayPayload } from '../types'

// ── Types ───────────────────────────────────────────────────────────────────

export interface StayDraftInput {
  key: string
  checkIn: string
  checkOut: string
  roomTypeId: string
  roomId: string | null
  chargedPrice?: number
}

export interface DatePair {
  checkIn: string
  checkOut: string
}

// ── Functions ───────────────────────────────────────────────────────────────

/**
 * Sum total price across all drafts: nights × (chargedPrice ?? room type price).
 * Skips drafts with missing/invalid dates or unknown room type.
 */
export function calculateStayTotalPrice(
  drafts: StayDraftInput[],
  roomTypes: RoomTypeResponse[],
): number {
  return drafts.reduce((sum, d) => {
    const rt = roomTypes.find((t) => t.id === d.roomTypeId)
    if (!rt?.price_per_night || !d.checkIn || !d.checkOut || d.checkOut <= d.checkIn) return sum
    const nights = Math.round(
      (new Date(d.checkOut).getTime() - new Date(d.checkIn).getTime()) / 86400000,
    )
    const price = d.chargedPrice ?? rt.price_per_night
    return sum + price * nights
  }, 0)
}

/**
 * Check if a room is already taken by another draft with overlapping dates.
 * Two ranges overlap when: start_a < end_b AND end_a > start_b.
 */
export function isRoomTakenByOtherRow(
  currentKey: string,
  roomId: string,
  checkIn: string,
  checkOut: string,
  drafts: StayDraftInput[],
): boolean {
  for (const d of drafts) {
    if (d.key === currentKey || d.roomId !== roomId) continue
    if (d.checkIn < checkOut && d.checkOut > checkIn) return true
  }
  return false
}

/**
 * Deduplicate date pairs from drafts — only valid ranges (checkOut > checkIn).
 */
export function deduplicateDatePairs(drafts: StayDraftInput[]): DatePair[] {
  const seen = new Map<string, DatePair>()
  for (const d of drafts) {
    if (d.checkIn && d.checkOut && d.checkOut > d.checkIn) {
      const key = `${d.checkIn}|${d.checkOut}`
      if (!seen.has(key)) seen.set(key, { checkIn: d.checkIn, checkOut: d.checkOut })
    }
  }
  return Array.from(seen.values())
}

/**
 * Validate all drafts have required fields and valid date ranges.
 */
export function validateStayDrafts(
  drafts: StayDraftInput[],
): { isValid: boolean; errors?: string[] } {
  if (drafts.length === 0) return { isValid: false, errors: ['ต้องมีอย่างน้อย 1 ห้อง'] }

  const errors: string[] = []
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i]
    const label = `รายการที่ ${i + 1}`
    if (!d.roomTypeId) errors.push(`${label}: ยังไม่ได้เลือกประเภทห้อง`)
    if (!d.checkIn || !d.checkOut) errors.push(`${label}: ยังไม่ได้เลือกวันที่`)
    else if (d.checkOut <= d.checkIn) errors.push(`${label}: วันเช็คเอาท์ต้องหลังวันเช็คอิน`)
  }

  return errors.length ? { isValid: false, errors } : { isValid: true }
}

/**
 * Build API payloads from drafts.
 */
export function buildStayPayloads(drafts: StayDraftInput[]): RoomStayPayload[] {
  return drafts.map((d) => ({
    room_type_id: d.roomTypeId,
    room_id: d.roomId || undefined,
    check_in: d.checkIn,
    check_out: d.checkOut,
    ...(d.chargedPrice != null ? { charged_price: d.chargedPrice } : {}),
  }))
}
