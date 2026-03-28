import { describe, it, expect } from 'vitest'
import { parseISO, startOfDay } from 'date-fns'
import type { TimelineBooking, TimelineRoom } from '@/features/bookings/types'
import {
  calculateGrabDayOffset,
  checkConflict,
  isMaintenanceRoom,
  calculateAutoScroll,
  snapDragToGrid,
  updatePreviewPosition,
  computeKeyboardMove,
  computeKeyboardResize,
} from './dragSnapping'

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeBooking(overrides: Partial<TimelineBooking> = {}): TimelineBooking {
  return {
    room_stay_id: 'stay-1',
    booking_id: 'bk-1',
    guest_name: 'Test',
    check_in: '2024-03-10',
    check_out: '2024-03-13',
    status: 'CONFIRMED',
    balance_amount: 0,
    key_deposit_amount: 0,
    deposit_paid: 0,
    deposit_status: 'NONE',
    source: 'walk_in',
    ...overrides,
  }
}

function makeRoom(id: string, bookings: TimelineBooking[] = [], status: 'ACTIVE' | 'MAINTENANCE' = 'ACTIVE'): TimelineRoom {
  return { id, room_number: id, status, bookings }
}

function buildRoomMap(rooms: TimelineRoom[]): Map<string, TimelineRoom> {
  return new Map(rooms.map((r) => [r.id, r]))
}

// ─── calculateGrabDayOffset ───────────────────────────────────────────────────

describe('calculateGrabDayOffset', () => {
  // TIMELINE_ROOM_COL_PX = 140
  const cellWidth = 120

  it('returns 0 when pointer is on the first day of the booking', () => {
    // Booking starts at day 2 (offsetDays=2), pointer at relX ~2.5 cells → dayIndex=2
    const pointerX = 140 + 2.5 * 120 // containerLeft=0, scrollLeft=0
    const result = calculateGrabDayOffset(pointerX, 0, 0, 2, cellWidth)
    expect(result).toBe(0)
  })

  it('returns correct offset when pointer is in the middle of a 3-day booking', () => {
    // Booking starts at day 0, pointer at dayIndex=1
    const pointerX = 140 + 1.5 * 120
    const result = calculateGrabDayOffset(pointerX, 0, 0, 0, cellWidth)
    expect(result).toBe(1)
  })

  it('clamps to 0 if pointer is before the booking start', () => {
    // Booking starts at day 5, pointer at dayIndex=3
    const pointerX = 140 + 3.5 * 120
    const result = calculateGrabDayOffset(pointerX, 0, 0, 5, cellWidth)
    expect(result).toBe(0)
  })

  it('accounts for scrollLeft', () => {
    // pointer at clientX=200, containerLeft=50, scrollLeft=360 (3 cells), bookingOffset=5
    const result = calculateGrabDayOffset(200, 50, 360, 5, cellWidth)
    // relX = 200 - 50 - 140 + 360 = 370, dayIndex = floor(370/120) = 3
    // grabDayOffset = max(0, 3 - 5) = 0
    expect(result).toBe(0)
  })
})

// ─── checkConflict ────────────────────────────────────────────────────────────

