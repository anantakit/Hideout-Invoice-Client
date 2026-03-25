import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingsApi } from '../api'
import type { CreateBookingPayload, BookingQueryParams, CreatePaymentPayload, UpdatePaymentPayload, ExtendStayPayload, MoveStayPayload, EarlyCheckoutPayload, AddStaysPayload } from '../types'

export const AVAILABILITY_GROUPED_KEY = (checkIn: string, checkOut: string, excludeBookingId?: string) =>
  ['availability-grouped', checkIn, checkOut, excludeBookingId ?? ''] as const

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

/** Update booking-level fields (guest info, discount, customer). */
export function useUpdateBooking(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      guest_name?: string
      guest_phone?: string
      customer_id?: string
      clear_customer?: boolean
      discount_amount?: number
      key_deposit_amount?: number
      deposit_returned?: number
      deposit_status?: string
    }) => bookingsApi.update(bookingId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.detail(bookingId) })
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })
}

/** Fetch invoice prefill data for a booking with optional mode/filters. */
export function useInvoicePrefill(
  bookingId: string | undefined,
  opts?: { mode?: 'booking' | 'stay' | 'night'; stayIds?: string[]; date?: string; priceMode?: string },
) {
  return useQuery({
    queryKey: ['invoice-prefill', bookingId, opts?.mode, opts?.stayIds, opts?.date, opts?.priceMode] as const,
    queryFn: () => bookingsApi.getInvoicePrefill(bookingId!, opts),
    enabled: Boolean(bookingId),
  })
}

/** Fetch invoice coverage map for a booking. */
export function useInvoiceCoverage(bookingId: string | undefined) {
  return useQuery({
    queryKey: ['invoice-coverage', bookingId] as const,
    queryFn: () => bookingsApi.getInvoiceCoverage(bookingId!),
    enabled: Boolean(bookingId),
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
      queryClient.invalidateQueries({ queryKey: ['availability-grouped'] })
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })
}

/** Add new room stays to an existing booking. */
export function useAddStays(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AddStaysPayload) => bookingsApi.addStays(bookingId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.detail(bookingId) })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['availability-grouped'] })
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })
}

/** Transfer a CHECKED_IN stay to a different physical room. */
export function useTransferRoom(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ stayId, roomId, transferDate, returnDate }: { stayId: string; roomId: string; transferDate?: string; returnDate?: string }) =>
      bookingsApi.transferRoom(bookingId, stayId, roomId, transferDate, returnDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.detail(bookingId) })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['availability-grouped'] })
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })
}

/** Remove room assignment from a stay. ASSIGNED → RESERVED. */
export function useUnassignRoom(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (stayId: string) => bookingsApi.unassignRoom(bookingId, stayId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.detail(bookingId) })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['availability-grouped'] })
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })
}

/** Assign rooms to stays without checking in. Stays move RESERVED → ASSIGNED. */
export function useAssignRooms(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (stays: { room_stay_id: string; room_id: string }[]) =>
      bookingsApi.assignRooms(bookingId, stays),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.detail(bookingId) })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['availability-grouped'] })
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
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
      queryClient.invalidateQueries({ queryKey: ['availability-grouped'] })
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })
}

/** Checkout rooms: moves CHECKED_IN stays to CHECKED_OUT atomically. */
export function useCheckoutRooms(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (stayIds: string[]) => bookingsApi.checkoutRooms(bookingId, stayIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.detail(bookingId) })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['availability-grouped'] })
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })
}

/** Early checkout: truncate check_out to today (or specified date), recompute total, free room. */
export function useEarlyCheckout(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ stayId, payload }: { stayId: string; payload?: EarlyCheckoutPayload }) =>
      bookingsApi.earlyCheckout(bookingId, stayId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.detail(bookingId) })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['availability-grouped'] })
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })
}

/** Create a booking. Invalidates availability cache on success. */
export function useCreateBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateBookingPayload) => bookingsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['availability-grouped'] })
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })
}

/**
 * Fetch room types with their physical rooms and per-room availability.
 * Only enabled when both check-in and check-out dates are non-empty.
 */
export function useAvailabilityGrouped(checkIn: string, checkOut: string, enabled = true, excludeBookingId?: string) {
  return useQuery({
    queryKey: AVAILABILITY_GROUPED_KEY(checkIn, checkOut, excludeBookingId),
    queryFn: () => bookingsApi.getAvailabilityGrouped(checkIn, checkOut, excludeBookingId),
    enabled: enabled && Boolean(checkIn && checkOut && checkOut > checkIn),
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
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

/** Edit an existing payment's amount, method, or note. */
export function useUpdatePayment(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ paymentId, payload }: { paymentId: string; payload: UpdatePaymentPayload }) =>
      bookingsApi.updatePayment(bookingId, paymentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.detail(bookingId) })
    },
  })
}

/** Move a stay to a different room and/or date range (timeline drag-and-drop). */
export function useMoveStay() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ bookingId, stayId, payload }: { bookingId: string; stayId: string; payload: MoveStayPayload }) =>
      bookingsApi.moveStay(bookingId, stayId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['availability-grouped'] })
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })
}

/** Extend a stay's check-out date. Returns success or conflict with available rooms. */
export function useExtendStay(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ stayId, payload }: { stayId: string; payload: ExtendStayPayload }) =>
      bookingsApi.extendStay(bookingId, stayId, payload),
    onSuccess: (result) => {
      if (result.type === 'success') {
        queryClient.invalidateQueries({ queryKey: BOOKING_KEYS.detail(bookingId) })
        queryClient.invalidateQueries({ queryKey: ['availability'] })
        queryClient.invalidateQueries({ queryKey: ['availability-grouped'] })
        queryClient.invalidateQueries({ queryKey: ['timeline'] })
      }
      // conflict case: don't invalidate — UI will show room picker
    },
  })
}

/**
 * Fetch the 7-day rolling timeline.
 * Re-fetches when the window changes. Stale time is short (30 s) because
 * room status can change frequently during operations hours.
 *
 * @param from YYYY-MM-DD inclusive
 * @param to   YYYY-MM-DD exclusive
 */
export function useTimeline(from: string, to: string) {
  return useQuery({
    queryKey: ['timeline', from, to] as const,
    queryFn: () => bookingsApi.getTimeline(from, to),
    enabled: Boolean(from && to),
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  })
}
