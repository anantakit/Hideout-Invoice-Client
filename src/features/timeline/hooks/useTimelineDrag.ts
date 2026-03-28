import { useState, useCallback, useRef, useEffect } from 'react'
import { differenceInDays, format, parseISO, startOfDay } from 'date-fns'
import toast from 'react-hot-toast'
import type { TimelineRoom, TimelineBooking } from '@/features/bookings/types'
import { TIMELINE_ROOM_COL_PX, getCellWidthPx } from '../utils/tokens'
import {
  calculateGrabDayOffset,
  calculateAutoScroll,
  snapDragToGrid,
  updatePreviewPosition,
  computeKeyboardMove,
  computeKeyboardResize,
} from '../domain/dragSnapping'
import type { DragMode, DragPreviewPosition } from '../domain/dragSnapping'

// Re-export types so consumers don't need to change imports
export type { DragMode, DragPreviewPosition } from '../domain/dragSnapping'

/** Parse a date string that may be YYYY-MM-DD or a full ISO timestamp. */
function toDate(s: string): Date {
  return startOfDay(parseISO(s))
}

/** Minimum pointer movement (px) before a drag activates. */
const DRAG_THRESHOLD_PX = 5

/** Touch hold delay (ms) before drag activates on touch devices. */
const TOUCH_HOLD_MS = 400

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DragState {
  /** Booking being dragged/resized. */
  booking: TimelineBooking
  /** Original room ID the booking lives in. */
  sourceRoomId: string
  /** Drag mode. */
  mode: DragMode
  /** Original span in days. */
  originalSpanDays: number
  /** New check-in after snapping. */
  newCheckIn: string
  /** New check-out after snapping. */
  newCheckOut: string
  /** New room ID after snapping. */
  newRoomId: string
  /** Whether the current placement has a conflict. */
  hasConflict: boolean
  /** Whether the target room is in maintenance. */
  isMaintenanceRoom: boolean
}