describe('checkConflict', () => {
  const existing = makeBooking({ room_stay_id: 'stay-2', check_in: '2024-03-10', check_out: '2024-03-15' })
  const roomMap = buildRoomMap([makeRoom('r1', [existing])])

  it('returns true when dates overlap with existing booking', () => {
    expect(checkConflict('r1', '2024-03-12', '2024-03-17', 'stay-1', roomMap)).toBe(true)
  })

  it('returns false when dates do not overlap', () => {
    expect(checkConflict('r1', '2024-03-15', '2024-03-18', 'stay-1', roomMap)).toBe(false)
  })

  it('returns false when the overlapping booking is the excluded stay', () => {
    expect(checkConflict('r1', '2024-03-12', '2024-03-17', 'stay-2', roomMap)).toBe(false)
  })

  it('returns true when room does not exist in map', () => {
    expect(checkConflict('unknown', '2024-03-12', '2024-03-17', 'stay-1', roomMap)).toBe(true)
  })

  it('ignores CANCELLED bookings', () => {
    const cancelled = makeBooking({ room_stay_id: 'stay-3', check_in: '2024-03-10', check_out: '2024-03-15', status: 'CANCELLED' })
    const map = buildRoomMap([makeRoom('r1', [cancelled])])
    expect(checkConflict('r1', '2024-03-12', '2024-03-14', 'stay-1', map)).toBe(false)
  })

  it('ignores CHECKED_OUT bookings', () => {
    const checkedOut = makeBooking({ room_stay_id: 'stay-3', check_in: '2024-03-10', check_out: '2024-03-15', status: 'CHECKED_OUT' })
    const map = buildRoomMap([makeRoom('r1', [checkedOut])])
    expect(checkConflict('r1', '2024-03-12', '2024-03-14', 'stay-1', map)).toBe(false)
  })

  it('returns false when room has no bookings', () => {
    const map = buildRoomMap([makeRoom('r1', [])])
    expect(checkConflict('r1', '2024-03-12', '2024-03-14', 'stay-1', map)).toBe(false)
  })

  it('detects adjacency correctly (check-out == check-in is not a conflict)', () => {
    // existing: 03-10 → 03-15, new: 03-15 → 03-18
    expect(checkConflict('r1', '2024-03-15', '2024-03-18', 'stay-1', roomMap)).toBe(false)
    // existing: 03-10 → 03-15, new: 03-07 → 03-10
    expect(checkConflict('r1', '2024-03-07', '2024-03-10', 'stay-1', roomMap)).toBe(false)
  })
})

// ─── isMaintenanceRoom ────────────────────────────────────────────────────────

describe('isMaintenanceRoom', () => {
  it('returns true for MAINTENANCE status', () => {
    const map = buildRoomMap([makeRoom('r1', [], 'MAINTENANCE')])
    expect(isMaintenanceRoom('r1', map)).toBe(true)
  })

  it('returns false for ACTIVE status', () => {
    const map = buildRoomMap([makeRoom('r1', [], 'ACTIVE')])
    expect(isMaintenanceRoom('r1', map)).toBe(false)
  })

  it('returns false for unknown room', () => {
    const map = buildRoomMap([])
    expect(isMaintenanceRoom('unknown', map)).toBe(false)
  })
})

// ─── calculateAutoScroll ──────────────────────────────────────────────────────

describe('calculateAutoScroll', () => {
  const rect = { left: 0, right: 1000, top: 0, bottom: 600 }

  it('returns zero velocity when pointer is in the center', () => {
    const { dx, dy } = calculateAutoScroll(500, 300, rect)
    expect(dx).toBe(0)
    expect(dy).toBe(0)
  })

  it('returns positive dx near right edge', () => {
    // 10px from right edge → rightDist=10, velocity = 12 * (1 - 10/60)
    const { dx } = calculateAutoScroll(990, 300, rect)
    expect(dx).toBeGreaterThan(0)
    expect(dx).toBeCloseTo(12 * (1 - 10 / 60))
  })

  it('returns negative dx near left edge (accounting for room column)', () => {
    // TIMELINE_ROOM_COL_PX = 140, leftDist = pointerX - left - 140
    // pointer at x=150 → leftDist=10
    const { dx } = calculateAutoScroll(150, 300, rect)
    expect(dx).toBeLessThan(0)
  })

  it('returns negative dy near top edge', () => {
    const { dy } = calculateAutoScroll(500, 10, rect)
    expect(dy).toBeLessThan(0)
  })

  it('returns positive dy near bottom edge', () => {
    const { dy } = calculateAutoScroll(500, 595, rect)
    expect(dy).toBeGreaterThan(0)
  })

  it('returns zero when pointer is exactly on edge (dist=0)', () => {
    // rightDist = 1000 - 1000 = 0, leftDist handled similarly
    const { dx } = calculateAutoScroll(1000, 300, rect)
    expect(dx).toBe(0)
  })
})

// ─── snapDragToGrid ──────────────────────────────────────────────────────────

