import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDebounce } from '../lib/hooks'
import toast from 'react-hot-toast'
import { customersApi } from '../api/customers'
import CustomerModal from '../components/CustomerModal'
import type { Customer } from '../types/customer'
import { formatThaiDate } from '../lib/utils'

export default function Customers() {
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = useState('')
  const search = useDebounce(searchInput, 300)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', { search, limit: 1000 }],
    queryFn: () => customersApi.list({ search: search || undefined, limit: 1000 }),
  })

  const deleteMutation = useMutation({
    mutationFn: customersApi.delete,
    onSuccess: () => {
      toast.success('ลบลูกค้าสำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`ลบลูกค้า "${name}"? ใบเสร็จที่เชื่อมกับลูกค้านี้จะไม่ถูกลบ`)) return
    deleteMutation.mutate(id)
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditingCustomer(null)
  }

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['customers'] })
    handleClose()
  }

  return (
    <>
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">รายการลูกค้า</h1>
            <p className="text-gray-500 text-sm mt-1">
              {data ? `ลูกค้าทั้งหมด ${data.total} ราย` : 'กำลังโหลด…'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setEditingCustomer(null); setModalOpen(true) }}
            className="btn-primary hidden sm:inline-flex"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            เพิ่มลูกค้าใหม่
          </button>
        </div>

        {/* Search */}
        <div className="card p-4 mb-6 shadow-sm">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="ค้นหาชื่อ เบอร์โทร หรือเลขผู้เสียภาษี…"
              className="input pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="card overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            </div>
          ) : !data || data.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm">
                {searchInput ? 'ไม่พบลูกค้าที่ตรงกับการค้นหา' : 'ยังไม่มีลูกค้า'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">ชื่อ</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">เบอร์โทรศัพท์</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">เลขผู้เสียภาษี</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">วันที่เพิ่ม</th>
                  <th className="px-4 sm:px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.data.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 sm:px-6 py-4">
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      {customer.phone && <p className="text-xs text-gray-500 mt-0.5 sm:hidden">{customer.phone}</p>}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-gray-500 hidden sm:table-cell">{customer.phone || '—'}</td>
                    <td className="px-4 sm:px-6 py-4 text-gray-500 hidden md:table-cell">{customer.tax_id || '—'}</td>
                    <td className="px-4 sm:px-6 py-4 text-gray-500 hidden lg:table-cell">{formatThaiDate(customer.created_at)}</td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(customer)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                          title="แก้ไข"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(customer.id, customer.name)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          title="ลบ"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Mobile FAB */}
      <button
        type="button"
        onClick={() => { setEditingCustomer(null); setModalOpen(true) }}
        className="sm:hidden fixed bottom-6 right-6 z-30 w-14 h-14 bg-brand-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-brand-700 active:bg-brand-900 transition-colors"
        aria-label="เพิ่มลูกค้าใหม่"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <CustomerModal
        open={modalOpen}
        onClose={handleClose}
        onCreated={handleSaved}
        customer={editingCustomer ?? undefined}
      />
    </>
  )
}
