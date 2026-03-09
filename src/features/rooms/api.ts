import { apiClient } from '@/shared/api/client'
import type {
  RoomType,
  Room,
  CreateRoomTypePayload,
  UpdateRoomTypePayload,
  CreateRoomPayload,
  UpdateRoomPayload,
  UpdateRoomStatusPayload,
} from './types'

interface ApiResponse<T> {
  status: number
  data: T
}

export const roomsApi = {
  // ── Room Types ──────────────────────────────────────────────────────────────
  listRoomTypes: async (): Promise<RoomType[]> => {
    const { data } = await apiClient.get<ApiResponse<RoomType[]>>('/room-types')
    return data.data
  },

  createRoomType: async (payload: CreateRoomTypePayload): Promise<RoomType> => {
    const { data } = await apiClient.post<ApiResponse<RoomType>>('/room-types', payload)
    return data.data
  },

  updateRoomType: async (id: string, payload: UpdateRoomTypePayload): Promise<RoomType> => {
    const { data } = await apiClient.patch<ApiResponse<RoomType>>(`/room-types/${id}`, payload)
    return data.data
  },

  deleteRoomType: async (id: string): Promise<void> => {
    await apiClient.delete(`/room-types/${id}`)
  },

  // ── Rooms ───────────────────────────────────────────────────────────────────
  listRooms: async (roomTypeId?: string): Promise<Room[]> => {
    const params = roomTypeId ? { room_type_id: roomTypeId } : undefined
    const { data } = await apiClient.get<ApiResponse<Room[]>>('/rooms', { params })
    return data.data
  },

  createRoom: async (payload: CreateRoomPayload): Promise<Room> => {
    const { data } = await apiClient.post<ApiResponse<Room>>('/rooms', payload)
    return data.data
  },

  updateRoom: async (id: string, payload: UpdateRoomPayload): Promise<Room> => {
    const { data } = await apiClient.patch<ApiResponse<Room>>(`/rooms/${id}`, payload)
    return data.data
  },

  deleteRoom: async (id: string): Promise<void> => {
    await apiClient.delete(`/rooms/${id}`)
  },

  updateRoomStatus: async (id: string, payload: UpdateRoomStatusPayload): Promise<void> => {
    await apiClient.patch(`/rooms/${id}/status`, payload)
  },
}
