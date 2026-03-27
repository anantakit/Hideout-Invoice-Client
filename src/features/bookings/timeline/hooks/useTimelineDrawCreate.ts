import { useEffect } from 'react'
import type { TimelineRoom } from '../../types'
import type { CreateBookingPrefill, DrawerMode } from '../components/OperationsDrawer'
import { useTimelineDraw } from './useTimelineDraw'

interface UseTimelineDrawCreateOptions {
  rooms: TimelineRoom[]
  windowStart: Date
  windowDays: number
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  getRoomTop: (roomId: string) => number | undefined
  getRoomHeight: (roomId: string) => number
  isDragging: boolean
  /** Refs for resolving room metadata without triggering re-renders. */
  allRoomsRef: React.MutableRefObject<TimelineRoom[]>
  roomTypeIdByRoomIdRef: React.MutableRefObject<Record<string, string>>
  roomTypeNameByRoomIdRef: React.MutableRefObject<Record<string, string>>
  priceByRoomTypeIdRef: React.MutableRefObject<Record<string, number>>
  /** State setters — driven by the completed-draw effect. */
  setCreateBookingPrefill: React.Dispatch<React.SetStateAction<CreateBookingPrefill | null>>
  setDrawerMode: React.Dispatch<React.SetStateAction<DrawerMode>>
}

/**
 * Wraps the low-level `useTimelineDraw` hook and reacts to completed draws
 * by opening the create-booking drawer with a prefilled payload.
 */
export function useTimelineDrawCreate({
  rooms,
  windowStart,
  windowDays,
  scrollContainerRef,
  getRoomTop,
  getRoomHeight,
  isDragging,
  allRoomsRef,
  roomTypeIdByRoomIdRef,
  roomTypeNameByRoomIdRef,
  priceByRoomTypeIdRef,
  setCreateBookingPrefill,
  setDrawerMode,
}: UseTimelineDrawCreateOptions) {
  const { drawPreview, completedDraw, clearCompletedDraw, handleDrawStart } =
    useTimelineDraw({
      rooms,
      windowStart,
      windowDays,
      scrollContainerRef,
      getRoomTop,
      getRoomHeight,
      isDragging,
    })

  // React to completed draw — open create-booking drawer
  useEffect(() => {
    if (!completedDraw) return
    const { roomId, checkIn, checkOut } = completedDraw
    const roomTypeId = roomTypeIdByRoomIdRef.current[roomId] ?? ''
    const room = allRoomsRef.current.find((r) => r.id === roomId)
    setCreateBookingPrefill({
      roomId,
      roomTypeId,
      roomNumber: room?.room_number ?? '',
      roomTypeName: roomTypeNameByRoomIdRef.current[roomId] ?? '',
      pricePerNight: priceByRoomTypeIdRef.current[roomTypeId] ?? 0,
      checkIn,
      checkOut,
    })
    setDrawerMode('create-booking')
    clearCompletedDraw()
  }, [
    completedDraw,
    clearCompletedDraw,
    allRoomsRef,
    roomTypeIdByRoomIdRef,
    roomTypeNameByRoomIdRef,
    priceByRoomTypeIdRef,
    setCreateBookingPrefill,
    setDrawerMode,
  ])

  return { drawPreview, handleDrawStart }
}
