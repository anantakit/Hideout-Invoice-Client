import { apiClient } from '../../shared/api/client'
import type {
  Invoice,
  InvoiceListResponse,
  CreateInvoicePayload,
} from './types'
import type { ApiResponse } from '../../shared/types/api'

export interface InvoiceQueryParams {
  search?: string
  start_date?: string
  end_date?: string
  page?: number
  limit?: number
}

export const invoicesApi = {
  list: async (params?: InvoiceQueryParams): Promise<InvoiceListResponse> => {
    const { data } = await apiClient.get<ApiResponse<InvoiceListResponse>>(
      '/invoices',
      { params }
    )
    return data.data
  },

  getById: async (id: string): Promise<Invoice> => {
    const { data } = await apiClient.get<ApiResponse<Invoice>>(
      `/invoices/${id}`
    )
    return data.data
  },

  create: async (payload: CreateInvoicePayload): Promise<Invoice> => {
    const { data } = await apiClient.post<ApiResponse<Invoice>>(
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
