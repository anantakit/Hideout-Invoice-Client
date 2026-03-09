export interface RoomType {
  id: string
  name: string
  price_per_night: number
  created_at: string
}

export interface Room {
  id: string
  number: string
  room_type_id: string
  room_type: RoomType
  status: string
  coord_x: number
  coord_y: number
  created_at: string
}

export interface CreateRoomTypePayload {
  name: string
  price_per_night: number
}

export interface UpdateRoomTypePayload {
  name: string
  price_per_night: number
}

export interface CreateRoomPayload {
  number: string
  room_type_id: string
}

export interface UpdateRoomPayload {
  number: string
  room_type_id: string
}

export interface UpdateRoomStatusPayload {
  status: 'AVAILABLE' | 'CLEANING' | 'MAINTENANCE'
}

export const ROOM_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'พร้อมใช้งาน',
  CLEANING: 'กำลังทำความสะอาด',
  MAINTENANCE: 'ปิดปรับปรุง',
}

export const ROOM_STATUS_VARIANT: Record<string, 'green' | 'blue' | 'gray'> = {
  ACTIVE: 'green',
  CLEANING: 'blue',
  MAINTENANCE: 'gray',
}
