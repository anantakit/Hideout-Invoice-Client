// shared/domain/dateRange.ts — pure functions, no React imports

import { isBefore } from 'date-fns'

export interface DayClickResult {
  start: Date
  end: Date | null
}

/**
 * คำนวณ start/end จากการคลิกวันใน date range picker
 *
 * กฎ:
 * - ยังไม่มี start / มี end แล้ว / คลิกก่อน start → reset เป็น start ใหม่
 * - มี start แล้ว, ยังไม่มี end, คลิกวันหลัง start → set end
 */
export function calculateDayClick(
  pendingStart: Date | null,
  pendingEnd: Date | null,
  day: Date,
): DayClickResult {
  if (!pendingStart || pendingEnd || isBefore(day, pendingStart)) {
    return { start: day, end: null }
  }
  return { start: pendingStart, end: day }
}