describe('snapDragToGrid', () => {
  const cellWidth = 120
  const windowStart = startOfDay(parseISO('2024-03-01'))
  const windowDays = 14
  const booking = makeBooking({ check_in: '2024-03-05', check_out: '2024-03-08' })
  const roomMap = buildRoomMap([makeRoom('r1'), makeRoom('r2')])

  it('snaps move to correct day offset', () => {
    // relX at day 3, grabDayOffset=1, span=3 → newOffset = max(0, 3-1) = 2
    const result = snapDragToGrid(
      3.5 * cellWidth, cellWidth, 'move', 3, 1, windowStart, windowDays, 'r1', booking, roomMap,
    )
    expect(result.newCheckIn).toBe('2024-03-03')
    expect(result.newCheckOut).toBe('2024-03-06')
    expect(result.newRoomId).toBe('r1')
  })

  it('clamps move to not exceed window end', () => {
    // relX at day 20 (beyond window), span=3 → clamps to windowDays-span = 11
    const result = snapDragToGrid(
      20 * cellWidth, cellWidth, 'move', 3, 0, windowStart, windowDays, 'r1', booking, roomMap,
    )
    expect(result.newCheckIn).toBe('2024-03-12') // day 11
    expect(result.newCheckOut).toBe('2024-03-15') // day 14
  })

  it('clamps move to not go before window start', () => {
    const result = snapDragToGrid(
      -5 * cellWidth, cellWidth, 'move', 3, 0, windowStart, windowDays, 'r1', booking, roomMap,
    )
    expect(result.newCheckIn).toBe('2024-03-01') // day 0
    expect(result.newCheckOut).toBe('2024-03-04')
  })

  it('handles resize-right mode', () => {
    // booking check_in = 2024-03-05 (day 4 from windowStart), relX at day 10 → newEndDay = min(11, 14) = 11
    const result = snapDragToGrid(
      10.5 * cellWidth, cellWidth, 'resize-right', 3, 0, windowStart, windowDays, 'r1', booking, roomMap,
    )
    expect(result.newCheckIn).toBe('2024-03-05') // unchanged
    expect(result.newCheckOut).toBe('2024-03-12') // day 11
  })

  it('enforces minimum 1 night for resize-right', () => {
    // relX at day 2 → dayIndex+1 = 3, but min with booking checkIn offset (4)+1=5 → max(5, 3) = 5
    const result = snapDragToGrid(
      2 * cellWidth, cellWidth, 'resize-right', 3, 0, windowStart, windowDays, 'r1', booking, roomMap,
    )
    expect(result.newCheckIn).toBe('2024-03-05')
    expect(result.newCheckOut).toBe('2024-03-06') // at least 1 night
  })

  it('handles resize-left mode', () => {
    // booking check_out = 2024-03-08 (day 7), relX at day 2
    const result = snapDragToGrid(
      2.5 * cellWidth, cellWidth, 'resize-left', 3, 0, windowStart, windowDays, 'r1', booking, roomMap,
    )
    expect(result.newCheckIn).toBe('2024-03-03') // day 2
    expect(result.newCheckOut).toBe('2024-03-08') // unchanged
  })

  it('detects conflict in target room', () => {
    const conflicting = makeBooking({ room_stay_id: 'stay-other', check_in: '2024-03-02', check_out: '2024-03-05' })
    const map = buildRoomMap([makeRoom('r1', [conflicting])])
    const result = snapDragToGrid(
      3.5 * cellWidth, cellWidth, 'move', 3, 1, windowStart, windowDays, 'r1', booking, map,
    )
    expect(result.hasConflict).toBe(true)
  })

  it('detects maintenance room', () => {
    const map = buildRoomMap([makeRoom('r1', [], 'MAINTENANCE')])
    const result = snapDragToGrid(
      3.5 * cellWidth, cellWidth, 'move', 3, 1, windowStart, windowDays, 'r1', booking, map,
    )
    expect(result.isMaintenanceRoom).toBe(true)
  })
})

// ─── updatePreviewPosition ───────────────────────────────────────────────────

describe('updatePreviewPosition', () => {
  const windowStart = startOfDay(parseISO('2024-03-01'))
  const cellWidth = 120
  const getRoomTop = (id: string) => (id === 'r1' ? 100 : undefined)
  const getRoomHeight = () => 56

  it('returns correct position for a booking', () => {
    const pos = updatePreviewPosition('2024-03-03', '2024-03-06', 'r1', windowStart, cellWidth, getRoomTop, getRoomHeight)
    expect(pos).not.toBeNull()
    // offsetDays = 2, spanDays = 3
    expect(pos!.left).toBe(140 + 2 * 120) // ROOM_COL + offset * cellWidth
    expect(pos!.top).toBe(100)
    expect(pos!.width).toBe(3 * 120)
    expect(pos!.height).toBe(56)
  })

  it('returns null when room top is undefined', () => {
    const pos = updatePreviewPosition('2024-03-03', '2024-03-06', 'unknown', windowStart, cellWidth, getRoomTop, getRoomHeight)
    expect(pos).toBeNull()
  })
})

