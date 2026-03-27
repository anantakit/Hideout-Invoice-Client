import { pdf } from '@react-pdf/renderer'
import { apiClient } from '@/shared/api/client'
import type {
  Receipt,
  ReceiptListResponse,
  CreateReceiptPayload,
} from './types'
import type { ApiResponse } from '@/shared/types/api'
import { ReceiptPDF } from './components/ReceiptPDF'
import { createElement } from 'react'

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

  print: async (receipt: Receipt): Promise<void> => {
    const doc = createElement(ReceiptPDF, { receipt }) as Parameters<typeof pdf>[0]
    const blob = await pdf(doc).toBlob()
    const url = window.URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (win) {
      win.addEventListener('load', () => window.URL.revokeObjectURL(url))
    } else {
      setTimeout(() => window.URL.revokeObjectURL(url), 5000)
    }
  },

  download: async (receipt: Receipt): Promise<void> => {
    const doc = createElement(ReceiptPDF, { receipt }) as Parameters<typeof pdf>[0]
    const blob = await pdf(doc).toBlob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${receipt.invoice_number}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  },
}
