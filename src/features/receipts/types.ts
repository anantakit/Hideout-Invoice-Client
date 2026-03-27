import type { Customer } from '@/shared/types/customer'
import type { Meta } from '@/shared/types/pagination'

export interface ReceiptItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface CoveredStay {
  stay_id: string
  date_from: string
  date_to: string
}

export interface CompanyInfo {
  name: string
  address: string
  phone: string
  tax_id: string
}

export interface Receipt {
  id: string
  invoice_number: string
  booking_id?: string
  customer: Customer
  company: CompanyInfo
  issue_date: string
  total: number
  notes: string
  // Hotel-specific fields (optional)
  check_in_date?: string
  check_out_date?: string
  nights?: number
  room_number?: string
  payment_method?: string
  items: ReceiptItem[]
  covered_stays?: CoveredStay[]
  created_by?: string
  creator_name?: string
  created_at: string
  updated_at: string
}

export interface ReceiptListResponse {
  data: Receipt[]
  meta: Meta
}

export interface CreateReceiptItemPayload {
  description: string
  quantity: number
  unit_price: number
}

export interface CoveredStayPayload {
  stay_id: string
  date_from: string
  date_to: string
}

export interface CreateReceiptPayload {
  customer_id: string
  booking_id?: string
  issue_date: string
  notes: string
  items: CreateReceiptItemPayload[]
  // Hotel-specific fields (all optional)
  check_in_date?: string
  check_out_date?: string
  nights?: number
  room_number?: string
  payment_method?: string
  covered_stays?: CoveredStayPayload[]
}
