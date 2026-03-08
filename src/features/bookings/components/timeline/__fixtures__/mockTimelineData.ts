/**
 * Mock timeline data for visual testing of the booking layout engine.
 *
 * Toggle: set `USE_MOCK_TIMELINE=true` in your .env.local or
 * append `?mock_timeline=true` to the URL when running dev.
 *
 * Covers these cases:
 *  1.  Empty room (no bookings)
 *  2.  Single booking — full week
 *  3.  Single booking — 1 night
 *  4.  Sequential bookings — back-to-back, no gap
 *  5.  Sequential bookings — with gap between them
 *  6.  Overlapping bookings — 2 layers
 *  7.  Overlapping bookings — 3 layers
 *  8.  Booking clipped on left (starts before window)
 *  9.  Booking clipped on right (ends after window)
 * 10.  Booking clipped on both sides (spans entire window)
 * 11.  1-night overlaps (checkout = next checkin on same day)
 * 12.  Multiple statuses in one room (CONFIRMED, CHECKED_IN, CHECKED_OUT)
 * 13.  Booking with outstanding balance
 * 14.  Booking fully paid
 * 15.  Room in CLEANING status
 * 16.  Room in MAINTENANCE status
 * 17.  Long guest name (truncation test)
 * 18.  Many short bookings (stress / dense row)
 * 19.  Multi-room booking (same booking_id across rooms)
 * 20.  Weekend bookings (Sat/Sun column highlighting)
 */

import { addDays, format, startOfDay } from 'date-fns'
import type { TimelineResponse, TimelineRoom, TimelineBooking, UnassignedStay } from '../../../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _idCounter = 0
function uid(): string {
  _idCounter++
  return `mock-${_idCounter.toString().padStart(4, '0')}-0000-0000-000000000000`
}

function d(offset: number, base: Date): string {
  return format(addDays(base, offset), 'yyyy-MM-dd')
}

function booking(
  overrides: Partial<TimelineBooking> & { check_in: string; check_out: string; guest_name: string },
): TimelineBooking {
  return {
    room_stay_id: uid(),
    booking_id: uid(),
    status: 'CHECKED_IN',
    balance_amount: 0,
    source: 'staff',
    ...overrides,
  }
}

// ─── Generator ────────────────────────────────────────────────────────────────

/**
 * Generate mock timeline data relative to the given window.
 * The window is [from, to) — 7 days as used by the real timeline.
 */
