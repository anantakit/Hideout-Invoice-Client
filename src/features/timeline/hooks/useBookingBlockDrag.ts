import { useCallback, useRef } from 'react'
import type { TimelineBooking } from '@/features/bookings/types'
import { useTimelineCallbacks } from '../context/TimelineCallbackContext'
import { useDragStateContext } from '../context/DragStateContext'

/** Statuses that can be dragged/resized. */
const DRAGGABLE_STATUSES = new Set([
  'CONFIRMED',
  'RESERVED',
  'ASSIGNED',
  'CHECKED_IN',
  'PARTIALLY_CHECKED_IN',
])

// ── Types ────────────────────────────────────────────────────────────────────

export interface UseBookingBlockDragParams {
  booking: TimelineBooking
  roomId: string
  roomNumber: string
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useBookingBlockDrag({
  booking,
  roomId,
  roomNumber,
}: UseBookingBlockDragParams) {
  const {
    onSelectBooking: onTap,
    onDoubleClickBooking: onDoubleTap,
    onDragStart,
    onContextMenu,
    onKeyboardMove,
    onKeyboardResize,
  } = useTimelineCallbacks()
  const { dragState } = useDragStateContext()
  const isDraggable = DRAGGABLE_STATUSES.has(booking.status)
  const isBeingDragged =
    dragState?.booking.room_stay_id === booking.room_stay_id &&
    dragState?.sourceRoomId === roomId

  // ── Click vs double-click discrimination ──────────────────────────────
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClick = useCallback(() => {
    if (isBeingDragged) return
    if (clickTimerRef.current) return
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null
      onTap(booking)
    }, 250)
  }, [isBeingDragged, onTap, booking])

  const handleDoubleClick = useCallback(() => {
    if (isBeingDragged) return
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
    }
    onDoubleTap(booking)
  }, [isBeingDragged, onDoubleTap, booking])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onTap(booking)
      }
      if (e.key === 'F10' && e.shiftKey) {
        e.preventDefault()
        const rect = (e.target as HTMLElement).getBoundingClientRect()
        onContextMenu(
          booking,
          roomId,
          roomNumber,
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        )
      }
      if (
        isDraggable &&
        (e.key === 'ArrowLeft' ||
          e.key === 'ArrowRight' ||
          e.key === 'ArrowUp' ||
          e.key === 'ArrowDown')
      ) {
        e.preventDefault()
        if (e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
          onKeyboardResize(
            booking,
            roomId,
            e.key === 'ArrowRight' ? 'extend' : 'shrink',
          )
        } else {
          const dir =
            e.key === 'ArrowLeft'
              ? 'left'
              : e.key === 'ArrowRight'
                ? 'right'
                : e.key === 'ArrowUp'
                  ? 'up'
                  : 'down'
          onKeyboardMove(booking, roomId, dir)
        }
      }
    },
    [
      onTap,
      booking,
      onContextMenu,
      roomId,
      roomNumber,
      isDraggable,
      onKeyboardMove,
      onKeyboardResize,
    ],
  )

  // ── Drag handlers ──────────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      if (!isDraggable) return
      onDragStart(e, booking, roomId, 'move')
    },
    [isDraggable, onDragStart, booking, roomId],
  )

  const handleResizeLeftDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      if (e.button !== 0) return
      if (!isDraggable) return
      onDragStart(e, booking, roomId, 'resize-left')
    },
    [isDraggable, onDragStart, booking, roomId],
  )

  const handleResizeRightDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      if (e.button !== 0) return
      if (!isDraggable) return
      onDragStart(e, booking, roomId, 'resize-right')
    },
    [isDraggable, onDragStart, booking, roomId],
  )

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onContextMenu(booking, roomId, roomNumber, e.clientX, e.clientY)
    },
    [onContextMenu, booking, roomId, roomNumber],
  )

  return {
    isDraggable,
    isBeingDragged,
    handleClick,
    handleDoubleClick,
    handleKeyDown,
    handlePointerDown,
    handleResizeLeftDown,
    handleResizeRightDown,
    handleContextMenu,
  } as const
}
