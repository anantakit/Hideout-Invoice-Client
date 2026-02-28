import type { Customer } from '../customers/types'
import type { Meta } from '../../shared/types/pagination'

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface Invoice {
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
  items: InvoiceItem[]
  created_at: string
  updated_at: string
}

export interface InvoiceListResponse {
  data: Invoice[]
  meta: Meta
}

export interface CreateInvoiceItemPayload {
  description: string
  quantity: number
  unit_price: number
}

export interface CreateInvoicePayload {
  customer_id: string
  issue_date: string
  notes: string
  items: CreateInvoiceItemPayload[]
  // Hotel-specific fields (all optional)
  check_in_date?: string
  check_out_date?: string
  nights?: number
  room_number?: string
  payment_method?: string
}
