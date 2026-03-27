import { createContext, useContext } from 'react'
import type { TimelineBooking } from '../../types'
import type { DragMode } from '../hooks/useTimelineDrag'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimelineCallbackContextValue {
  onSelectBooking: (b: TimelineBooking, roomNumbers?: string[]) => void
  onDoubleClickBooking: (b: TimelineBooking) => void
  onContextMenu: (booking: TimelineBooking, roomId: string, roomNumber: string, x: number, y: number) => void
  onDragStart: (e: React.PointerEvent | PointerEvent, booking: TimelineBooking, roomId: string, mode: DragMode) => void
  onKeyboardMove: (booking: TimelineBooking, roomId: string, direction: 'left' | 'right' | 'up' | 'down') => void
  onKeyboardResize: (booking: TimelineBooking, roomId: string, edge: 'extend' | 'shrink') => void
  onDrawStart: (e: React.PointerEvent, roomId: string) => void
  onDrawerCheckIn: (b: TimelineBooking) => void
  onDirectCheckOut: (b: TimelineBooking) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const TimelineCallbackContext = createContext<TimelineCallbackContextValue | null>(null)

export const TimelineCallbackProvider = TimelineCallbackContext.Provider

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTimelineCallbacks(): TimelineCallbackContextValue {
  const ctx = useContext(TimelineCallbackContext)
  if (!ctx) throw new Error('useTimelineCallbacks must be used within TimelineCallbackProvider')
  return ctx
}
