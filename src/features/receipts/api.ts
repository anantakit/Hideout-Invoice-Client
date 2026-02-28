import { apiClient } from '../../shared/api/client'
import type {
  Receipt,
  ReceiptListResponse,
  CreateReceiptPayload,
} from './types'
import type { ApiResponse } from '../../shared/types/api'

export interface ReceiptQueryParams {
  search?: string
  start_date?: string
  end_date?: string
  page?: number
  limit?: number
}

export const receiptsApi = {
  list: async (params?: ReceiptQueryParams): Promise<ReceiptListResponse> => {
    const { data } = await apiClient.get<ApiResponse<ReceiptListResponse>>(
      '/invoices',
      { params }
    )
    return data.data
  },

  getById: async (id: string): Promise<Receipt> => {
    const { data } = await apiClient.get<ApiResponse<Receipt>>(
      `/invoices/${id}`
    )
    return data.data
  },

  create: async (payload: CreateReceiptPayload): Promise<Receipt> => {
    const { data } = await apiClient.post<ApiResponse<Receipt>>(
      '/invoices',
      payload
    )
    return data.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/invoices/${id}`)
  },

  download: async (id: string, filename?: string): Promise<void> => {
    const res = await apiClient.get(`/invoices/${id}/pdf`, {
      responseType: 'blob',
    })
    const blob = new Blob([res.data as BlobPart], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename ?? `receipt-${id}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },
}