interface UseTimelineDragOptions {
  rooms: TimelineRoom[]
  windowStart: Date
  windowDays: number
  /** Ref to the scroll container for coordinate calculations. */
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  /** Ref to the virtualizer container (position: relative wrapper). */
  gridContainerRef: React.RefObject<HTMLDivElement | null>
  /** Called on successful drop with the move payload. */
  onMoveStay: (payload: {
    bookingId: string
    stayId: string
    newRoomId: string
    newCheckIn: string
    newCheckOut: string
  }) => void
  /** Returns the cumulative top offset for a room (virtualizer coordinates). */
  getRoomTop: (roomId: string) => number | undefined
  /** Returns the height of a room row. */
  getRoomHeight: (roomId: string) => number
  /** Binary search to find room ID at a given Y coordinate (virtualizer space). */
  getRoomAtY: (y: number) => string | undefined
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTimelineDrag({
  rooms,
  windowStart,
  windowDays,
  scrollContainerRef,
  gridContainerRef,
  onMoveStay,
  getRoomTop,
  getRoomHeight,
  getRoomAtY,
}: UseTimelineDragOptions) {
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [previewPos, setPreviewPos] = useState<DragPreviewPosition | null>(null)

  // Mirror dragState in a ref so handlePointerUp never reads a stale closure
  const dragStateRef = useRef<DragState | null>(null)
  useEffect(() => {
    dragStateRef.current = dragState
  }, [dragState])

  // Refs for pointer tracking without re-renders
  const dragRef = useRef<{
    startX: number
    startY: number
    pointerId: number
    target: HTMLElement
    phase: 'pending' | 'active'
    mode: DragMode
    booking: TimelineBooking
    sourceRoomId: string
    originalOffsetDays: number
    originalSpanDays: number
    /** How many days from the booking's left edge the pointer grabbed. */
    grabDayOffset: number
    /** Whether this is a touch interaction. */
    isTouch: boolean
    /** Touch hold timer ID. */
    touchHoldTimer: ReturnType<typeof setTimeout> | null
    /** Whether touch hold threshold was met. */
    touchHoldMet: boolean
    /** Last clientX/clientY for auto-scroll re-snap. */
    lastClientX: number
    lastClientY: number
  } | null>(null)

  // Track the last snapped position to skip redundant state updates
  const lastSnapRef = useRef<string>('')

  const roomMapRef = useRef<Map<string, TimelineRoom>>(new Map())
  const roomIndexMap = useRef<Map<string, number>>(new Map())

  // Auto-scroll animation frame ID
  const autoScrollRaf = useRef<number>(0)

  // Stable refs for functions used inside RAF loop — avoids restarting the loop
  // when deps like windowStart/windowDays change mid-drag.
  const snapToGridRef = useRef<typeof snapToGridCb>(null!)
  const updatePreviewPosRef = useRef<typeof updatePreviewPosCb>(null!)

  // Keep room maps fresh
  useEffect(() => {
    const rMap = new Map<string, TimelineRoom>()
    const iMap = new Map<string, number>()
    rooms.forEach((r, i) => {
      rMap.set(r.id, r)
      iMap.set(r.id, i)
    })
    roomMapRef.current = rMap
    roomIndexMap.current = iMap
  }, [rooms])

  // ── Snap pointer position to grid (delegates to domain) ─────────────────

  const snapToGridCb = useCallback(
    (
      clientX: number,
      clientY: number,
      mode: DragMode,
      originalSpanDays: number,
      grabDayOffset: number,
      sourceRoomId: string,
      booking: TimelineBooking,
    ) => {
      const el = scrollContainerRef.current
      const gridEl = gridContainerRef.current
      if (!el || !gridEl) return null

      const containerRect = el.getBoundingClientRect()
      const gridRect = gridEl.getBoundingClientRect()

      // Horizontal: convert clientX to grid-relative content coordinate
      const relX = clientX - containerRect.left - TIMELINE_ROOM_COL_PX + el.scrollLeft

      // Vertical: convert clientY to virtualizer-relative coordinate
      const relY = clientY - gridRect.top

      // Find target room by Y coordinate — O(log n) binary search
      const targetRoomId = getRoomAtY(relY) ?? sourceRoomId

      return snapDragToGrid(
        relX,
        getCellWidthPx(),
        mode,
        originalSpanDays,
        grabDayOffset,
        windowStart,
        windowDays,
        targetRoomId,
        booking,
        roomMapRef.current,
      )
    },
    [scrollContainerRef, gridContainerRef, windowStart, windowDays, getRoomAtY],
  )

  // ── Update preview position (delegates to domain) ───────────────────────

  const updatePreviewPosCb = useCallback(
    (checkIn: string, checkOut: string, roomId: string) => {
      const pos = updatePreviewPosition(
        checkIn,
        checkOut,
        roomId,
        windowStart,
        getCellWidthPx(),
        getRoomTop,
        getRoomHeight,
      )
      if (pos) setPreviewPos(pos)
    },
    [windowStart, getRoomTop, getRoomHeight],
  )

  // Keep refs in sync with latest callback versions
  snapToGridRef.current = snapToGridCb
  updatePreviewPosRef.current = updatePreviewPosCb

  // ── Auto-scroll during drag ───────────────────────────────────────────

  const runAutoScroll = useCallback(() => {
    const ref = dragRef.current
    const el = scrollContainerRef.current
    if (!ref || ref.phase !== 'active' || !el) {
      autoScrollRaf.current = 0
      return
    }

    const rect = el.getBoundingClientRect()
    const { dx, dy } = calculateAutoScroll(ref.lastClientX, ref.lastClientY, rect)

    if (dx !== 0 || dy !== 0) {
      el.scrollLeft += dx
      el.scrollTop += dy

      // Re-snap after scroll so drag coordinates remain correct
      const snapped = snapToGridRef.current(
        ref.lastClientX,
        ref.lastClientY,
        ref.mode,
        ref.originalSpanDays,
        ref.grabDayOffset,
        ref.sourceRoomId,
        ref.booking,
      )
      if (snapped) {
        const snapKey = `${snapped.newCheckIn}|${snapped.newCheckOut}|${snapped.newRoomId}`
        if (snapKey !== lastSnapRef.current) {
          lastSnapRef.current = snapKey
          setDragState((prev) =>
            prev
              ? {
                  ...prev,
                  newCheckIn: snapped.newCheckIn,
                  newCheckOut: snapped.newCheckOut,
                  newRoomId: snapped.newRoomId,
                  hasConflict: snapped.hasConflict,
                  isMaintenanceRoom: snapped.isMaintenanceRoom,
                }
              : null,
          )
          updatePreviewPosRef.current(snapped.newCheckIn, snapped.newCheckOut, snapped.newRoomId)
        }
      }
    }

    autoScrollRaf.current = requestAnimationFrame(runAutoScroll)
  }, [scrollContainerRef])

  // ── Cancel drag (ESC or programmatic) ─────────────────────────────────

  const cancelDrag = useCallback(() => {
    const ref = dragRef.current
    if (!ref) return
    if (ref.touchHoldTimer) clearTimeout(ref.touchHoldTimer)
    ref.target.closest('.tl-booking-block')?.classList.remove('tl-touch-drag-active')
    try { ref.target.releasePointerCapture(ref.pointerId) } catch {}
    dragRef.current = null
    if (autoScrollRaf.current) {
      cancelAnimationFrame(autoScrollRaf.current)
      autoScrollRaf.current = 0
    }
    setDragState(null)
    setPreviewPos(null)
  }, [])

  // ── Pointer handlers ────────────────────────────────────────────────────

  const handleDragStart = useCallback(
    (
      e: React.PointerEvent | PointerEvent,
      booking: TimelineBooking,
      roomId: string,
      mode: DragMode,
    ) => {
      // Only left mouse button / touch
      if (e.button !== 0) return

      const el = scrollContainerRef.current
      if (!el) return

      const checkIn = toDate(booking.check_in)
      const checkOut = toDate(booking.check_out)
      const spanDays = differenceInDays(checkOut, checkIn)
      const offsetDays = differenceInDays(checkIn, windowStart)

      // Calculate where on the booking the user grabbed (in days from left edge)
      const containerRect = el.getBoundingClientRect()
      const grabOffset = calculateGrabDayOffset(
        e.clientX,
        containerRect.left,
        el.scrollLeft,
        offsetDays,
        getCellWidthPx(),
      )

      const isTouch = e.pointerType === 'touch'

      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        pointerId: e.pointerId,
        target: e.target as HTMLElement,
        phase: 'pending',
        mode,
        booking,
        sourceRoomId: roomId,
        originalOffsetDays: offsetDays,
        originalSpanDays: spanDays,
        grabDayOffset: grabOffset,
        isTouch,
        touchHoldTimer: null,
        touchHoldMet: !isTouch, // Mouse doesn't need hold delay
        lastClientX: e.clientX,
        lastClientY: e.clientY,
      }

      // Touch: require hold before activating drag
      if (isTouch) {
        dragRef.current.touchHoldTimer = setTimeout(() => {
          if (dragRef.current) {
            dragRef.current.touchHoldMet = true
            // Haptic feedback when drag activates
            if (navigator.vibrate) navigator.vibrate(30)
            // Visual feedback — add scale class to source element
            dragRef.current.target.closest('.tl-booking-block')?.classList.add('tl-touch-drag-active')
          }
        }, TOUCH_HOLD_MS)
      }

      lastSnapRef.current = ''

      // Capture pointer for global tracking
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [scrollContainerRef, windowStart],
  )

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const ref = dragRef.current
      if (!ref) return

      ref.lastClientX = e.clientX
      ref.lastClientY = e.clientY

      // ── Pending phase: check if threshold exceeded ──────────────────
      if (ref.phase === 'pending') {
        // Touch: must hold first
        if (ref.isTouch && !ref.touchHoldMet) {
          // If moved too much during hold period, cancel the touch drag
          const dx = e.clientX - ref.startX
          const dy = e.clientY - ref.startY
          if (dx * dx + dy * dy > DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX * 4) {
            if (ref.touchHoldTimer) clearTimeout(ref.touchHoldTimer)
            dragRef.current = null
            return
          }
          return
        }

        const dx = e.clientX - ref.startX
        const dy = e.clientY - ref.startY
        if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
          return // Not enough movement yet
        }

        // Threshold exceeded — activate drag
        ref.phase = 'active'

        // Prevent text selection during drag
        e.preventDefault()

        // Set initial React drag state
        setDragState({
          booking: ref.booking,
          sourceRoomId: ref.sourceRoomId,
          mode: ref.mode,
          originalSpanDays: ref.originalSpanDays,
          newCheckIn: ref.booking.check_in,
          newCheckOut: ref.booking.check_out,
          newRoomId: ref.sourceRoomId,
          hasConflict: false,
          isMaintenanceRoom: false,
        })

        updatePreviewPosRef.current(ref.booking.check_in, ref.booking.check_out, ref.sourceRoomId)

        // Start auto-scroll loop
        if (!autoScrollRaf.current) {
          autoScrollRaf.current = requestAnimationFrame(runAutoScroll)
        }
      }

