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
  coord_x: number
  coord_y: number
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
  price_per_night: number
  charged_price_per_night?: number
  status: string
  transfer_from_stay_id?: string
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

export interface InvoiceResponseShort {
  id: string
  invoice_number: string
  booking_id?: string
  total: number
  issue_date: string
  created_at: string
}

export interface BookingEventResponse {
  id: string
  action: string
  actor: string
  detail: string
  metadata?: string
  created_at: string
}

export interface BookingResponse {
  id: string
  guest_name: string
  guest_phone: string
  customer_id?: string
  customer_name?: string
  source: string
  status: string
  total_amount: number
  discount_amount: number
  paid_amount: number
  balance_amount: number
  key_deposit_amount: number
  deposit_status: 'NONE' | 'PENDING' | 'COLLECTED'
  room_stays: RoomStayResponse[]
  payments: PaymentResponse[]
  invoices: InvoiceResponseShort[]
  events: BookingEventResponse[]
  created_at: string
}

// ─── Invoice Prefill ──────────────────────────────────────────────────────────

export interface InvoicePrefillItem {
  description: string
  quantity: number
  unit_price: number
  amount: number
  source_type?: string
  source_id?: string
}

export type PrefillMode = 'booking' | 'stay' | 'night'

export interface CoveredStay {
  stay_id: string
  date_from: string
  date_to: string
}

export interface CoverageNight {
  date: string
  rate: number
  invoiced: boolean
  invoice_number?: string
  invoice_id?: string
}

export interface CoverageStay {
  stay_id: string
  room_number: string
  room_type: string
  nights: CoverageNight[]
}

export interface InvoiceCoverageResponse {
  booking_id: string
  stays: CoverageStay[]
}

export interface InvoicePrefillResponse {
  booking_id: string
  mode: PrefillMode
  guest_name: string
  guest_phone: string
  customer_id?: string
  check_in_date: string
  check_out_date: string
  nights: number
  room_numbers: string
  payment_method: string
  total_amount: number
  paid_amount: number
  balance_amount: number
  items: InvoicePrefillItem[]
  covered_stays?: CoveredStay[]
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
  /** Optional physical room selected by the user; null when unassigned. */
  room_id: string | null
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
  /** Pre-defined view filter: arrivals_today, departures_today, outstanding */
  view?: string
}

// ─── API request payload ───────────────────────────────────────────────────────

export interface CreateBookingPaymentPayload {
  amount: number
  method: 'CASH' | 'TRANSFER'
}

/** One stay slot in a CreateBookingPayload.  room_id is optional — omit or
 *  set to null to create an unassigned (RESERVED) stay. */
export interface RoomStayPayload {
  room_type_id: string
  room_id?: string | null
  check_in: string   // YYYY-MM-DD
  check_out: string  // YYYY-MM-DD
  charged_price?: number
}

export interface CreateBookingPayload {
  source: 'walk_in' | 'advance'
  guest_name: string
  guest_phone: string
  customer_id?: string
  key_deposit_amount?: number
  deposit_status?: string
  stays: RoomStayPayload[]
  payment?: CreateBookingPaymentPayload
}

export interface AddStaysPayload {
  stays: RoomStayPayload[]
}

export interface CreatePaymentPayload {
  amount: number
  method: 'CASH' | 'TRANSFER'
  note?: string
  type?: 'PAYMENT' | 'REFUND'
  idempotency_key: string
}

export interface ExtendStayPayload {
  new_check_out: string // YYYY-MM-DD
  transfer_room_id?: string // optional: room for overflow period when conflict
}

export interface ExtendStayConflictData {
  available_until: string // YYYY-MM-DD — how far current room is available
  room_types: AvailabilityGroupedRoomType[] // available rooms for overflow period
}

export interface MoveStayPayload {
  room_id: string
  check_in: string   // YYYY-MM-DD
  check_out: string  // YYYY-MM-DD
}

export interface EarlyCheckoutPayload {
  checkout_date?: string // YYYY-MM-DD — defaults to today on backend
}

// ─── Timeline API ───────────────────────────────────────────────────────────

/** Booking entry as returned by GET /timeline. */
export interface TimelineBooking {
  room_stay_id: string
  booking_id: string
  guest_name: string
  guest_phone?: string
  /** YYYY-MM-DD inclusive */
  check_in: string
  /** YYYY-MM-DD exclusive */
  check_out: string
  status: string
  balance_amount: number
  key_deposit_amount: number
  deposit_status: string
  /** Booking source: walk_in | advance */
  source: string
  /** Set when this stay was created by a room transfer (split stay). */
  transfer_from_stay_id?: string
  /** True when this stay was ended via early checkout. */
  early_checkout?: boolean
  /** ISO timestamp of actual checkout (set when guest checks out). */
  checked_out_at?: string
  /** ISO timestamp of stay creation — used for stable layer ordering. */
  created_at?: string
}

/**
 * Room entry as returned by GET /timeline.
 *
 * `status` reflects the physical room state (ACTIVE | CLEANING | MAINTENANCE).
 * The derived display state (AVAILABLE | OCCUPIED | CLEANING | MAINTENANCE)
 * is computed in the component layer based on status + bookings presence.
 */
export interface TimelineRoom {
  id: string
  room_number: string
  status: 'ACTIVE' | 'CLEANING' | 'MAINTENANCE'
  bookings: TimelineBooking[]
}

export interface UnassignedStay {
  booking_id: string
  guest_name: string
  room_type_id: string
  room_type_name: string
  check_in: string
  check_out: string
  status: string
  key_deposit_amount: number
  deposit_status: string
  balance_amount: number
}

export interface TimelineResponse {
  rooms: TimelineRoom[]
  unassigned_stays: UnassignedStay[]
}

// ─── Auto Assign ─────────────────────────────────────────────────────────────

export interface AutoAssignAssignment {
  room_stay_id: string
  booking_id: string
  guest_name: string
  room_id: string
  room_number: string
  room_type_name: string
}

export interface AutoAssignSkipped {
  booking_id: string
  guest_name: string
  room_type_name: string
  check_in: string
  check_out: string
  reason: string
}

export interface AutoAssignResponse {
  assigned_count: number
  skipped_count: number
  assignments: AutoAssignAssignment[]
  skipped: AutoAssignSkipped[]
}

// ─── Availability Grouped ─────────────────────────────────────────────────────

export interface AvailabilityGroupedRoom {
  room_id: string
  room_number: string
  available: boolean
  coord_x: number
  coord_y: number
}

export interface AvailabilityGroupedRoomType {
  room_type_id: string
  room_type_name: string
  price_per_night: number
  unassigned_count: number
  rooms: AvailabilityGroupedRoom[]
}

export interface AvailabilityGroupedResponse {
  check_in: string
  check_out: string
  room_types: AvailabilityGroupedRoomType[]
}

// ─── Status display labels (Thai) ───────────────────────────────────────────

/** User-friendly Thai labels for booking / room-stay statuses. */
export const STATUS_LABEL_TH: Record<string, string> = {
  CONFIRMED:            'จองแล้ว',
  RESERVED:             'รอเข้าพัก',
  ASSIGNED:             'มอบหมายห้อง',
  PARTIALLY_CHECKED_IN: 'เช็คอินบางส่วน',
  CHECKED_IN:           'เข้าพัก',
  CHECKED_OUT:          'เช็คเอาท์',
  CANCELLED:            'ยกเลิก',
}

/** Returns Thai label for a status, falling back to the raw value. */
export function getStatusLabel(status: string): string {
  return STATUS_LABEL_TH[status] ?? status
}
