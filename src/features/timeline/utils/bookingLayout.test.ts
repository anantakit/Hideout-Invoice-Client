import { describe, it, expect } from 'vitest'
import { computeRoomLayout } from './bookingLayout'
import type { TimelineBooking } from '@/features/bookings/types'

function makeBooking(overrides: Partial<TimelineBooking> & { room_stay_id: string }): TimelineBooking {
  return {
    booking_id: 'bk-1',
    guest_name: 'Guest',
    check_in: '2024-03-01',
    check_out: '2024-03-03',
    status: 'RESERVED',
    balance_amount: 0,
    key_deposit_amount: 0,
    deposit_paid: 0,
    deposit_status: 'NONE',
    source: 'advance',
    ...overrides,
  }
}

const WINDOW_START = '2024-03-01'
const WINDOW_END = '2024-03-08'

describe('computeRoomLayout', () => {
  it('returns empty layers and 0 totalLayers for no bookings', () => {
    const result = computeRoomLayout([], WINDOW_START, WINDOW_END)
    expect(result.layers.size).toBe(0)
    expect(result.totalLayers).toBe(0)
  })

  it('places single booking on layer 0', () => {
    const bookings = [makeBooking({ room_stay_id: 's1' })]
    const result = computeRoomLayout(bookings, WINDOW_START, WINDOW_END)
    expect(result.layers.get('s1')?.layerIndex).toBe(0)
    expect(result.totalLayers).toBe(1)
  })

  it('places non-overlapping bookings on same layer', () => {
    const bookings = [
      makeBooking({ room_stay_id: 's1', check_in: '2024-03-01', check_out: '2024-03-03' }),
      makeBooking({ room_stay_id: 's2', check_in: '2024-03-03', check_out: '2024-03-05' }),
    ]
    const result = computeRoomLayout(bookings, WINDOW_START, WINDOW_END)
    expect(result.layers.get('s1')?.layerIndex).toBe(0)
    expect(result.layers.get('s2')?.layerIndex).toBe(0)
    expect(result.totalLayers).toBe(1)
  })

  it('places overlapping bookings on different layers', () => {
    const bookings = [
      makeBooking({
        room_stay_id: 's1',
        check_in: '2024-03-01',
        check_out: '2024-03-05',
        created_at: '2024-02-01T00:00:00Z',
      }),
      makeBooking({
        room_stay_id: 's2',
        check_in: '2024-03-03',
        check_out: '2024-03-07',
        created_at: '2024-02-02T00:00:00Z',
      }),
    ]
    const result = computeRoomLayout(bookings, WINDOW_START, WINDOW_END)
    expect(result.layers.get('s1')?.layerIndex).toBe(0)
    expect(result.layers.get('s2')?.layerIndex).toBe(1)
    expect(result.totalLayers).toBe(2)
  })

  it('skips bookings entirely outside the window', () => {
    const bookings = [
      makeBooking({ room_stay_id: 's1', check_in: '2024-02-20', check_out: '2024-02-25' }),
      makeBooking({ room_stay_id: 's2', check_in: '2024-03-10', check_out: '2024-03-15' }),
    ]
    const result = computeRoomLayout(bookings, WINDOW_START, WINDOW_END)
    // Both outside window — skipped
    expect(result.layers.size).toBe(0)
    expect(result.totalLayers).toBe(1) // Math.max(layerEnds.length=0, 1)
  })

  it('clamps bookings that extend beyond window boundaries', () => {
    const bookings = [
      makeBooking({
        room_stay_id: 's1',
        check_in: '2024-02-28',
        check_out: '2024-03-10',
        created_at: '2024-02-01T00:00:00Z',
      }),
      makeBooking({
        room_stay_id: 's2',
        check_in: '2024-03-05',
        check_out: '2024-03-12',
        created_at: '2024-02-02T00:00:00Z',
      }),
    ]
    const result = computeRoomLayout(bookings, WINDOW_START, WINDOW_END)
    // s1 clamped to 03-01..03-08, s2 clamped to 03-05..03-08 → overlap → 2 layers
    expect(result.layers.get('s1')?.layerIndex).toBe(0)
    expect(result.layers.get('s2')?.layerIndex).toBe(1)
    expect(result.totalLayers).toBe(2)
  })

  it('handles booking starting exactly at window start', () => {
    const bookings = [
      makeBooking({ room_stay_id: 's1', check_in: '2024-03-01', check_out: '2024-03-03' }),
    ]
    const result = computeRoomLayout(bookings, WINDOW_START, WINDOW_END)
    expect(result.layers.get('s1')?.layerIndex).toBe(0)
  })

  it('handles booking ending exactly at window end', () => {
    const bookings = [
      makeBooking({ room_stay_id: 's1', check_in: '2024-03-06', check_out: '2024-03-08' }),
    ]
    const result = computeRoomLayout(bookings, WINDOW_START, WINDOW_END)
    expect(result.layers.get('s1')?.layerIndex).toBe(0)
  })

  it('skips booking where clamped start equals clamped end (multi-booking path)', () => {
    // Single-booking path has a fast return; use 2 bookings to exercise clamping skip
    const bookings = [
      makeBooking({
        room_stay_id: 's1',
        check_in: '2024-03-08', // at window end → clampedStart = clampedEnd
        check_out: '2024-03-10',
        created_at: '2024-02-01T00:00:00Z',
      }),
      makeBooking({
        room_stay_id: 's2',
        check_in: '2024-03-09', // also outside window
        check_out: '2024-03-11',
        created_at: '2024-02-02T00:00:00Z',
      }),
    ]
    const result = computeRoomLayout(bookings, WINDOW_START, WINDOW_END)
    // Both bookings clamped to start >= end → skipped
    expect(result.layers.size).toBe(0)
  })

  it('uses created_at for stable layer ordering (older on top)', () => {
    const bookings = [
      makeBooking({
        room_stay_id: 's2',
        check_in: '2024-03-01',
        check_out: '2024-03-05',
        created_at: '2024-02-15T00:00:00Z', // newer
      }),
      makeBooking({
        room_stay_id: 's1',
        check_in: '2024-03-01',
        check_out: '2024-03-05',
        created_at: '2024-02-10T00:00:00Z', // older
      }),
    ]
    const result = computeRoomLayout(bookings, WINDOW_START, WINDOW_END)
    // Older (s1) should be on layer 0, newer (s2) on layer 1
    expect(result.layers.get('s1')?.layerIndex).toBe(0)
    expect(result.layers.get('s2')?.layerIndex).toBe(1)
  })

  it('handles 3 overlapping bookings with 3 layers', () => {
    const bookings = [
      makeBooking({
        room_stay_id: 's1',
        check_in: '2024-03-01',
        check_out: '2024-03-06',
        created_at: '2024-02-01T00:00:00Z',
      }),
      makeBooking({
        room_stay_id: 's2',
        check_in: '2024-03-02',
        check_out: '2024-03-05',
        created_at: '2024-02-02T00:00:00Z',
      }),
      makeBooking({
        room_stay_id: 's3',
        check_in: '2024-03-03',
        check_out: '2024-03-07',
        created_at: '2024-02-03T00:00:00Z',
      }),
    ]
    const result = computeRoomLayout(bookings, WINDOW_START, WINDOW_END)
    expect(result.totalLayers).toBe(3)
    expect(result.layers.get('s1')?.layerIndex).toBe(0)
    expect(result.layers.get('s2')?.layerIndex).toBe(1)
    expect(result.layers.get('s3')?.layerIndex).toBe(2)
  })

  it('reuses layer when earlier booking ends before new one starts', () => {
    const bookings = [
      makeBooking({
        room_stay_id: 's1',
        check_in: '2024-03-01',
        check_out: '2024-03-03',
        created_at: '2024-02-01T00:00:00Z',
      }),
      makeBooking({
        room_stay_id: 's2',
        check_in: '2024-03-01',
        check_out: '2024-03-06',
        created_at: '2024-02-02T00:00:00Z',
      }),
      makeBooking({
        room_stay_id: 's3',
        check_in: '2024-03-03',
        check_out: '2024-03-05',
        created_at: '2024-02-03T00:00:00Z',
      }),
    ]
    const result = computeRoomLayout(bookings, WINDOW_START, WINDOW_END)
    // s1 on layer 0, s2 on layer 1, s3 reuses layer 0 (s1 ended 03-03, s3 starts 03-03)
    expect(result.layers.get('s1')?.layerIndex).toBe(0)
    expect(result.layers.get('s2')?.layerIndex).toBe(1)
    expect(result.layers.get('s3')?.layerIndex).toBe(0)
    expect(result.totalLayers).toBe(2)
  })
})