      // ── Active phase: snap to grid and update ──────────────────────
      const snapped = snapToGridRef.current(
        e.clientX,
        e.clientY,
        ref.mode,
        ref.originalSpanDays,
        ref.grabDayOffset,
        ref.sourceRoomId,
        ref.booking,
      )
      if (!snapped) return

      // Skip state update if snap position hasn't changed
      const snapKey = `${snapped.newCheckIn}|${snapped.newCheckOut}|${snapped.newRoomId}`
      if (snapKey === lastSnapRef.current) return
      lastSnapRef.current = snapKey

      setDragState((prev) =>
        prev
          ? {
              ...prev,
              newCheckIn: snapped.newCheckIn,
              newCheckOut: snapped.newCheckOut,
              newRoomId: snapped.newRoomId,
              hasConflict: snapped.hasConflict,
              isMaintenanceRoom: snapped.isMaintenanceRoom,
            }
          : null,
      )

      updatePreviewPosRef.current(snapped.newCheckIn, snapped.newCheckOut, snapped.newRoomId)
    },
    [runAutoScroll],
  )

  const handlePointerUp = useCallback(
    (_e: PointerEvent) => {
      const ref = dragRef.current
      dragRef.current = null

      // Stop auto-scroll
      if (autoScrollRaf.current) {
        cancelAnimationFrame(autoScrollRaf.current)
        autoScrollRaf.current = 0
      }

      if (!ref) return

      // Clear touch hold timer & visual feedback
      if (ref.touchHoldTimer) clearTimeout(ref.touchHoldTimer)
      ref.target.closest('.tl-booking-block')?.classList.remove('tl-touch-drag-active')

      // If still pending (threshold never exceeded), just clean up.
      // The click event will fire normally for tap behavior.
      if (ref.phase === 'pending') {
        try { ref.target.releasePointerCapture(ref.pointerId) } catch {}
        return
      }

      // Read latest state from ref (avoids stale closure)
      const state = dragStateRef.current

      if (state) {
        // Normalize original dates to yyyy-MM-dd — booking dates from the API
        // may be full ISO timestamps while snapped dates are always yyyy-MM-dd.
        const origCheckIn = format(toDate(ref.booking.check_in), 'yyyy-MM-dd')
        const origCheckOut = format(toDate(ref.booking.check_out), 'yyyy-MM-dd')
        const moved =
          state.newCheckIn !== origCheckIn ||
          state.newCheckOut !== origCheckOut ||
          state.newRoomId !== ref.sourceRoomId

        if (moved) {
          if (state.hasConflict) {
            toast.error('ห้องไม่ว่างในช่วงเวลาที่เลือก')
          } else if (state.isMaintenanceRoom) {
            toast.error('ไม่สามารถย้ายไปห้องที่ปิดซ่อมได้')
          } else {
            onMoveStay({
              bookingId: ref.booking.booking_id,
              stayId: ref.booking.room_stay_id,
              newRoomId: state.newRoomId,
              newCheckIn: state.newCheckIn,
              newCheckOut: state.newCheckOut,
            })
          }
        }
      }

      // Delay clearing state by one frame so click handlers see isBeingDragged=true
      // and skip the tap action after a drag
      requestAnimationFrame(() => {
        setDragState(null)
        setPreviewPos(null)
      })
    },
    [onMoveStay],
  )

  // ── Global pointer event listeners ──────────────────────────────────────

  useEffect(() => {
    const onMove = (e: PointerEvent) => handlePointerMove(e)
    const onUp = (e: PointerEvent) => handlePointerUp(e)

    // Prevent browser scroll while touch-dragging (must be non-passive)
    const onTouchMove = (e: TouchEvent) => {
      const ref = dragRef.current
      if (ref && (ref.touchHoldMet || ref.phase === 'active')) {
        e.preventDefault()
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [handlePointerMove, handlePointerUp])

  // ── ESC to cancel drag ────────────────────────────────────────────────

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragRef.current?.phase === 'active') {
        e.preventDefault()
        cancelDrag()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [cancelDrag])

  // ── Cleanup auto-scroll on unmount ────────────────────────────────────

  useEffect(() => {
    return () => {
      if (autoScrollRaf.current) cancelAnimationFrame(autoScrollRaf.current)
    }
  }, [])

  // ── Keyboard move / resize (delegates to domain) ────────────────────────

  const handleKeyboardMove = useCallback(
    (booking: TimelineBooking, roomId: string, direction: 'left' | 'right' | 'up' | 'down') => {
      const result = computeKeyboardMove(
        booking,
        roomId,
        direction,
        rooms,
        roomIndexMap.current,
        roomMapRef.current,
      )

      if (!result) return

      if (result.hasConflict) {
        toast.error('ห้องไม่ว่างในช่วงเวลาที่เลือก')
        return
      }
      if (result.isMaintenanceRoom) {
        toast.error('ไม่สามารถย้ายไปห้องที่ปิดซ่อมได้')
        return
      }

      onMoveStay({
        bookingId: booking.booking_id,
        stayId: booking.room_stay_id,
        newRoomId: result.newRoomId,
        newCheckIn: result.newCheckIn,
        newCheckOut: result.newCheckOut,
      })
    },
    [rooms, onMoveStay],
  )

  const handleKeyboardResize = useCallback(
    (booking: TimelineBooking, roomId: string, edge: 'extend' | 'shrink') => {
      const result = computeKeyboardResize(booking, roomId, edge, roomMapRef.current)

      if (!result) return

      if (result.hasConflict) {
        toast.error('ห้องไม่ว่างในช่วงเวลาที่เลือก')
        return
      }

      onMoveStay({
        bookingId: booking.booking_id,
        stayId: booking.room_stay_id,
        newRoomId: roomId,
        newCheckIn: result.newCheckIn,
        newCheckOut: result.newCheckOut,
      })
    },
    [onMoveStay],
  )

  return {
    dragState,
    previewPos,
    isDragging: dragState !== null,
    handleDragStart,
    handleKeyboardMove,
    handleKeyboardResize,
    cancelDrag,
  }
}
