import { useState, useCallback, useRef, useEffect } from 'react'
import { addDays, differenceInDays, format, parseISO, startOfDay } from 'date-fns'
import toast from 'react-hot-toast'
import type { TimelineRoom, TimelineBooking } from '../../types'
import { TIMELINE_CELL_WIDTH_PX, TIMELINE_ROOM_COL_PX } from './tokens'

/** Parse a date string that may be YYYY-MM-DD or a full ISO timestamp. */
function toDate(s: string): Date {
  return startOfDay(parseISO(s))
}

/** Minimum pointer movement (px) before a drag activates. */
const DRAG_THRESHOLD_PX = 5

/** Touch hold delay (ms) before drag activates on touch devices. */
const TOUCH_HOLD_MS = 150

/** Auto-scroll edge zone (px from container edge). */
const AUTO_SCROLL_EDGE_PX = 60

/** Max auto-scroll speed (px per 16ms frame). */
const AUTO_SCROLL_MAX_SPEED = 12

// ─── Types ────────────────────────────────────────────────────────────────────

export type DragMode = 'move' | 'resize-left' | 'resize-right'

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

export interface DragPreviewPosition {
  /** Left offset in px from the grid area start. */
  left: number
  /** Top offset in px from the virtualizer container top. */
  top: number
  /** Width in px. */
  width: number
  /** Height in px. */
  height: number
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

  const roomIndexMap = useRef<Map<string, number>>(new Map())

  // Auto-scroll animation frame ID
  const autoScrollRaf = useRef<number>(0)

  // Keep room index map fresh
  useEffect(() => {
    const map = new Map<string, number>()
    rooms.forEach((r, i) => map.set(r.id, i))
    roomIndexMap.current = map
  }, [rooms])

  // ── Conflict detection ──────────────────────────────────────────────────

  const checkConflict = useCallback(
    (targetRoomId: string, checkIn: string, checkOut: string, excludeStayId: string): boolean => {
      const room = rooms.find((r) => r.id === targetRoomId)
      if (!room) return true
      return room.bookings.some(
        (b) =>
          b.room_stay_id !== excludeStayId &&
          b.status !== 'CANCELLED' &&
          b.status !== 'CHECKED_OUT' &&
          b.check_in < checkOut &&
          b.check_out > checkIn,
      )
    },
    [rooms],
  )

  const isMaintenanceRoom = useCallback(
    (roomId: string): boolean => {
      const room = rooms.find((r) => r.id === roomId)
      return room?.status === 'MAINTENANCE'
    },
    [rooms],
  )

  // ── Snap pointer position to grid ───────────────────────────────────────

