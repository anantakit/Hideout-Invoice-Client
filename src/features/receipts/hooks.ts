import { useQuery } from '@tanstack/react-query'
import { receiptsApi } from './api'
import type { ReceiptQueryParams } from './api'

export function useReceipts(params?: ReceiptQueryParams) {
  return useQuery({
    queryKey: ['receipts', params],
    queryFn: () => receiptsApi.list(params),
    placeholderData: (prev) => prev,
  })
}
