import { createContext, useContext } from 'react'
import type { TimelineRoom, UnassignedStay } from '@/features/bookings/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimelineContextValue {
  bookingColorMap: Record<string, string>
  bookingRoomCountMap: Record<string, number>
  roomTypeNameMap: Record<string, string>
  todayStr: string
  windowStart: Date
  windowEnd: Date
  zoomDays: number
  days: Date[]
  allRooms: TimelineRoom[]
  unassignedStays: UnassignedStay[]
}

// ─── Context ──────────────────────────────────────────────────────────────────

const TimelineContext = createContext<TimelineContextValue | null>(null)

export const TimelineProvider = TimelineContext.Provider

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTimelineContext(): TimelineContextValue {
  const ctx = useContext(TimelineContext)
  if (!ctx) throw new Error('useTimelineContext must be used within TimelineProvider')
  return ctx
}
