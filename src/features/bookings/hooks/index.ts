import { useState } from 'react'
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { bookingsApi } from '../api'
import type { CreateBookingPayload, BookingQueryParams, RoomResponse } from '../types'

export const BOOKING_KEYS = {
  roomTypes: ['room-types'] as const,
  availability: (roomTypeId: string, checkIn: string, checkOut: string) =>
    ['availability', roomTypeId, checkIn, checkOut] as const,
  roomAvailability: (roomId: string, checkIn: string, checkOut: string) =>
    ['room-availability', roomId, checkIn, checkOut] as const,
  detail: (id: string) => ['bookings', id] as const,
  rooms: (roomTypeId?: string) => ['rooms', roomTypeId ?? ''] as const,
}

// ─── Room with per-date availability ─────────────────────────────────────────

export interface RoomWithAvailability extends RoomResponse {
  /** null = availability query still loading */
  available: boolean | null
  availabilityLoading: boolean
}

/** Paginated booking list with optional search + status filter. */
export function useBookings(params: BookingQueryParams) {
  return useQuery({
    queryKey: ['bookings', params],
    queryFn: () => bookingsApi.list(params),
    placeholderData: (prev) => prev,
  })
}

/** Fetch all room types (cached 10 min — room types rarely change). */
export function useRoomTypes() {
  return useQuery({
    queryKey: BOOKING_KEYS.roomTypes,
    queryFn: bookingsApi.listRoomTypes,
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Raw TanStack Query wrapper for the availability endpoint.
 * Prefer `useAvailability` from `./useAvailability` for component use —
 * it adds debouncing, cancellation, and a derived status value.
 *
 * @internal used only where the full query object (isLoading, isError, etc.) is needed.
 */
export function useAvailabilityQuery(roomTypeId: string, checkIn: string, checkOut: string) {
  return useQuery({
    queryKey: BOOKING_KEYS.availability(roomTypeId, checkIn, checkOut),
    queryFn: () => bookingsApi.getAvailability(roomTypeId, checkIn, checkOut),
    enabled: Boolean(roomTypeId && checkIn && checkOut),
    staleTime: 30 * 1000,
  })
}

/** Fetch a single booking by ID. */
export function useBooking(id: string) {
  return useQuery({
    queryKey: BOOKING_KEYS.detail(id),
    queryFn: () => bookingsApi.getById(id),
    enabled: Boolean(id),
  })
}

/** Fetch rooms, optionally filtered by room type. */
export function useRooms(roomTypeId?: string, enabled = true) {
  return useQuery({
    queryKey: BOOKING_KEYS.rooms(roomTypeId),
    queryFn: () => bookingsApi.listRooms(roomTypeId),
    enabled: enabled && Boolean(roomTypeId),
    staleTime: 30 * 1000,
  })
}

/**
 * Fetches rooms for a room type and parallel-checks each room's availability
 * for the given date window.  Returns rooms annotated with `available` + `availabilityLoading`.
 *
 * Pass `enabled=false` to skip fetching (e.g. when the modal is closed).
 */
export function useRoomsWithAvailability(
  roomTypeId: string | undefined,
  checkIn: string,
  checkOut: string,
  enabled = true,
): { rooms: RoomWithAvailability[]; isLoading: boolean; isError: boolean } {
  const roomsQuery = useQuery({
    queryKey: BOOKING_KEYS.rooms(roomTypeId),
    queryFn: () => bookingsApi.listRooms(roomTypeId),
    enabled: enabled && Boolean(roomTypeId),
    staleTime: 30 * 1000,
  })

  const rooms = roomsQuery.data ?? []
  const datesReady = Boolean(checkIn && checkOut)

  const availabilityQueries = useQueries({
    queries: rooms.map((room) => ({
      queryKey: BOOKING_KEYS.roomAvailability(room.id, checkIn, checkOut),
      queryFn: () => bookingsApi.getRoomAvailability(room.id, checkIn, checkOut),
      enabled: enabled && datesReady && Boolean(room.id),
      staleTime: 30 * 1000,
    })),
  })

  const roomsWithAvailability: RoomWithAvailability[] = rooms.map((room, i) => ({
    ...room,
    available: availabilityQueries[i]?.data?.available ?? null,
    availabilityLoading: availabilityQueries[i]?.isLoading ?? false,
  }))

  const isLoading =
    roomsQuery.isLoading ||
    (rooms.length > 0 && datesReady && availabilityQueries.some((q) => q.isLoading))

  return { rooms: roomsWithAvailability, isLoading, isError: roomsQuery.isError }
}

/** Assign a room to a stay. Refetches the booking on success. */
export function useAssignRoom(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ stayId, roomId }: { stayId: string; roomId: string }) =>
      bookingsApi.assignRoom(bookingId, stayId, roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.detail(bookingId) })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
    },
  })
}

/** Cancel a stay. Refetches the booking + invalidates availability on success. */
export function useCancelStay(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (stayId: string) => bookingsApi.cancelStay(bookingId, stayId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.detail(bookingId) })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
    },
  })
}

/** Check in a stay. Refetches the booking on success. */
export function useCheckInStay(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (stayId: string) => bookingsApi.checkInStay(bookingId, stayId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.detail(bookingId) })
    },
  })
}

// ─── useStayActions ───────────────────────────────────────────────────────────

export interface UseStayActionsResult {
  /** Assign a specific room to the stay. No-ops if any action is already in flight. */
  assignRoom: (roomId: string) => void
  /** Cancel the stay. No-ops if any action is already in flight. */
  cancelStay: () => void
  /** Advance the stay from ASSIGNED → CHECKED_IN. No-ops if any action is in flight. */
  checkInStay: () => void
  /** True while any of the three actions is pending (prevents double-submit). */
  loading: boolean
  /** Message from the most recent failed action; null when idle or after a success. */
  error: string | null
}

/**
 * Aggregates assign / cancel / check-in mutations for a single stay.
 *
 * Features:
 *  • Shared `loading` flag — blocks concurrent submissions across all three actions
 *  • Toast on success (action-specific messages)
 *  • `error` state updated on failure; cleared before each new attempt
 *  • Auto-refetch via TanStack Query invalidation on success
 */
export function useStayActions(bookingId: string, stayId: string): UseStayActionsResult {
  const [error, setError] = useState<string | null>(null)

  const assign  = useAssignRoom(bookingId)
  const cancel  = useCancelStay(bookingId)
  const checkIn = useCheckInStay(bookingId)

  const loading = assign.isPending || cancel.isPending || checkIn.isPending

  function handleError(err: Error) {
    const msg = err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'
    setError(msg)
    toast.error(msg)
  }

  function assignRoom(roomId: string) {
    if (loading) return
    setError(null)
    assign.mutate(
      { stayId, roomId },
      {
        onSuccess: () => toast.success('กำหนดห้องสำเร็จ'),
        onError: handleError,
      },
    )
  }

  function cancelStay() {
    if (loading) return
    setError(null)
    cancel.mutate(stayId, {
      onSuccess: () => toast.success('ยกเลิกรายการสำเร็จ'),
      onError: handleError,
    })
  }

  function checkInStay() {
    if (loading) return
    setError(null)
    checkIn.mutate(stayId, {
      onSuccess: () => toast.success('เช็คอินสำเร็จ'),
      onError: handleError,
    })
  }

  return { assignRoom, cancelStay, checkInStay, loading, error }
}

/** Create a booking. Invalidates availability cache on success. */
export function useCreateBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateBookingPayload) => bookingsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] })
    },
  })
}