  const snapToGrid = useCallback(
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

      // Snap day index — floor so the booking lands in the column the pointer is in
      const dayIndex = Math.floor(relX / TIMELINE_CELL_WIDTH_PX)

      // Find target room by Y coordinate
      let targetRoomId = sourceRoomId
      for (const room of rooms) {
        const roomTop = getRoomTop(room.id)
        if (roomTop !== undefined) {
          const h = getRoomHeight(room.id)
          if (relY >= roomTop && relY < roomTop + h) {
            targetRoomId = room.id
            break
          }
        }
      }

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

      const hasConflict = checkConflict(targetRoomId, checkInStr, checkOutStr, booking.room_stay_id)
      const maintenance = isMaintenanceRoom(targetRoomId)

      return {
        newCheckIn: checkInStr,
        newCheckOut: checkOutStr,
        newRoomId: targetRoomId,
        hasConflict,
        isMaintenanceRoom: maintenance,
      }
    },
    [scrollContainerRef, gridContainerRef, rooms, windowStart, windowDays, checkConflict, isMaintenanceRoom, getRoomTop, getRoomHeight],
  )

  // ── Update preview position ─────────────────────────────────────────────

  const updatePreviewPos = useCallback(
    (checkIn: string, checkOut: string, roomId: string) => {
      const offsetDays = differenceInDays(
        toDate(checkIn),
        windowStart,
      )
      const spanDays = differenceInDays(
        toDate(checkOut),
        toDate(checkIn),
      )
      const roomTop = getRoomTop(roomId)
      const roomHeight = getRoomHeight(roomId)

      if (roomTop === undefined) return

      setPreviewPos({
        left: TIMELINE_ROOM_COL_PX + offsetDays * TIMELINE_CELL_WIDTH_PX,
        top: roomTop,
        width: spanDays * TIMELINE_CELL_WIDTH_PX,
        height: roomHeight,
      })
    },
    [windowStart, getRoomTop, getRoomHeight],
  )

  // ── Auto-scroll during drag ───────────────────────────────────────────

  const runAutoScroll = useCallback(() => {
    const ref = dragRef.current
    const el = scrollContainerRef.current
    if (!ref || ref.phase !== 'active' || !el) {
      autoScrollRaf.current = 0
      return
    }

    const rect = el.getBoundingClientRect()
    const cx = ref.lastClientX
    const cy = ref.lastClientY

    let dx = 0
    let dy = 0

    // Horizontal auto-scroll
    const leftDist = cx - rect.left - TIMELINE_ROOM_COL_PX
    const rightDist = rect.right - cx
    if (leftDist < AUTO_SCROLL_EDGE_PX && leftDist > 0) {
      dx = -AUTO_SCROLL_MAX_SPEED * (1 - leftDist / AUTO_SCROLL_EDGE_PX)
    } else if (rightDist < AUTO_SCROLL_EDGE_PX && rightDist > 0) {
      dx = AUTO_SCROLL_MAX_SPEED * (1 - rightDist / AUTO_SCROLL_EDGE_PX)
    }

    // Vertical auto-scroll
    const topDist = cy - rect.top
    const bottomDist = rect.bottom - cy
    if (topDist < AUTO_SCROLL_EDGE_PX && topDist > 0) {
      dy = -AUTO_SCROLL_MAX_SPEED * (1 - topDist / AUTO_SCROLL_EDGE_PX)
    } else if (bottomDist < AUTO_SCROLL_EDGE_PX && bottomDist > 0) {
      dy = AUTO_SCROLL_MAX_SPEED * (1 - bottomDist / AUTO_SCROLL_EDGE_PX)
    }

    if (dx !== 0 || dy !== 0) {
      el.scrollLeft += dx
      el.scrollTop += dy

      // Re-snap after scroll so drag coordinates remain correct
      const snapped = snapToGrid(
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
          updatePreviewPos(snapped.newCheckIn, snapped.newCheckOut, snapped.newRoomId)
        }
      }
    }

    autoScrollRaf.current = requestAnimationFrame(runAutoScroll)
  }, [scrollContainerRef, snapToGrid, updatePreviewPos])

  // ── Cancel drag (ESC or programmatic) ─────────────────────────────────

  const cancelDrag = useCallback(() => {
    const ref = dragRef.current
    if (!ref) return
    if (ref.touchHoldTimer) clearTimeout(ref.touchHoldTimer)
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
      const pointerRelX = e.clientX - containerRect.left - TIMELINE_ROOM_COL_PX + el.scrollLeft
      const pointerDayIndex = Math.floor(pointerRelX / TIMELINE_CELL_WIDTH_PX)
      const grabDayOffset = Math.max(0, pointerDayIndex - offsetDays)

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
        grabDayOffset,
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

        updatePreviewPos(ref.booking.check_in, ref.booking.check_out, ref.sourceRoomId)

        // Start auto-scroll loop
        if (!autoScrollRaf.current) {
          autoScrollRaf.current = requestAnimationFrame(runAutoScroll)
        }
      }

      // ── Active phase: snap to grid and update ──────────────────────
      const snapped = snapToGrid(
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

      updatePreviewPos(snapped.newCheckIn, snapped.newCheckOut, snapped.newRoomId)
    },
    [snapToGrid, updatePreviewPos, runAutoScroll],
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

      // Clear touch hold timer
      if (ref.touchHoldTimer) clearTimeout(ref.touchHoldTimer)

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

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
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

  // ── Keyboard move / resize ────────────────────────────────────────────

  const handleKeyboardMove = useCallback(
    (booking: TimelineBooking, roomId: string, direction: 'left' | 'right' | 'up' | 'down') => {
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
        const currentIdx = roomIndexMap.current.get(roomId) ?? 0
        const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1
        if (targetIdx < 0 || targetIdx >= rooms.length) return
        newRoomId = rooms[targetIdx].id
      }

      const ciStr = format(newCheckIn, 'yyyy-MM-dd')
      const coStr = format(newCheckOut, 'yyyy-MM-dd')

      const hasConflict = checkConflict(newRoomId, ciStr, coStr, booking.room_stay_id)
      const maintenance = isMaintenanceRoom(newRoomId)

      if (hasConflict) {
        toast.error('ห้องไม่ว่างในช่วงเวลาที่เลือก')
        return
      }
      if (maintenance) {
        toast.error('ไม่สามารถย้ายไปห้องที่ปิดซ่อมได้')
        return
      }

      onMoveStay({
        bookingId: booking.booking_id,
        stayId: booking.room_stay_id,
        newRoomId,
        newCheckIn: ciStr,
        newCheckOut: coStr,
      })
    },
    [rooms, checkConflict, isMaintenanceRoom, onMoveStay],
  )

  const handleKeyboardResize = useCallback(
    (booking: TimelineBooking, roomId: string, edge: 'extend' | 'shrink') => {
      const checkIn = toDate(booking.check_in)
      const checkOut = toDate(booking.check_out)
      const span = differenceInDays(checkOut, checkIn)

      let newCheckOut: Date
      if (edge === 'extend') {
        newCheckOut = addDays(checkOut, 1)
      } else {
        if (span <= 1) return // Minimum 1 night
        newCheckOut = addDays(checkOut, -1)
      }

      const ciStr = format(checkIn, 'yyyy-MM-dd')
      const coStr = format(newCheckOut, 'yyyy-MM-dd')

      const hasConflict = checkConflict(roomId, ciStr, coStr, booking.room_stay_id)
      if (hasConflict) {
        toast.error('ห้องไม่ว่างในช่วงเวลาที่เลือก')
        return
      }

      onMoveStay({
        bookingId: booking.booking_id,
        stayId: booking.room_stay_id,
        newRoomId: roomId,
        newCheckIn: ciStr,
        newCheckOut: coStr,
      })
    },
    [checkConflict, onMoveStay],
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
