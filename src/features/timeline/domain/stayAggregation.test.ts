import { describe, it, expect } from 'vitest'
import type { UnassignedStay } from '@/features/bookings/types'
import {
  groupUnassignedStaysByBooking,
  createDateSections,
  formatDateLabel,
} from './stayAggregation'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeStay(overrides: Partial<UnassignedStay> = {}): UnassignedStay {
  return {
    booking_id: 'b1',
    guest_name: 'สมชาย',
    room_type_id: 'rt1',
    room_type_name: 'Standard',
    check_in: '2026-03-30T00:00:00Z',
    check_out: '2026-04-01T00:00:00Z',
    status: 'CONFIRMED',
    key_deposit_amount: 0,
    deposit_status: 'NONE',
    balance_amount: 0,
    ...overrides,
  }
}

const TODAY = '2026-03-28'
const TOMORROW = '2026-03-29'

// ── groupUnassignedStaysByBooking ────────────────────────────────────────────

describe('groupUnassignedStaysByBooking', () => {
  it('returns empty array for empty stays', () => {
    expect(groupUnassignedStaysByBooking([], TODAY)).toEqual([])
  })

  it('groups a single stay into one booking group', () => {
    const stays = [makeStay()]
    const result = groupUnassignedStaysByBooking(stays, TODAY)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      bookingId: 'b1',
      guestName: 'สมชาย',
      checkIn: '2026-03-30',
      checkOut: '2026-04-01',
      roomTypeNames: ['Standard'],
      totalRooms: 1,
      nights: 2,
    })
  })

  it('groups multiple stays from the same booking', () => {
    const stays = [
      makeStay({ room_type_name: 'Standard' }),
      makeStay({ room_type_name: 'Deluxe', check_out: '2026-04-02T00:00:00Z' }),
    ]
    const result = groupUnassignedStaysByBooking(stays, TODAY)
    expect(result).toHaveLength(1)
    expect(result[0].totalRooms).toBe(2)
    expect(result[0].roomTypeNames).toEqual(['Standard', 'Deluxe'])
    expect(result[0].checkOut).toBe('2026-04-02')
  })

  it('does not duplicate room type names', () => {
    const stays = [
      makeStay({ room_type_name: 'Standard' }),
      makeStay({ room_type_name: 'Standard' }),
    ]
    const result = groupUnassignedStaysByBooking(stays, TODAY)
    expect(result[0].roomTypeNames).toEqual(['Standard'])
    expect(result[0].totalRooms).toBe(2)
  })

  it('separates different bookings', () => {
    const stays = [
      makeStay({ booking_id: 'b1' }),
      makeStay({ booking_id: 'b2', guest_name: 'สมหญิง' }),
    ]
    const result = groupUnassignedStaysByBooking(stays, TODAY)
    expect(result).toHaveLength(2)
  })

  it('excludes CANCELLED stays', () => {
    const stays = [makeStay({ status: 'CANCELLED' })]
    expect(groupUnassignedStaysByBooking(stays, TODAY)).toEqual([])
  })

  it('excludes CHECKED_OUT stays', () => {
    const stays = [makeStay({ status: 'CHECKED_OUT' })]
    expect(groupUnassignedStaysByBooking(stays, TODAY)).toEqual([])
  })

  it('excludes stays with check_in matching today', () => {
    const stays = [makeStay({ check_in: '2026-03-28T00:00:00Z' })]
    expect(groupUnassignedStaysByBooking(stays, TODAY)).toEqual([])
  })

  it('keeps earliest checkIn and latest checkOut across stays', () => {
    const stays = [
      makeStay({ check_in: '2026-04-01T00:00:00Z', check_out: '2026-04-03T00:00:00Z' }),
      makeStay({ check_in: '2026-03-30T00:00:00Z', check_out: '2026-04-05T00:00:00Z' }),
    ]
    const result = groupUnassignedStaysByBooking(stays, TODAY)
    expect(result[0].checkIn).toBe('2026-03-30')
    expect(result[0].checkOut).toBe('2026-04-05')
  })
})

// ── formatDateLabel ──────────────────────────────────────────────────────────

