import { describe, it, expect } from 'vitest'
import type { RoomTypeResponse } from '../types'
import type { StayDraftInput } from './stayManagement'
import {
  calculateStayTotalPrice,
  isRoomTakenByOtherRow,
  deduplicateDatePairs,
  validateStayDrafts,
  buildStayPayloads,
} from './stayManagement'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeDraft(overrides: Partial<StayDraftInput> = {}): StayDraftInput {
  return {
    key: overrides.key ?? 'k1',
    checkIn: overrides.checkIn ?? '2025-03-01',
    checkOut: overrides.checkOut ?? '2025-03-02',
    roomTypeId: overrides.roomTypeId ?? 'rt1',
    roomId: overrides.roomId ?? null,
    chargedPrice: overrides.chargedPrice,
  }
}

function makeRoomType(overrides: Partial<RoomTypeResponse> = {}): RoomTypeResponse {
  return {
    id: overrides.id ?? 'rt1',
    name: overrides.name ?? 'Standard',
    price_per_night: overrides.price_per_night ?? 1000,
    created_at: '2025-01-01T00:00:00Z',
  }
}

// ── calculateStayTotalPrice ─────────────────────────────────────────────────

describe('calculateStayTotalPrice', () => {
  const roomTypes = [makeRoomType(), makeRoomType({ id: 'rt2', name: 'Deluxe', price_per_night: 2000 })]

  it('calculates 1 night correctly', () => {
    const drafts = [makeDraft({ checkIn: '2025-03-01', checkOut: '2025-03-02' })]
    expect(calculateStayTotalPrice(drafts, roomTypes)).toBe(1000)
  })

  it('calculates multi-night stay', () => {
    const drafts = [makeDraft({ checkIn: '2025-03-01', checkOut: '2025-03-04' })]
    expect(calculateStayTotalPrice(drafts, roomTypes)).toBe(3000)
  })

  it('calculates cross-month stay', () => {
    const drafts = [makeDraft({ checkIn: '2025-03-30', checkOut: '2025-04-02' })]
    expect(calculateStayTotalPrice(drafts, roomTypes)).toBe(3000)
  })

  it('sums multiple drafts with different room types', () => {
    const drafts = [
      makeDraft({ checkIn: '2025-03-01', checkOut: '2025-03-03', roomTypeId: 'rt1' }),
      makeDraft({ key: 'k2', checkIn: '2025-03-01', checkOut: '2025-03-02', roomTypeId: 'rt2' }),
    ]
    expect(calculateStayTotalPrice(drafts, roomTypes)).toBe(2000 + 2000)
  })

  it('uses chargedPrice override when set', () => {
    const drafts = [makeDraft({ checkIn: '2025-03-01', checkOut: '2025-03-03', chargedPrice: 800 })]
    expect(calculateStayTotalPrice(drafts, roomTypes)).toBe(1600)
  })

  it('skips draft with unknown room type', () => {
    const drafts = [makeDraft({ roomTypeId: 'unknown' })]
    expect(calculateStayTotalPrice(drafts, roomTypes)).toBe(0)
  })

  it('skips draft with missing dates', () => {
    const drafts = [makeDraft({ checkIn: '', checkOut: '' })]
    expect(calculateStayTotalPrice(drafts, roomTypes)).toBe(0)
  })

  it('skips draft with invalid date range (checkOut <= checkIn)', () => {
    const drafts = [makeDraft({ checkIn: '2025-03-05', checkOut: '2025-03-03' })]
    expect(calculateStayTotalPrice(drafts, roomTypes)).toBe(0)
  })

  it('returns 0 for empty drafts', () => {
    expect(calculateStayTotalPrice([], roomTypes)).toBe(0)
  })
})

// ── isRoomTakenByOtherRow ───────────────────────────────────────────────────

