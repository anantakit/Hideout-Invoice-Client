import type { Customer } from '../customers/types'
import type { Meta } from '../../shared/types/pagination'

export interface ReceiptItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface Receipt {
  id: string
  invoice_number: string
  customer: Customer
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

export interface CreateReceiptPayload {
  customer_id: string
  issue_date: string
  notes: string
  items: CreateReceiptItemPayload[]
  // Hotel-specific fields (all optional)
  check_in_date?: string
  check_out_date?: string
  nights?: number
  room_number?: string
  payment_method?: string
}
