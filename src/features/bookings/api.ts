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

  assignRoom: async (bookingId: string, stayId: string, roomId: string): Promise<void> => {
    await apiClient.post(`/bookings/${bookingId}/stays/${stayId}/assign`, { room_id: roomId })
  },

  cancelStay: async (bookingId: string, stayId: string): Promise<void> => {
    await apiClient.post(`/bookings/${bookingId}/stays/${stayId}/cancel`)
  },

  checkInStay: async (bookingId: string, stayId: string): Promise<void> => {
    await apiClient.post(`/bookings/${bookingId}/stays/${stayId}/checkin`)
  },
}
