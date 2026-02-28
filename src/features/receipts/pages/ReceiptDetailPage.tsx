import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { invoicesApi } from '../api'
import { formatTHB, formatThaiDate } from '../../../shared/utils'

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [downloading, setDownloading] = useState(false)

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.getById(id!),
    enabled: !!id,
  })

  const deleteMutation = useMutation({
    mutationFn: () => invoicesApi.delete(id!),
    onSuccess: () => {
      toast.success('ลบใบเสร็จสำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      navigate('/invoices')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleDownload = async () => {
    if (!invoice) return
    setDownloading(true)
    try {
      await invoicesApi.download(invoice.id, `${invoice.invoice_number}.pdf`)
    } catch {
      toast.error('ดาวน์โหลดไม่สำเร็จ')
    } finally {
      setDownloading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">ไม่พบใบเสร็จ</p>
        <Link to="/invoices" className="btn-secondary">กลับไปรายการใบเสร็จ</Link>
      </div>
    )
  }

  const hasHotelInfo =
    invoice.room_number || invoice.check_in_date || invoice.check_out_date ||
    (invoice.nights && invoice.nights > 0) || invoice.payment_method

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link to="/invoices" className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
          </div>
          <p className="text-gray-500 text-sm ml-8">
            สร้างเมื่อ {formatThaiDate(invoice.created_at)}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="btn-primary text-sm"
          >
            {downloading ? (
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            ดาวน์โหลด PDF
          </button>

          <button
            type="button"
            onClick={() => {
              if (confirm(`ลบใบเสร็จ ${invoice.invoice_number}? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
                deleteMutation.mutate()
              }
            }}
            disabled={deleteMutation.isPending}
            className="btn-danger text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            ลบ
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Meta */}
        <div className="card p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">เลขที่ใบเสร็จ</p>
            <p className="text-sm font-semibold text-gray-900">{invoice.invoice_number}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">วันที่ออกเอกสาร</p>
            <p className="text-sm text-gray-700">{formatThaiDate(invoice.issue_date)}</p>
          </div>
        </div>

        {/* Customer — no email per Thai receipt convention */}
        <div className="card p-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">ผู้ชำระเงิน</p>
          <p className="font-semibold text-gray-900 text-base">{invoice.customer.name}</p>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            {invoice.customer.address && <p>{invoice.customer.address}</p>}
            {invoice.customer.phone && <p>โทร: {invoice.customer.phone}</p>}
            {invoice.customer.tax_id && <p>เลขผู้เสียภาษี: {invoice.customer.tax_id}</p>}
          </div>
        </div>

        {/* Hotel Info */}
        {hasHotelInfo && (
          <div className="card p-6">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">รายละเอียดการเข้าพัก</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {invoice.room_number && (
                <div className="flex justify-between">
                  <span className="text-gray-500">เลขห้อง</span>
                  <span className="font-medium text-gray-900">{invoice.room_number}</span>
                </div>
              )}
              {invoice.check_in_date && (
                <div className="flex justify-between">
                  <span className="text-gray-500">วันที่เข้าพัก</span>
                  <span className="font-medium text-gray-900">{formatThaiDate(invoice.check_in_date)}</span>
                </div>
              )}
              {invoice.check_out_date && (
                <div className="flex justify-between">
                  <span className="text-gray-500">วันที่ออก</span>
                  <span className="font-medium text-gray-900">{formatThaiDate(invoice.check_out_date)}</span>
                </div>
              )}
              {invoice.nights && invoice.nights > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">จำนวนคืน</span>
                  <span className="font-medium text-gray-900">{invoice.nights} คืน</span>
                </div>
              )}
              {invoice.payment_method && (
                <div className="flex justify-between">
                  <span className="text-gray-500">วิธีชำระเงิน</span>
                  <span className="font-medium text-gray-900">{invoice.payment_method}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">รายการสินค้า</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">รายละเอียด</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">จำนวน</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">ราคาต่อหน่วย</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">รวมเงิน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 text-gray-700">{item.description}</td>
                  <td className="px-6 py-4 text-center text-gray-600">{item.quantity}</td>
                  <td className="px-6 py-4 text-right text-gray-600">{formatTHB(item.unit_price)}</td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">{formatTHB(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total only — no VAT */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <div className="max-w-xs ml-auto">
              <div className="flex justify-between">
                <span className="font-bold text-gray-900">ยอดชำระทั้งหมด</span>
                <span className="font-bold text-lg text-brand-700">{formatTHB(invoice.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="card p-6">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">หมายเหตุ</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