// ─── computeKeyboardMove ─────────────────────────────────────────────────────

describe('computeKeyboardMove', () => {
  const booking = makeBooking({ check_in: '2024-03-10', check_out: '2024-03-13' })
  const rooms = [makeRoom('r1'), makeRoom('r2'), makeRoom('r3')]
  const roomIndexMap = new Map([['r1', 0], ['r2', 1], ['r3', 2]])
  const roomMap = buildRoomMap(rooms)

  it('moves left by 1 day', () => {
    const result = computeKeyboardMove(booking, 'r2', 'left', rooms, roomIndexMap, roomMap)
    expect(result).not.toBeNull()
    expect(result!.newCheckIn).toBe('2024-03-09')
    expect(result!.newCheckOut).toBe('2024-03-12')
    expect(result!.newRoomId).toBe('r2')
  })

  it('moves right by 1 day', () => {
    const result = computeKeyboardMove(booking, 'r2', 'right', rooms, roomIndexMap, roomMap)
    expect(result!.newCheckIn).toBe('2024-03-11')
    expect(result!.newCheckOut).toBe('2024-03-14')
  })

  it('moves up by 1 room', () => {
    const result = computeKeyboardMove(booking, 'r2', 'up', rooms, roomIndexMap, roomMap)
    expect(result!.newRoomId).toBe('r1')
    expect(result!.newCheckIn).toBe('2024-03-10')
  })

  it('moves down by 1 room', () => {
    const result = computeKeyboardMove(booking, 'r2', 'down', rooms, roomIndexMap, roomMap)
    expect(result!.newRoomId).toBe('r3')
  })

  it('returns null when moving up from first room', () => {
    const result = computeKeyboardMove(booking, 'r1', 'up', rooms, roomIndexMap, roomMap)
    expect(result).toBeNull()
  })

  it('returns null when moving down from last room', () => {
    const result = computeKeyboardMove(booking, 'r3', 'down', rooms, roomIndexMap, roomMap)
    expect(result).toBeNull()
  })

  it('detects conflict in target room', () => {
    const conflicting = makeBooking({ room_stay_id: 'stay-other', check_in: '2024-03-10', check_out: '2024-03-15' })
    const map = buildRoomMap([makeRoom('r1', [conflicting]), makeRoom('r2'), makeRoom('r3')])
    const result = computeKeyboardMove(booking, 'r2', 'up', rooms, roomIndexMap, map)
    expect(result!.hasConflict).toBe(true)
  })

  it('detects maintenance room', () => {
    const map = buildRoomMap([makeRoom('r1', [], 'MAINTENANCE'), makeRoom('r2'), makeRoom('r3')])
    const result = computeKeyboardMove(booking, 'r2', 'up', rooms, roomIndexMap, map)
    expect(result!.isMaintenanceRoom).toBe(true)
  })
})

// ─── computeKeyboardResize ───────────────────────────────────────────────────

describe('computeKeyboardResize', () => {
  const booking = makeBooking({ check_in: '2024-03-10', check_out: '2024-03-13' })
  const roomMap = buildRoomMap([makeRoom('r1')])

  it('extends by 1 day', () => {
    const result = computeKeyboardResize(booking, 'r1', 'extend', roomMap)
    expect(result).not.toBeNull()
    expect(result!.newCheckIn).toBe('2024-03-10')
    expect(result!.newCheckOut).toBe('2024-03-14')
  })

  it('shrinks by 1 day', () => {
    const result = computeKeyboardResize(booking, 'r1', 'shrink', roomMap)
    expect(result!.newCheckOut).toBe('2024-03-12')
  })

  it('returns null when shrinking a 1-night booking', () => {
    const oneNight = makeBooking({ check_in: '2024-03-10', check_out: '2024-03-11' })
    const result = computeKeyboardResize(oneNight, 'r1', 'shrink', roomMap)
    expect(result).toBeNull()
  })

  it('detects conflict when extending into occupied dates', () => {
    const existing = makeBooking({ room_stay_id: 'stay-other', check_in: '2024-03-13', check_out: '2024-03-16' })
    const map = buildRoomMap([makeRoom('r1', [existing])])
    const result = computeKeyboardResize(booking, 'r1', 'extend', map)
    expect(result!.hasConflict).toBe(true)
  })
})
