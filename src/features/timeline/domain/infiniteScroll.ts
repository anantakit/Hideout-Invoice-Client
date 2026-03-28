// timeline/domain/infiniteScroll.ts — pure scroll/buffer computations for useInfiniteTimeline
// No React imports. No DOM access.

import { addDays, subDays, startOfDay } from 'date-fns'

// ── 1. Buffer start ──────────────────────────────────────────────────────────

/**
 * Calculate the buffer start date: the target date minus bufferDays.
 */
export function calculateBufferStart(targetDate: Date, bufferDays: number): Date {
  return subDays(startOfDay(targetDate), bufferDays)
}

// ── 2. Visible range ─────────────────────────────────────────────────────────

export interface VisibleRange {
  dayOffset: number
  visibleDays: number
  visibleStartDate: Date
}

/**
 * Calculate which days are currently visible in the scroll viewport.
 */
export function calculateVisibleRange(
  scrollLeft: number,
  cellWidth: number,
  viewportWidth: number,
  roomColWidth: number,
  bufferStart: Date,
): VisibleRange {
  const dayOffset = Math.round(scrollLeft / cellWidth)
  const visibleDays = Math.ceil((viewportWidth - roomColWidth) / cellWidth)
  return {
    dayOffset,
    visibleDays,
    visibleStartDate: addDays(bufferStart, dayOffset),
  }
}

// ── 3. Should shift buffer ───────────────────────────────────────────────────

export type ShiftDirection = 'left' | 'right' | null

/**
 * Determine whether the buffer needs to be shifted based on scroll position.
 * Returns 'right' if scrolled near the right edge, 'left' if near the left edge, null otherwise.
 */
export function shouldShiftBuffer(
  scrollLeft: number,
  totalWidth: number,
  viewportWidth: number,
  roomColWidth: number,
  thresholdPx: number,
): ShiftDirection {
  const rightRemaining = totalWidth - scrollLeft - viewportWidth + roomColWidth
  const leftRemaining = scrollLeft

  if (rightRemaining < thresholdPx) return 'right'
  if (leftRemaining < thresholdPx) return 'left'
  return null
}

// ── 4. Jump target ───────────────────────────────────────────────────────────

/**
 * Calculate the scroll position (px) to center on a date after a jump.
 */
export function calculateJumpScrollLeft(bufferDays: number, cellWidth: number): number {
  return bufferDays * cellWidth
}