describe('formatDateLabel', () => {
  it('returns วันนี้ for today', () => {
    expect(formatDateLabel(TODAY, TODAY, TOMORROW)).toBe('วันนี้')
  })

  it('returns พรุ่งนี้ for tomorrow', () => {
    expect(formatDateLabel(TOMORROW, TODAY, TOMORROW)).toBe('พรุ่งนี้')
  })

  it('returns Thai short date for past date', () => {
    expect(formatDateLabel('2026-03-25', TODAY, TOMORROW)).toBe('25 มี.ค.')
  })

  it('returns Thai short date for future date', () => {
    expect(formatDateLabel('2026-04-15', TODAY, TOMORROW)).toBe('15 เม.ย.')
  })
})

// ── createDateSections ───────────────────────────────────────────────────────

describe('createDateSections', () => {
  it('returns empty array for empty grouped', () => {
    expect(createDateSections([], TODAY, TOMORROW)).toEqual([])
  })

  it('creates sections sorted chronologically', () => {
    const grouped = [
      { bookingId: 'b1', guestName: 'A', checkIn: '2026-04-02', checkOut: '2026-04-04', roomTypeNames: ['S'], totalRooms: 1, nights: 2 },
      { bookingId: 'b2', guestName: 'B', checkIn: '2026-03-30', checkOut: '2026-04-01', roomTypeNames: ['D'], totalRooms: 1, nights: 2 },
    ]
    const sections = createDateSections(grouped, TODAY, TOMORROW)
    expect(sections).toHaveLength(2)
    expect(sections[0].dateStr).toBe('2026-03-30')
    expect(sections[1].dateStr).toBe('2026-04-02')
  })

  it('groups bookings under same check-in date', () => {
    const grouped = [
      { bookingId: 'b1', guestName: 'A', checkIn: '2026-03-30', checkOut: '2026-04-01', roomTypeNames: ['S'], totalRooms: 2, nights: 2 },
      { bookingId: 'b2', guestName: 'B', checkIn: '2026-03-30', checkOut: '2026-04-02', roomTypeNames: ['D'], totalRooms: 1, nights: 3 },
    ]
    const sections = createDateSections(grouped, TODAY, TOMORROW)
    expect(sections).toHaveLength(1)
    expect(sections[0].bookings).toHaveLength(2)
    expect(sections[0].stayCount).toBe(3) // 2 + 1
  })

  it('marks today section as urgent', () => {
    const grouped = [
      { bookingId: 'b1', guestName: 'A', checkIn: TODAY, checkOut: '2026-03-30', roomTypeNames: ['S'], totalRooms: 1, nights: 2 },
    ]
    const sections = createDateSections(grouped, TODAY, TOMORROW)
    expect(sections[0].isUrgent).toBe(true)
  })

  it('marks future section as not urgent', () => {
    const grouped = [
      { bookingId: 'b1', guestName: 'A', checkIn: '2026-04-01', checkOut: '2026-04-03', roomTypeNames: ['S'], totalRooms: 1, nights: 2 },
    ]
    const sections = createDateSections(grouped, TODAY, TOMORROW)
    expect(sections[0].isUrgent).toBe(false)
  })

  it('uses formatDateLabel for section labels', () => {
    const grouped = [
      { bookingId: 'b1', guestName: 'A', checkIn: TODAY, checkOut: '2026-03-30', roomTypeNames: ['S'], totalRooms: 1, nights: 2 },
      { bookingId: 'b2', guestName: 'B', checkIn: TOMORROW, checkOut: '2026-03-31', roomTypeNames: ['D'], totalRooms: 1, nights: 2 },
      { bookingId: 'b3', guestName: 'C', checkIn: '2026-04-01', checkOut: '2026-04-03', roomTypeNames: ['S'], totalRooms: 1, nights: 2 },
    ]
    const sections = createDateSections(grouped, TODAY, TOMORROW)
    expect(sections[0].label).toBe('วันนี้')
    expect(sections[1].label).toBe('พรุ่งนี้')
    expect(sections[2].label).toBe('1 เม.ย.')
  })
})
