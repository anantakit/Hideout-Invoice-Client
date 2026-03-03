import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingsApi } from '../api'
import type { CreateBookingPayload, BookingQueryParams, CreatePaymentPayload, ExtendStayPayload } from '../types'

export const BOOKING_KEYS = {
  roomTypes: ['room-types'] as const,
  availability: (roomTypeId: string, checkIn: string, checkOut: string) =>
    ['availability', roomTypeId, checkIn, checkOut] as const,
  detail: (id: string) => ['bookings', id] as const,
  rooms: (roomTypeId?: string) => ['rooms', roomTypeId ?? ''] as const,
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

/** Group check-in: assigns rooms and checks in all listed stays atomically. */
export function useCheckInRooms(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (stays: { room_stay_id: string; room_id: string }[]) =>
      bookingsApi.checkInRooms(bookingId, stays),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.detail(bookingId) })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
    },
  })
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

/** Record a payment against a booking. Refetches the booking detail on success. */
export function useCreatePayment(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreatePaymentPayload) => bookingsApi.createPayment(bookingId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.detail(bookingId) })
    },
  })
}

/** Extend a stay's check-out date. Refetches the booking detail on success. */
export function useExtendStay(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ stayId, payload }: { stayId: string; payload: ExtendStayPayload }) =>
      bookingsApi.extendStay(bookingId, stayId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.detail(bookingId) })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
    },
  })
}
