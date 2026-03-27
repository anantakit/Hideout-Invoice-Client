import { useState, useCallback, useRef, useEffect } from 'react'
import { addDays } from 'date-fns'
import type { TimelineRoom } from '@/features/bookings/types'
import { TIMELINE_ROOM_COL_PX, getCellWidthPx } from '../utils/tokens'

/** Fast ISO date formatter — avoids date-fns format() overhead on every pointermove. */
function formatDateISO(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

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
  getRoomTop,
  getRoomHeight,
  isDragging,
}: UseTimelineDrawOptions) {
  const [drawState, setDrawState] = useState<DrawState | null>(null)
  const [drawPreview, setDrawPreview] = useState<DrawPreviewPosition | null>(null)
  const [completedDraw, setCompletedDraw] = useState<DrawState | null>(null)

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

  const roomMapRef = useRef<Map<string, TimelineRoom>>(new Map())

  useEffect(() => {
    const map = new Map<string, TimelineRoom>()
    rooms.forEach((r) => map.set(r.id, r))
    roomMapRef.current = map
  }, [rooms])

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
      const room = roomMapRef.current.get(roomId)
      if (!room) return false
      return !room.bookings.some(
        (b) =>
          b.status !== 'CANCELLED' &&
          b.status !== 'CHECKED_OUT' &&
          b.check_in.slice(0, 10) < checkOut &&
          b.check_out.slice(0, 10) > checkIn,
      )
    },
    [],
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

      const checkIn = formatDateISO(addDays(windowStart, minDay))
      const checkOut = formatDateISO(addDays(windowStart, maxDay + 1))

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

  // Suppress the click event that fires after a completed draw —
  // without this, drawing on a CHECKED_OUT block also triggers its onClick (booking detail).
  const suppressNextClickRef = useRef(false)

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      const ref = drawRef.current
      drawRef.current = null

      if (ref?.touchHoldTimer) clearTimeout(ref.touchHoldTimer)

      if (!ref || ref.phase === 'pending') {
        setDrawState(null)
        setDrawPreview(null)
        return
      }

      // Compute final draw result from ref data + pointer position.
      const currentDay = getDayIndex(e.clientX)
      const minDay = Math.min(ref.startDayIndex, currentDay)
      const maxDay = Math.max(ref.startDayIndex, currentDay)
      const checkIn = formatDateISO(addDays(windowStart, minDay))
      const checkOut = formatDateISO(addDays(windowStart, maxDay + 1))

      if (isCellEmpty(ref.roomId, checkIn, checkOut)) {
        setCompletedDraw({ roomId: ref.roomId, checkIn, checkOut })
      }

      // A click event always fires after pointerup on the same target.
      // Suppress it so it doesn't open booking detail for CHECKED_OUT blocks.
      suppressNextClickRef.current = true

      setDrawState(null)
      setDrawPreview(null)
    },
    [getDayIndex, windowStart, isCellEmpty],
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

    // Suppress the click that fires after a completed draw (pointerup → click).
    // Uses capture phase so it runs before React's onClick handlers.
    const onClickCapture = (e: MouseEvent) => {
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false
        e.stopPropagation()
        e.preventDefault()
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('click', onClickCapture, true) // capture phase
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('click', onClickCapture, true)
    }
  }, [handlePointerMove, handlePointerUp])

  return {
    drawState,
    drawPreview,
    isDrawing: drawRef.current?.phase === 'active',
    /** Set after a successful draw completes. Consumer should read and then clear it. */
    completedDraw,
    clearCompletedDraw: useCallback(() => setCompletedDraw(null), []),
    handleDrawStart,
  }
}
