/**
 * Pure domain functions for timeline drag/resize operations.
 *
 * Extracted from useTimelineDrag — contains all geometry math,
 * conflict detection, auto-scroll velocity, and preview positioning.
 * No React imports, no DOM access, no side effects.
 */

import { addDays, differenceInDays, format, parseISO, startOfDay } from 'date-fns'
import type { TimelineBooking, TimelineRoom } from '@/features/bookings/types'
import { TIMELINE_ROOM_COL_PX } from '../utils/tokens'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DragMode = 'move' | 'resize-left' | 'resize-right'

export interface SnapResult {
  newCheckIn: string
  newCheckOut: string
  newRoomId: string
  hasConflict: boolean
  isMaintenanceRoom: boolean
}

export interface DragPreviewPosition {
  left: number
  top: number
  width: number
  height: number
}

export interface AutoScrollVelocity {
  dx: number
  dy: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse a date string that may be YYYY-MM-DD or a full ISO timestamp. */
function toDate(s: string): Date {
  return startOfDay(parseISO(s))
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Auto-scroll edge zone (px from container edge). */
const AUTO_SCROLL_EDGE_PX = 60

/** Max auto-scroll speed (px per 16ms frame). */
const AUTO_SCROLL_MAX_SPEED = 12

// ─── Pure Functions ───────────────────────────────────────────────────────────

/**
 * Calculate how many days from the booking's left edge the pointer grabbed.
 *
 * @param pointerX - clientX of the pointer
 * @param containerLeft - left edge of scroll container (getBoundingClientRect().left)
 * @param scrollLeft - scrollLeft of the scroll container
 * @param bookingOffsetDays - offset in days from windowStart to booking check-in
 * @param cellWidth - width of one day column in px
 */
export function calculateGrabDayOffset(
  pointerX: number,
  containerLeft: number,
  scrollLeft: number,
  bookingOffsetDays: number,
  cellWidth: number,
): number {
  const pointerRelX = pointerX - containerLeft - TIMELINE_ROOM_COL_PX + scrollLeft
  const pointerDayIndex = Math.floor(pointerRelX / cellWidth)
  return Math.max(0, pointerDayIndex - bookingOffsetDays)
}

/**
 * Check if a target room/date range conflicts with existing bookings.
 * Excludes the stay being dragged and ignores CANCELLED/CHECKED_OUT statuses.
 */
export function checkConflict(
  targetRoomId: string,
  checkIn: string,
  checkOut: string,
  excludeStayId: string,
  roomMap: Map<string, TimelineRoom>,
): boolean {
  const room = roomMap.get(targetRoomId)
  if (!room) return true
  return room.bookings.some(
    (b) =>
      b.room_stay_id !== excludeStayId &&
      b.status !== 'CANCELLED' &&
      b.status !== 'CHECKED_OUT' &&
      b.check_in.slice(0, 10) < checkOut &&
      b.check_out.slice(0, 10) > checkIn,
  )
}

/**
 * Check if a room is in maintenance status.
 */
export function isMaintenanceRoom(
  roomId: string,
  roomMap: Map<string, TimelineRoom>,
): boolean {
  const room = roomMap.get(roomId)
  return room?.status === 'MAINTENANCE'
}

/**
 * Calculate auto-scroll velocity based on pointer proximity to container edges.
 * Returns { dx, dy } in pixels per frame.
 *
 * @param pointerX - clientX of the pointer
 * @param pointerY - clientY of the pointer
 * @param containerRect - bounding rect of the scroll container
 */
export function calculateAutoScroll(
  pointerX: number,
  pointerY: number,
  containerRect: { left: number; right: number; top: number; bottom: number },
): AutoScrollVelocity {
  let dx = 0
  let dy = 0

  // Horizontal
  const leftDist = pointerX - containerRect.left - TIMELINE_ROOM_COL_PX
  const rightDist = containerRect.right - pointerX
  if (leftDist < AUTO_SCROLL_EDGE_PX && leftDist > 0) {
    dx = -AUTO_SCROLL_MAX_SPEED * (1 - leftDist / AUTO_SCROLL_EDGE_PX)
  } else if (rightDist < AUTO_SCROLL_EDGE_PX && rightDist > 0) {
    dx = AUTO_SCROLL_MAX_SPEED * (1 - rightDist / AUTO_SCROLL_EDGE_PX)
  }

  // Vertical
  const topDist = pointerY - containerRect.top
  const bottomDist = containerRect.bottom - pointerY
  if (topDist < AUTO_SCROLL_EDGE_PX && topDist > 0) {
    dy = -AUTO_SCROLL_MAX_SPEED * (1 - topDist / AUTO_SCROLL_EDGE_PX)
  } else if (bottomDist < AUTO_SCROLL_EDGE_PX && bottomDist > 0) {
    dy = AUTO_SCROLL_MAX_SPEED * (1 - bottomDist / AUTO_SCROLL_EDGE_PX)
  }

  return { dx, dy }
}

/**
 * Snap a pointer position to the timeline grid and compute new check-in/check-out/room.
 *
 * @param relX - horizontal offset from grid start (clientX - containerLeft - roomColPx + scrollLeft)
 * @param cellWidth - width of one day column in px
 * @param mode - drag mode (move, resize-left, resize-right)
 * @param originalSpanDays - original booking span in days
 * @param grabDayOffset - where on the booking the pointer grabbed (days from left edge)
 * @param windowStart - first date in the timeline window
 * @param windowDays - number of days in the timeline window
 * @param targetRoomId - room ID at the pointer's Y position
 * @param booking - the booking being dragged
 * @param roomMap - map of room ID → TimelineRoom for conflict detection
 */
export function snapDragToGrid(
  relX: number,
  cellWidth: number,
  mode: DragMode,
  originalSpanDays: number,
  grabDayOffset: number,
  windowStart: Date,
  windowDays: number,
  targetRoomId: string,
  booking: TimelineBooking,
  roomMap: Map<string, TimelineRoom>,
): SnapResult {
  const dayIndex = Math.floor(relX / cellWidth)

  let newCheckIn: Date
  let newCheckOut: Date

  if (mode === 'move') {
    const newOffset = Math.max(0, Math.min(dayIndex - grabDayOffset, windowDays - originalSpanDays))
    newCheckIn = addDays(windowStart, newOffset)
    newCheckOut = addDays(newCheckIn, originalSpanDays)
  } else if (mode === 'resize-right') {
    newCheckIn = toDate(booking.check_in)
    const newEndDay = Math.max(
      differenceInDays(newCheckIn, windowStart) + 1,
      Math.min(dayIndex + 1, windowDays),
    )
    newCheckOut = addDays(windowStart, newEndDay)
  } else {
    // resize-left
    newCheckOut = toDate(booking.check_out)
    const maxStartDay = differenceInDays(newCheckOut, windowStart) - 1
    const newStartDay = Math.max(0, Math.min(dayIndex, maxStartDay))
    newCheckIn = addDays(windowStart, newStartDay)
  }

  const checkInStr = format(newCheckIn, 'yyyy-MM-dd')
  const checkOutStr = format(newCheckOut, 'yyyy-MM-dd')

  const hasConflict = checkConflict(targetRoomId, checkInStr, checkOutStr, booking.room_stay_id, roomMap)
  const maintenance = isMaintenanceRoom(targetRoomId, roomMap)

  return {
    newCheckIn: checkInStr,
    newCheckOut: checkOutStr,
    newRoomId: targetRoomId,
    hasConflict,
    isMaintenanceRoom: maintenance,
  }
}

/**
 * Calculate the drag preview position in px coordinates.
 *
 * @param checkIn - new check-in date string (YYYY-MM-DD)
 * @param checkOut - new check-out date string (YYYY-MM-DD)
 * @param roomId - target room ID
 * @param windowStart - first date in the timeline window
 * @param cellWidth - width of one day column in px
 * @param getRoomTop - function returning cumulative top offset for a room
 * @param getRoomHeight - function returning the height of a room row
 */
export function updatePreviewPosition(
  checkIn: string,
  checkOut: string,
  roomId: string,
  windowStart: Date,
  cellWidth: number,
  getRoomTop: (roomId: string) => number | undefined,
  getRoomHeight: (roomId: string) => number,
): DragPreviewPosition | null {
  const offsetDays = differenceInDays(toDate(checkIn), windowStart)
  const spanDays = differenceInDays(toDate(checkOut), toDate(checkIn))
  const roomTop = getRoomTop(roomId)
  const roomHeight = getRoomHeight(roomId)

  if (roomTop === undefined) return null

  return {
    left: TIMELINE_ROOM_COL_PX + offsetDays * cellWidth,
    top: roomTop,
    width: spanDays * cellWidth,
    height: roomHeight,
  }
}

/**
 * Compute keyboard move: shift booking by one day or one room in the given direction.
 * Returns null if the move is out of bounds.
 */
export function computeKeyboardMove(
  booking: TimelineBooking,
  roomId: string,
  direction: 'left' | 'right' | 'up' | 'down',
  rooms: TimelineRoom[],
  roomIndexMap: Map<string, number>,
  roomMap: Map<string, TimelineRoom>,
): { newRoomId: string; newCheckIn: string; newCheckOut: string; hasConflict: boolean; isMaintenanceRoom: boolean } | null {
  const checkIn = toDate(booking.check_in)
  const checkOut = toDate(booking.check_out)

  let newCheckIn: Date
  let newCheckOut: Date
  let newRoomId = roomId

  if (direction === 'left') {
    newCheckIn = addDays(checkIn, -1)
    newCheckOut = addDays(checkOut, -1)
  } else if (direction === 'right') {
    newCheckIn = addDays(checkIn, 1)
    newCheckOut = addDays(checkOut, 1)
  } else {
    newCheckIn = checkIn
    newCheckOut = checkOut
    const currentIdx = roomIndexMap.get(roomId) ?? 0
    const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1
    if (targetIdx < 0 || targetIdx >= rooms.length) return null
    newRoomId = rooms[targetIdx].id
  }

  const ciStr = format(newCheckIn, 'yyyy-MM-dd')
  const coStr = format(newCheckOut, 'yyyy-MM-dd')

  return {
    newRoomId,
    newCheckIn: ciStr,
    newCheckOut: coStr,
    hasConflict: checkConflict(newRoomId, ciStr, coStr, booking.room_stay_id, roomMap),
    isMaintenanceRoom: isMaintenanceRoom(newRoomId, roomMap),
  }
}

/**
 * Compute keyboard resize: extend or shrink by one day from the right edge.
 * Returns null if the resulting span would be less than 1 night.
 */
export function computeKeyboardResize(
  booking: TimelineBooking,
  roomId: string,
  edge: 'extend' | 'shrink',
  roomMap: Map<string, TimelineRoom>,
): { newCheckIn: string; newCheckOut: string; hasConflict: boolean } | null {
  const checkIn = toDate(booking.check_in)
  const checkOut = toDate(booking.check_out)
  const span = differenceInDays(checkOut, checkIn)

  let newCheckOut: Date
  if (edge === 'extend') {
    newCheckOut = addDays(checkOut, 1)
  } else {
    if (span <= 1) return null // Minimum 1 night
    newCheckOut = addDays(checkOut, -1)
  }

  const ciStr = format(checkIn, 'yyyy-MM-dd')
  const coStr = format(newCheckOut, 'yyyy-MM-dd')

  return {
    newCheckIn: ciStr,
    newCheckOut: coStr,
    hasConflict: checkConflict(roomId, ciStr, coStr, booking.room_stay_id, roomMap),
  }
}
