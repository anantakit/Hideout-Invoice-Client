import { apiClient } from '../../shared/api/client'
import type { ApiResponse } from '../../shared/types/api'
import type {
  RoomTypeResponse,
  RoomResponse,
  AvailabilityResponse,
  RoomAvailabilityResponse,
  BookingResponse,
  BookingListResponse,
  BookingQueryParams,
  CreateBookingPayload,
  AddStaysPayload,
  CreatePaymentPayload,
  ExtendStayPayload,
  ExtendStayConflictData,
  MoveStayPayload,
  EarlyCheckoutPayload,
  PaymentResponse,
  TimelineResponse,
  AvailabilityGroupedResponse,
  AutoAssignResponse,
  InvoicePrefillResponse,
  BookingEventResponse,
  PrefillMode,
  InvoiceCoverageResponse,
} from './types'

export const bookingsApi = {
  list: async (params: BookingQueryParams): Promise<BookingListResponse> => {
    const { data } = await apiClient.get<ApiResponse<BookingListResponse>>('/bookings', { params })
    return data.data
  },

  listRoomTypes: async (): Promise<RoomTypeResponse[]> => {
    const { data } = await apiClient.get<ApiResponse<RoomTypeResponse[]>>('/room-types')
    return data.data
  },

  getAvailability: async (
    roomTypeId: string,
    checkIn: string,
    checkOut: string,
  ): Promise<AvailabilityResponse> => {
    const { data } = await apiClient.get<ApiResponse<AvailabilityResponse>>('/availability', {
      params: { room_type_id: roomTypeId, check_in: checkIn, check_out: checkOut },
    })
    return data.data
  },

  getRoomAvailability: async (
    roomId: string,
    checkIn: string,
    checkOut: string,
  ): Promise<RoomAvailabilityResponse> => {
    const { data } = await apiClient.get<ApiResponse<RoomAvailabilityResponse>>('/availability', {
      params: { room_id: roomId, check_in: checkIn, check_out: checkOut },
    })
    return data.data
  },

  create: async (payload: CreateBookingPayload): Promise<BookingResponse> => {
    const { data } = await apiClient.post<ApiResponse<BookingResponse>>('/bookings', payload)
    return data.data
  },

  addStays: async (bookingId: string, payload: AddStaysPayload): Promise<BookingResponse> => {
    const { data } = await apiClient.post<ApiResponse<BookingResponse>>(
      `/bookings/${bookingId}/stays`,
      payload,
    )
    return data.data
  },

  update: async (id: string, payload: {
    guest_name?: string
    guest_phone?: string
    customer_id?: string
    clear_customer?: boolean
    discount_amount?: number
  }): Promise<BookingResponse> => {
    const { data } = await apiClient.patch<ApiResponse<BookingResponse>>(`/bookings/${id}`, payload)
    return data.data
  },

  getById: async (id: string): Promise<BookingResponse> => {
    const { data } = await apiClient.get<ApiResponse<BookingResponse>>(`/bookings/${id}`)
    return data.data
  },

  listRooms: async (roomTypeId?: string): Promise<RoomResponse[]> => {
    const { data } = await apiClient.get<ApiResponse<RoomResponse[]>>('/rooms', {
      params: roomTypeId ? { room_type_id: roomTypeId } : undefined,
    })
    return data.data
  },

  cancelStay: async (bookingId: string, stayId: string): Promise<void> => {
    await apiClient.post(`/bookings/${bookingId}/stays/${stayId}/cancel`)
  },

  transferRoom: async (bookingId: string, stayId: string, roomId: string, transferDate?: string, returnDate?: string): Promise<BookingResponse> => {
    const { data } = await apiClient.post<ApiResponse<BookingResponse>>(
      `/bookings/${bookingId}/stays/${stayId}/transfer`,
      {
        room_id: roomId,
        ...(transferDate && { transfer_date: transferDate }),
        ...(returnDate && { return_date: returnDate }),
      },
    )
    return data.data
  },

  unassignRoom: async (bookingId: string, stayId: string): Promise<BookingResponse> => {
    const { data } = await apiClient.post<ApiResponse<BookingResponse>>(
      `/bookings/${bookingId}/stays/${stayId}/unassign`,
    )
    return data.data
  },

  assignRooms: async (
    bookingId: string,
    stays: { room_stay_id: string; room_id: string }[],
  ): Promise<BookingResponse> => {
    const { data } = await apiClient.post<ApiResponse<BookingResponse>>(
      `/bookings/${bookingId}/assign`,
      { stays },
    )
    return data.data
  },

  checkInRooms: async (
    bookingId: string,
    stays: { room_stay_id: string; room_id: string }[],
  ): Promise<BookingResponse> => {
    const { data } = await apiClient.post<ApiResponse<BookingResponse>>(
      `/bookings/${bookingId}/checkin`,
      { stays },
    )
    return data.data
  },

  createPayment: async (bookingId: string, payload: CreatePaymentPayload): Promise<PaymentResponse> => {
    const { data } = await apiClient.post<ApiResponse<PaymentResponse>>(
      `/bookings/${bookingId}/payments`,
      payload,
    )
    return data.data
  },

  extendStay: async (
    bookingId: string,
    stayId: string,
    payload: ExtendStayPayload,
  ): Promise<
    | { type: 'success'; booking: BookingResponse }
    | { type: 'conflict'; conflict: ExtendStayConflictData }
  > => {
    try {
      const { data } = await apiClient.patch<ApiResponse<BookingResponse>>(
        `/bookings/${bookingId}/stays/${stayId}/extend`,
        payload,
      )
      return { type: 'success', booking: data.data }
    } catch (err: any) {
      if (err?.response?.status === 409 && err.response.data?.conflict) {
        return { type: 'conflict', conflict: err.response.data.conflict }
      }
      throw err
    }
  },

  moveStay: async (bookingId: string, stayId: string, payload: MoveStayPayload): Promise<BookingResponse> => {
    const { data } = await apiClient.patch<ApiResponse<BookingResponse>>(
      `/bookings/${bookingId}/stays/${stayId}/move`,
      payload,
    )
    return data.data
  },

  checkoutRooms: async (bookingId: string, stayIds: string[]): Promise<BookingResponse> => {
    const { data } = await apiClient.post<ApiResponse<BookingResponse>>(
      `/bookings/${bookingId}/checkout`,
      { stay_ids: stayIds },
    )
    return data.data
  },

  earlyCheckout: async (bookingId: string, stayId: string, payload?: EarlyCheckoutPayload): Promise<BookingResponse> => {
    const { data } = await apiClient.post<ApiResponse<BookingResponse>>(
      `/bookings/${bookingId}/stays/${stayId}/early-checkout`,
      payload ?? {},
    )
    return data.data
  },

  autoAssignRooms: async (date?: string): Promise<AutoAssignResponse> => {
    const params = date ? `?date=${date}` : ''
    const { data } = await apiClient.post<ApiResponse<AutoAssignResponse>>(`/bookings/auto-assign${params}`)
    return data.data
  },

  /**
   * Fetch the 7-day rolling timeline.
   * @param from YYYY-MM-DD inclusive
   * @param to   YYYY-MM-DD exclusive
   */
  getTimeline: async (from: string, to: string): Promise<TimelineResponse> => {
    const { data } = await apiClient.get<ApiResponse<TimelineResponse>>('/timeline', {
      params: { from, to },
    })
    return data.data
  },

  /**
   * Returns all room types with their physical rooms and per-room availability
   * for the given date window.  Used by the unified booking creation form.
   */
  getAvailabilityGrouped: async (
    checkIn: string,
    checkOut: string,
    excludeBookingId?: string,
  ): Promise<AvailabilityGroupedResponse> => {
    const params: Record<string, string> = { check_in: checkIn, check_out: checkOut }
    if (excludeBookingId) params.exclude_booking_id = excludeBookingId
    const { data } = await apiClient.get<ApiResponse<AvailabilityGroupedResponse>>(
      '/rooms/availability-grouped',
      { params },
    )
    return data.data
  },

  getInvoicePrefill: async (
    bookingId: string,
    opts?: { mode?: PrefillMode; stayIds?: string[]; date?: string; priceMode?: string },
  ): Promise<InvoicePrefillResponse> => {
    const params: Record<string, string> = {}
    if (opts?.mode && opts.mode !== 'booking') params.mode = opts.mode
    if (opts?.stayIds?.length) params.stay_ids = opts.stayIds.join(',')
    if (opts?.date) params.date = opts.date
    if (opts?.priceMode && opts.priceMode !== 'rack') params.price_mode = opts.priceMode
    const { data } = await apiClient.get<ApiResponse<InvoicePrefillResponse>>(
      `/bookings/${bookingId}/invoice-prefill`,
      { params },
    )
    return data.data
  },

  getBookingEvents: async (bookingId: string): Promise<BookingEventResponse[]> => {
    const { data } = await apiClient.get<ApiResponse<BookingEventResponse[]>>(
      `/bookings/${bookingId}/events`,
    )
    return data.data
  },

  getInvoiceCoverage: async (bookingId: string): Promise<InvoiceCoverageResponse> => {
    const { data } = await apiClient.get<ApiResponse<InvoiceCoverageResponse>>(
      `/bookings/${bookingId}/invoice-coverage`,
    )
    return data.data
  },
}
