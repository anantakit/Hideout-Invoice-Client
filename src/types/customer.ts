export interface Customer {
  id: string
  name: string
  tax_id: string
  address: string
  phone: string
  created_at: string
  updated_at: string
}

export interface CustomerListResponse {
  data: Customer[]
  total: number
}

export interface CreateCustomerPayload {
  name: string
  tax_id: string
  address: string
  phone: string
}

export interface UpdateCustomerPayload extends CreateCustomerPayload {}
