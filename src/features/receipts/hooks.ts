import { useQuery } from '@tanstack/react-query'
import { invoicesApi } from './api'
import type { InvoiceQueryParams } from './api'

export function useInvoices(params?: InvoiceQueryParams) {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn: () => invoicesApi.list(params),
    placeholderData: (prev) => prev,
  })
}