describe('isRoomTakenByOtherRow', () => {
  it('returns false when no overlap', () => {
    const drafts = [
      makeDraft({ key: 'k1', roomId: 'r1', checkIn: '2025-03-01', checkOut: '2025-03-03' }),
      makeDraft({ key: 'k2', roomId: 'r1', checkIn: '2025-03-05', checkOut: '2025-03-07' }),
    ]
    expect(isRoomTakenByOtherRow('k1', 'r1', '2025-03-01', '2025-03-03', drafts)).toBe(false)
  })

  it('returns true for partial overlap', () => {
    const drafts = [
      makeDraft({ key: 'k1', roomId: 'r1', checkIn: '2025-03-01', checkOut: '2025-03-05' }),
      makeDraft({ key: 'k2', roomId: 'r1', checkIn: '2025-03-03', checkOut: '2025-03-07' }),
    ]
    expect(isRoomTakenByOtherRow('k1', 'r1', '2025-03-01', '2025-03-05', drafts)).toBe(true)
  })

  it('returns true for exact same dates', () => {
    const drafts = [
      makeDraft({ key: 'k1', roomId: 'r1', checkIn: '2025-03-01', checkOut: '2025-03-05' }),
      makeDraft({ key: 'k2', roomId: 'r1', checkIn: '2025-03-01', checkOut: '2025-03-05' }),
    ]
    expect(isRoomTakenByOtherRow('k1', 'r1', '2025-03-01', '2025-03-05', drafts)).toBe(true)
  })

  it('returns false for adjacent dates (touching but not overlapping)', () => {
    const drafts = [
      makeDraft({ key: 'k1', roomId: 'r1', checkIn: '2025-03-01', checkOut: '2025-03-03' }),
      makeDraft({ key: 'k2', roomId: 'r1', checkIn: '2025-03-03', checkOut: '2025-03-05' }),
    ]
    // k1 checks: is r1 taken by others for 03-01..03-03? k2 is 03-03..03-05. overlap = 03-03 < 03-03 is false
    expect(isRoomTakenByOtherRow('k1', 'r1', '2025-03-01', '2025-03-03', drafts)).toBe(false)
  })

  it('returns false when different rooms', () => {
    const drafts = [
      makeDraft({ key: 'k1', roomId: 'r1', checkIn: '2025-03-01', checkOut: '2025-03-05' }),
      makeDraft({ key: 'k2', roomId: 'r2', checkIn: '2025-03-01', checkOut: '2025-03-05' }),
    ]
    expect(isRoomTakenByOtherRow('k1', 'r1', '2025-03-01', '2025-03-05', drafts)).toBe(false)
  })

  it('skips the current row itself', () => {
    const drafts = [
      makeDraft({ key: 'k1', roomId: 'r1', checkIn: '2025-03-01', checkOut: '2025-03-05' }),
    ]
    expect(isRoomTakenByOtherRow('k1', 'r1', '2025-03-01', '2025-03-05', drafts)).toBe(false)
  })
})

// ── deduplicateDatePairs ────────────────────────────────────────────────────

describe('deduplicateDatePairs', () => {
  it('returns unique date pairs from drafts', () => {
    const drafts = [
      makeDraft({ checkIn: '2025-03-01', checkOut: '2025-03-03' }),
      makeDraft({ key: 'k2', checkIn: '2025-03-01', checkOut: '2025-03-03' }),
      makeDraft({ key: 'k3', checkIn: '2025-03-05', checkOut: '2025-03-07' }),
    ]
    expect(deduplicateDatePairs(drafts)).toEqual([
      { checkIn: '2025-03-01', checkOut: '2025-03-03' },
      { checkIn: '2025-03-05', checkOut: '2025-03-07' },
    ])
  })

  it('returns all when all different', () => {
    const drafts = [
      makeDraft({ checkIn: '2025-03-01', checkOut: '2025-03-02' }),
      makeDraft({ key: 'k2', checkIn: '2025-03-03', checkOut: '2025-03-04' }),
    ]
    expect(deduplicateDatePairs(drafts)).toHaveLength(2)
  })

  it('returns one when all same', () => {
    const drafts = [
      makeDraft({ checkIn: '2025-03-01', checkOut: '2025-03-03' }),
      makeDraft({ key: 'k2', checkIn: '2025-03-01', checkOut: '2025-03-03' }),
      makeDraft({ key: 'k3', checkIn: '2025-03-01', checkOut: '2025-03-03' }),
    ]
    expect(deduplicateDatePairs(drafts)).toHaveLength(1)
  })

  it('skips invalid date ranges', () => {
    const drafts = [
      makeDraft({ checkIn: '2025-03-05', checkOut: '2025-03-03' }),
      makeDraft({ key: 'k2', checkIn: '', checkOut: '' }),
      makeDraft({ key: 'k3', checkIn: '2025-03-01', checkOut: '2025-03-02' }),
    ]
    expect(deduplicateDatePairs(drafts)).toEqual([
      { checkIn: '2025-03-01', checkOut: '2025-03-02' },
    ])
  })

  it('returns empty for empty drafts', () => {
    expect(deduplicateDatePairs([])).toEqual([])
  })
})