export function generateMockTimeline(from: string, _to: string): TimelineResponse {
  _idCounter = 0

  const base = startOfDay(new Date(from))

  // Shared booking ID for multi-room test (case 19)
  const multiRoomBookingId = 'multi-room-0001-0000-0000-000000000000'

  const rooms: TimelineRoom[] = [

    // ── Case 1: Empty room ─────────────────────────────────────────────
    {
      id: uid(),
      room_number: '101',
      status: 'ACTIVE',
      bookings: [],
    },

    // ── Case 2: Single booking — full week ─────────────────────────────
    {
      id: uid(),
      room_number: '102',
      status: 'ACTIVE',
      bookings: [
        booking({
          guest_name: 'สมชาย ใจดี',
          check_in: d(0, base),
          check_out: d(7, base),
          status: 'CHECKED_IN',
        }),
      ],
    },

    // ── Case 3: Single booking — 1 night ───────────────────────────────
    {
      id: uid(),
      room_number: '103',
      status: 'ACTIVE',
      bookings: [
        booking({
          guest_name: 'วิภา สุขสันต์',
          check_in: d(3, base),
          check_out: d(4, base),
          status: 'CONFIRMED',
          balance_amount: 1500,
        }),
      ],
    },

    // ── Case 4: Sequential bookings — back-to-back ─────────────────────
    {
      id: uid(),
      room_number: '104',
      status: 'ACTIVE',
      bookings: [
        booking({
          guest_name: 'อนันต์ วงศ์ไพศาล',
          check_in: d(0, base),
          check_out: d(3, base),
          status: 'CHECKED_OUT',
        }),
        booking({
          guest_name: 'มานะ ปรีชา',
          check_in: d(3, base),
          check_out: d(6, base),
          status: 'CHECKED_IN',
        }),
        booking({
          guest_name: 'ศิริ ธรรมธาดา',
          check_in: d(6, base),
          check_out: d(8, base),
          status: 'CONFIRMED',
          balance_amount: 3000,
        }),
      ],
    },

    // ── Case 5: Sequential bookings — with gap ─────────────────────────
    {
      id: uid(),
      room_number: '105',
      status: 'ACTIVE',
      bookings: [
        booking({
          guest_name: 'ประพันธ์ เจริญศิลป์',
          check_in: d(0, base),
          check_out: d(2, base),
          status: 'CHECKED_OUT',
        }),
        booking({
          guest_name: 'จันทร์ดี แสงจันทร์',
          check_in: d(4, base),
          check_out: d(6, base),
          status: 'CONFIRMED',
          balance_amount: 2400,
        }),
      ],
    },

    // ── Case 6: Overlapping bookings — 2 layers ────────────────────────
    {
      id: uid(),
      room_number: '201',
      status: 'ACTIVE',
      bookings: [
        booking({
          guest_name: 'John Smith',
          check_in: d(1, base),
          check_out: d(5, base),
          status: 'CHECKED_IN',
        }),
        booking({
          guest_name: 'Anna Lee',
          check_in: d(3, base),
          check_out: d(6, base),
          status: 'CONFIRMED',
          balance_amount: 4500,
        }),
      ],
    },

    // ── Case 7: Overlapping bookings — 3 layers ────────────────────────
    {
      id: uid(),
      room_number: '202',
      status: 'ACTIVE',
      bookings: [
        booking({
          guest_name: 'David Chen',
          check_in: d(0, base),
          check_out: d(4, base),
          status: 'CHECKED_IN',
        }),
        booking({
          guest_name: 'Maria Garcia',
          check_in: d(1, base),
          check_out: d(5, base),
          status: 'CHECKED_IN',
          balance_amount: 2000,
        }),
        booking({
          guest_name: 'Kenji Tanaka',
          check_in: d(2, base),
          check_out: d(6, base),
          status: 'CONFIRMED',
          balance_amount: 6000,
        }),
      ],
    },

    // ── Case 8: Booking clipped on left ────────────────────────────────
    {
      id: uid(),
      room_number: '203',
      status: 'ACTIVE',
      bookings: [
        booking({
          guest_name: 'พิชัย นครินทร์',
          check_in: d(-3, base),  // starts 3 days before window
          check_out: d(4, base),
          status: 'CHECKED_IN',
        }),
      ],
    },

    // ── Case 9: Booking clipped on right ───────────────────────────────
    {
      id: uid(),
      room_number: '204',
      status: 'ACTIVE',
      bookings: [
        booking({
          guest_name: 'สุนทร ภู่ประดิษฐ์',
          check_in: d(4, base),
          check_out: d(12, base), // ends 5 days after window
          status: 'CHECKED_IN',
        }),
      ],
    },

    // ── Case 10: Booking clipped on both sides ─────────────────────────
    {
      id: uid(),
      room_number: '205',
      status: 'ACTIVE',
      bookings: [
        booking({
          guest_name: 'Robert Johnson III',
          check_in: d(-5, base),  // starts before window
          check_out: d(14, base), // ends after window
          status: 'CHECKED_IN',
        }),
      ],
    },

    // ── Case 11: 1-night checkout/checkin on same day ──────────────────
    {
      id: uid(),
      room_number: '206',
      status: 'ACTIVE',
      bookings: [
        booking({
          guest_name: 'เกษม ทองดี',
          check_in: d(0, base),
          check_out: d(2, base),
          status: 'CHECKED_OUT',
        }),
        booking({
          guest_name: 'สำราญ ใจเย็น',
          check_in: d(2, base), // same day as previous checkout
          check_out: d(4, base),
          status: 'CHECKED_IN',
        }),
        booking({
          guest_name: 'บุญมี สมหวัง',
          check_in: d(4, base),
          check_out: d(6, base),
          status: 'CONFIRMED',
          balance_amount: 1800,
        }),
      ],
    },

    // ── Case 12: Multiple statuses in one room ─────────────────────────
    {
      id: uid(),
      room_number: '301',
      status: 'ACTIVE',
      bookings: [
        booking({
          guest_name: 'ปริญญา เอกชัย',
          check_in: d(0, base),
          check_out: d(2, base),
          status: 'CHECKED_OUT',
        }),
        booking({
          guest_name: 'ดวงใจ รักดี',
          check_in: d(2, base),
          check_out: d(5, base),
          status: 'CHECKED_IN',
        }),
        booking({
          guest_name: 'สกุณา เบญจางค์',
          check_in: d(5, base),
          check_out: d(7, base),
          status: 'CONFIRMED',
          balance_amount: 5000,
        }),
      ],
    },

    // ── Case 13: Booking with large outstanding balance ────────────────
    {
      id: uid(),
      room_number: '302',
      status: 'ACTIVE',
      bookings: [
        booking({
          guest_name: 'พรชัย มหาเศรษฐี',
          check_in: d(1, base),
          check_out: d(6, base),
          status: 'CHECKED_IN',
          balance_amount: 25000,
        }),
      ],
    },

    // ── Case 14: Booking fully paid ────────────────────────────────────
    {
      id: uid(),
      room_number: '303',
      status: 'ACTIVE',
      bookings: [
        booking({
          guest_name: 'วิชัย ซื่อสัตย์',
          check_in: d(2, base),
          check_out: d(5, base),
          status: 'CHECKED_IN',
          balance_amount: 0,
        }),
      ],
    },

    // ── Case 15: Room in CLEANING status ───────────────────────────────
    {
      id: uid(),
      room_number: '304',
      status: 'CLEANING',
      bookings: [
        booking({
          guest_name: 'กมลชนก ศรีสุข',
          check_in: d(0, base),
          check_out: d(1, base),
          status: 'CHECKED_OUT',
        }),
        booking({
          guest_name: 'พิมพ์ใจ ธนาพร',
          check_in: d(3, base),
          check_out: d(6, base),
          status: 'CONFIRMED',
          balance_amount: 3600,
        }),
      ],
    },

    // ── Case 16: Room in MAINTENANCE status ────────────────────────────
    {
      id: uid(),
      room_number: '305',
      status: 'MAINTENANCE',
      bookings: [],
    },

    // ── Case 17: Long guest name (truncation test) ─────────────────────
    {
      id: uid(),
      room_number: '401',
      status: 'ACTIVE',
      bookings: [
        booking({
          guest_name: 'พระเจ้าวรวงศ์เธอ กรมหลวงสงขลานครินทร์ ประดิษฐ์มนูธรรม',
          check_in: d(1, base),
          check_out: d(3, base),
          status: 'CHECKED_IN',
        }),
        booking({
          guest_name: 'Christopher Alexander Maximilian von Hohenberg-Luxemburg',
          check_in: d(4, base),
          check_out: d(6, base),
          status: 'CONFIRMED',
          balance_amount: 12000,
        }),
      ],
    },

    // ── Case 18: Many short bookings — dense row ───────────────────────
    {
      id: uid(),
      room_number: '402',
      status: 'ACTIVE',
      bookings: [
        booking({ guest_name: 'A', check_in: d(0, base), check_out: d(1, base), status: 'CHECKED_OUT' }),
        booking({ guest_name: 'B', check_in: d(1, base), check_out: d(2, base), status: 'CHECKED_OUT' }),
        booking({ guest_name: 'C', check_in: d(2, base), check_out: d(3, base), status: 'CHECKED_IN' }),
        booking({ guest_name: 'D', check_in: d(3, base), check_out: d(4, base), status: 'CONFIRMED', balance_amount: 800 }),
        booking({ guest_name: 'E', check_in: d(4, base), check_out: d(5, base), status: 'CONFIRMED', balance_amount: 800 }),
        booking({ guest_name: 'F', check_in: d(5, base), check_out: d(6, base), status: 'CONFIRMED', balance_amount: 800 }),
        booking({ guest_name: 'G', check_in: d(6, base), check_out: d(7, base), status: 'CONFIRMED', balance_amount: 800 }),
      ],
    },

    // ── Case 19a: Multi-room booking — room 1 ──────────────────────────
    {
      id: uid(),
      room_number: '501',
      status: 'ACTIVE',
      bookings: [
        {
          room_stay_id: uid(),
          booking_id: multiRoomBookingId,
          guest_name: 'กลุ่มทัวร์ บริษัท ABC',
          check_in: d(2, base),
          check_out: d(5, base),
          status: 'CHECKED_IN',
          balance_amount: 0,
          source: 'online',
        },
      ],
    },

    // ── Case 19b: Multi-room booking — room 2 ──────────────────────────
    {
      id: uid(),
      room_number: '502',
      status: 'ACTIVE',
      bookings: [
        {
          room_stay_id: uid(),
          booking_id: multiRoomBookingId,
          guest_name: 'กลุ่มทัวร์ บริษัท ABC',
          check_in: d(2, base),
          check_out: d(5, base),
          status: 'CHECKED_IN',
          balance_amount: 0,
          source: 'online',
        },
      ],
    },

    // ── Case 19c: Multi-room booking — room 3 ──────────────────────────
    {
      id: uid(),
      room_number: '503',
      status: 'ACTIVE',
      bookings: [
        {
          room_stay_id: uid(),
          booking_id: multiRoomBookingId,
          guest_name: 'กลุ่มทัวร์ บริษัท ABC',
          check_in: d(2, base),
          check_out: d(5, base),
          status: 'CHECKED_IN',
          balance_amount: 0,
          source: 'online',
        },
      ],
    },

    // ── Case 20: Overlap + clipping combined ───────────────────────────
    {
      id: uid(),
      room_number: '601',
      status: 'ACTIVE',
      bookings: [
        booking({
          guest_name: 'ธนกร อัศวเมธา',
          check_in: d(-2, base),  // clipped left
          check_out: d(4, base),
          status: 'CHECKED_IN',
        }),
        booking({
          guest_name: 'กุลธิดา ภัทรวรรณ',
          check_in: d(1, base),
          check_out: d(9, base), // clipped right
          status: 'CHECKED_IN',
          balance_amount: 7500,
        }),
        booking({
          guest_name: 'นันทิกา ราชเสนา',
          check_in: d(3, base),
          check_out: d(6, base),
          status: 'CONFIRMED',
          balance_amount: 4200,
        }),
      ],
    },

    // ── Case 21: Overlap with checkout/checkin boundary ────────────────
    {
      id: uid(),
      room_number: '602',
      status: 'ACTIVE',
      bookings: [
        booking({
          guest_name: 'สุธี มงคล',
          check_in: d(0, base),
          check_out: d(3, base),
          status: 'CHECKED_IN',
        }),
        booking({
          guest_name: 'ณัฐพล ศรีสุวรรณ',
          check_in: d(2, base),   // overlaps by 1 day
          check_out: d(5, base),
          status: 'CONFIRMED',
          balance_amount: 3200,
        }),
        booking({
          guest_name: 'อรพรรณ ดีงาม',
          check_in: d(5, base),   // starts after overlap resolves
          check_out: d(7, base),
          status: 'CONFIRMED',
          balance_amount: 1600,
        }),
      ],
    },

    // ── Case 22: CANCELLED booking (should still render) ───────────────
    {
      id: uid(),
      room_number: '603',
      status: 'ACTIVE',
      bookings: [
        booking({
          guest_name: 'ยกเลิก แล้ว',
          check_in: d(1, base),
          check_out: d(3, base),
          status: 'CANCELLED',
        }),
        booking({
          guest_name: 'แทนที่ ใหม่',
          check_in: d(1, base),
          check_out: d(4, base),
          status: 'CHECKED_IN',
        }),
      ],
    },
  ]

  // ── Unassigned stays ─────────────────────────────────────────────────
  const unassigned_stays: UnassignedStay[] = [
    {
      booking_id: uid(),
      guest_name: 'ยังไม่ได้กำหนดห้อง 1',
      room_type_id: 'rt-standard',
      room_type_name: 'Standard',
      check_in: d(1, base),
      check_out: d(3, base),
      status: 'RESERVED',
    },
    {
      booking_id: uid(),
      guest_name: 'ยังไม่ได้กำหนดห้อง 2',
      room_type_id: 'rt-deluxe',
      room_type_name: 'Deluxe',
      check_in: d(2, base),
      check_out: d(5, base),
      status: 'RESERVED',
    },
  ]

  return { rooms, unassigned_stays }
}
