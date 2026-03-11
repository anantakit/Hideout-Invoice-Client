import { useState, useCallback, useRef, useEffect } from 'react'
import { addDays, format } from 'date-fns'
import type { TimelineRoom } from '../../types'
import { TIMELINE_ROOM_COL_PX, getCellWidthPx } from './tokens'

/** Minimum pointer movement (px) before a draw activates. */
const DRAW_THRESHOLD_PX = 8

/** Touch hold delay (ms) before draw activates on touch devices. */
const TOUCH_HOLD_MS = 400

export interface DrawState {
  roomId: string
  /** YYYY-MM-DD */
  checkIn: string
  /** YYYY-MM-DD */
  checkOut: string
}

export interface DrawPreviewPosition {
  left: number
  top: number
  width: number
  height: number
}

interface UseTimelineDrawOptions {
  rooms: TimelineRoom[]
  windowStart: Date
  windowDays: number
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  /** Called when draw completes successfully. */
  onDrawComplete: (roomId: string, checkIn: string, checkOut: string) => void
  getRoomTop: (roomId: string) => number | undefined
  getRoomHeight: (roomId: string) => number
  /** Whether another drag operation is active. */
  isDragging: boolean
}

export function useTimelineDraw({
  rooms,
  windowStart,
  windowDays,
  scrollContainerRef,
  onDrawComplete,
  getRoomTop,
  getRoomHeight,
  isDragging,
}: UseTimelineDrawOptions) {
  const [drawState, setDrawState] = useState<DrawState | null>(null)
  const [drawPreview, setDrawPreview] = useState<DrawPreviewPosition | null>(null)

  const drawRef = useRef<{
    roomId: string
    startDayIndex: number
    startX: number
    startY: number
    pointerId: number
    phase: 'pending' | 'active'
    isTouch: boolean
    touchHoldTimer: ReturnType<typeof setTimeout> | null
    touchHoldMet: boolean
  } | null>(null)

  // ── Snap helper ─────────────────────────────────────────────────────────

  const getDayIndex = useCallback(
    (clientX: number): number => {
      const el = scrollContainerRef.current
      if (!el) return 0
      const rect = el.getBoundingClientRect()
      const relX = clientX - rect.left - TIMELINE_ROOM_COL_PX + el.scrollLeft
      return Math.max(0, Math.min(Math.floor(relX / getCellWidthPx()), windowDays - 1))
    },
    [scrollContainerRef, windowDays],
  )

  // Check if a cell is empty (no booking covers it)
  const isCellEmpty = useCallback(
    (roomId: string, checkIn: string, checkOut: string): boolean => {
      const room = rooms.find((r) => r.id === roomId)
      if (!room) return false
      return !room.bookings.some(
        (b) =>
          b.status !== 'CANCELLED' &&
          b.status !== 'CHECKED_OUT' &&
          b.check_in.slice(0, 10) < checkOut &&
          b.check_out.slice(0, 10) > checkIn,
      )
    },
    [rooms],
  )

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleDrawStart = useCallback(
    (e: React.PointerEvent, roomId: string) => {
      if (e.button !== 0 || isDragging) return

      const dayIndex = getDayIndex(e.clientX)
      const isTouch = e.pointerType === 'touch'

      drawRef.current = {
        roomId,
        startDayIndex: dayIndex,
        startX: e.clientX,
        startY: e.clientY,
        pointerId: e.pointerId,
        phase: 'pending',
        isTouch,
        touchHoldTimer: null,
        touchHoldMet: !isTouch,
      }

      if (isTouch) {
        drawRef.current.touchHoldTimer = setTimeout(() => {
          if (drawRef.current) {
            drawRef.current.touchHoldMet = true
            if (navigator.vibrate) navigator.vibrate(30)
          }
        }, TOUCH_HOLD_MS)
      }
    },
    [isDragging, getDayIndex],
  )

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const ref = drawRef.current
      if (!ref) return

      if (ref.phase === 'pending') {
        // Touch: must hold first
        if (ref.isTouch && !ref.touchHoldMet) {
          const dx = e.clientX - ref.startX
          const dy = e.clientY - ref.startY
          if (dx * dx + dy * dy > DRAW_THRESHOLD_PX * DRAW_THRESHOLD_PX * 4) {
            if (ref.touchHoldTimer) clearTimeout(ref.touchHoldTimer)
            drawRef.current = null
            return
          }
          return
        }

        const dx = e.clientX - ref.startX
        const dy = e.clientY - ref.startY
        if (dx * dx + dy * dy < DRAW_THRESHOLD_PX * DRAW_THRESHOLD_PX) return

        ref.phase = 'active'
        e.preventDefault()
      }

      // Calculate date range from start to current position
      const currentDay = getDayIndex(e.clientX)
      const minDay = Math.min(ref.startDayIndex, currentDay)
      const maxDay = Math.max(ref.startDayIndex, currentDay)

      const checkIn = format(addDays(windowStart, minDay), 'yyyy-MM-dd')
      const checkOut = format(addDays(windowStart, maxDay + 1), 'yyyy-MM-dd')

      const isEmpty = isCellEmpty(ref.roomId, checkIn, checkOut)

      setDrawState(isEmpty ? { roomId: ref.roomId, checkIn, checkOut } : null)

      // Update preview
      const roomTop = getRoomTop(ref.roomId)
      const roomHeight = getRoomHeight(ref.roomId)
      if (roomTop !== undefined) {
        setDrawPreview({
          left: TIMELINE_ROOM_COL_PX + minDay * getCellWidthPx(),
          top: roomTop,
          width: (maxDay - minDay + 1) * getCellWidthPx(),
          height: roomHeight,
        })
      }
    },
    [getDayIndex, windowStart, isCellEmpty, getRoomTop, getRoomHeight],
  )

  const handlePointerUp = useCallback(
    (_e: PointerEvent) => {
      const ref = drawRef.current
      drawRef.current = null

      if (ref?.touchHoldTimer) clearTimeout(ref.touchHoldTimer)

      if (!ref || ref.phase === 'pending') {
        setDrawState(null)
        setDrawPreview(null)
        return
      }

      const state = drawState
      if (state) {
        onDrawComplete(state.roomId, state.checkIn, state.checkOut)
      }

      setDrawState(null)
      setDrawPreview(null)
    },
    [drawState, onDrawComplete],
  )

  // ── Global listeners ────────────────────────────────────────────────────

  useEffect(() => {
    // Prevent browser scroll while touch-drawing (must be non-passive)
    const onTouchMove = (e: TouchEvent) => {
      const ref = drawRef.current
      if (ref && (ref.touchHoldMet || ref.phase === 'active')) {
        e.preventDefault()
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [handlePointerMove, handlePointerUp])

  return {
    drawState,
    drawPreview,
    isDrawing: drawRef.current?.phase === 'active',
    handleDrawStart,
  }
}