// ── validateStayDrafts ──────────────────────────────────────────────────────

describe('validateStayDrafts', () => {
  it('returns valid for complete drafts', () => {
    const drafts = [makeDraft({ roomTypeId: 'rt1', checkIn: '2025-03-01', checkOut: '2025-03-03' })]
    expect(validateStayDrafts(drafts)).toEqual({ isValid: true })
  })

  it('returns error for empty drafts', () => {
    const result = validateStayDrafts([])
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('ต้องมีอย่างน้อย 1 ห้อง')
  })

  it('returns error for missing room type', () => {
    const drafts = [makeDraft({ roomTypeId: '' })]
    const result = validateStayDrafts(drafts)
    expect(result.isValid).toBe(false)
    expect(result.errors).toEqual(['รายการที่ 1: ยังไม่ได้เลือกประเภทห้อง'])
  })

  it('returns error for missing dates', () => {
    const drafts = [makeDraft({ checkIn: '', checkOut: '' })]
    const result = validateStayDrafts(drafts)
    expect(result.isValid).toBe(false)
    expect(result.errors!.some((e) => e.includes('วันที่'))).toBe(true)
  })

  it('returns error for invalid date range', () => {
    const drafts = [makeDraft({ checkIn: '2025-03-05', checkOut: '2025-03-03' })]
    const result = validateStayDrafts(drafts)
    expect(result.isValid).toBe(false)
    expect(result.errors!.some((e) => e.includes('เช็คเอาท์ต้องหลัง'))).toBe(true)
  })

  it('collects errors from multiple drafts', () => {
    const drafts = [
      makeDraft({ roomTypeId: '' }),
      makeDraft({ key: 'k2', checkIn: '', checkOut: '' }),
    ]
    const result = validateStayDrafts(drafts)
    expect(result.isValid).toBe(false)
    expect(result.errors!.length).toBeGreaterThanOrEqual(2)
  })
})

// ── buildStayPayloads ───────────────────────────────────────────────────────

describe('buildStayPayloads', () => {
  it('builds payload from draft', () => {
    const drafts = [makeDraft({ roomTypeId: 'rt1', roomId: 'r1', checkIn: '2025-03-01', checkOut: '2025-03-03' })]
    expect(buildStayPayloads(drafts)).toEqual([
      { room_type_id: 'rt1', room_id: 'r1', check_in: '2025-03-01', check_out: '2025-03-03' },
    ])
  })

  it('omits room_id when null', () => {
    const drafts = [makeDraft({ roomId: null })]
    const result = buildStayPayloads(drafts)
    expect(result[0].room_id).toBeUndefined()
  })

  it('includes charged_price when set', () => {
    const drafts = [makeDraft({ chargedPrice: 800 })]
    const result = buildStayPayloads(drafts)
    expect(result[0].charged_price).toBe(800)
  })

  it('omits charged_price when undefined', () => {
    const drafts = [makeDraft()]
    const result = buildStayPayloads(drafts)
    expect(result[0]).not.toHaveProperty('charged_price')
  })

  it('handles multiple drafts', () => {
    const drafts = [makeDraft(), makeDraft({ key: 'k2', roomTypeId: 'rt2' })]
    expect(buildStayPayloads(drafts)).toHaveLength(2)
  })
})
