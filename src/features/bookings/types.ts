// ─── API response shapes ───────────────────────────────────────────────────────

export interface RoomTypeResponse {
  id: string
  name: string
  price_per_night?: number
  created_at: string
}

export interface RoomResponse {
  id: string
  number: string
  room_type_id: string
  room_type: RoomTypeResponse
  status: string
  created_at: string
}

export interface RoomStayResponse {
  id: string
  booking_id: string
  room_type_id: string
  room_type_name: string
  room_id?: string
  room_number?: string
  check_in: string
  check_out: string
  nights: number
  status: string
  assigned_at?: string
  checked_in_at?: string
  checked_out_at?: string
  created_at: string
}

export interface PaymentResponse {
  id: string
  booking_id: string
  amount: number
  method: 'CASH' | 'TRANSFER'
  note?: string
  created_at: string
  created_by: string
}

export interface BookingResponse {
  id: string
  guest_name: string
  guest_phone: string
  status: string
  total_amount: number
  discount_amount: number
  paid_amount: number
  balance_amount: number
  room_stays: RoomStayResponse[]
  payments: PaymentResponse[]
  created_at: string
}

export interface AvailabilityResponse {
  room_type_id: string
  check_in: string
  check_out: string
  total_rooms: number
  reserved: number
  available: number
}

export interface RoomAvailabilityResponse {
  room_id: string
  check_in: string
  check_out: string
  available: boolean
}

// ─── Form state ────────────────────────────────────────────────────────────────

export interface StayFormItem {
  room_type_id: string
  check_in: string  // YYYY-MM-DD
  check_out: string // YYYY-MM-DD — nights are derived, never stored
}

export interface BookingFormValues {
  guest_name: string
  guest_phone: string
  stays: StayFormItem[]
}

export interface BookingListResponse {
  data: BookingResponse[]
  meta: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

export interface BookingQueryParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  /** YYYY-MM-DD — filter by stay overlap; both required or neither sent */
  start_date?: string
  end_date?: string
}

// ─── API request payload (transformed from form before sending) ───────────────

export interface RoomRequestItem {
  room_type_id: string
  quantity: number
  check_in: string  // RFC3339 e.g. "2026-03-01T00:00:00Z"
  check_out: string // RFC3339
}

export interface CreateBookingPayload {
  guest_name: string
  guest_phone: string
  room_requests: RoomRequestItem[]
}

export interface CreatePaymentPayload {
  amount: number
  method: 'CASH' | 'TRANSFER'
  note?: string
}

export interface ExtendStayPayload {
  new_check_out: string // YYYY-MM-DD
}
