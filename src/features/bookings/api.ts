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
  CreatePaymentPayload,
  ExtendStayPayload,
  PaymentResponse,
  TimelineResponse,
  AvailabilityGroupedResponse,
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

  transferRoom: async (bookingId: string, stayId: string, roomId: string): Promise<BookingResponse> => {
    const { data } = await apiClient.post<ApiResponse<BookingResponse>>(
      `/bookings/${bookingId}/stays/${stayId}/transfer`,
      { room_id: roomId },
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

  extendStay: async (bookingId: string, stayId: string, payload: ExtendStayPayload): Promise<BookingResponse> => {
    const { data } = await apiClient.patch<ApiResponse<BookingResponse>>(
      `/bookings/${bookingId}/stays/${stayId}/extend`,
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
}
