import type { Meta } from '@/shared/types/pagination'
import type { Customer } from '@/shared/types/customer'

// Canonical definition lives in @/shared/types/customer — re-export for feature-internal use
export type { Customer } from '@/shared/types/customer'

export interface CustomerListResponse {
  data: Customer[]
  meta: Meta
}

export interface CreateCustomerPayload {
  name: string
  tax_id: string
  address: string
  phone: string
}

export interface UpdateCustomerPayload extends CreateCustomerPayload {}
