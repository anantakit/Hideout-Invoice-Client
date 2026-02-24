import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { invoicesApi } from '../api/invoices'
import { customersApi } from '../api/customers'
import { formatTHB, formatThaiDate } from '../lib/utils'

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm text-gray-500 font-medium truncate">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 truncate">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ml-3 ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data: recentInvoices } = useQuery({
    queryKey: ['invoices', { page: 1, limit: 5 }],
    queryFn: () => invoicesApi.list({ page: 1, limit: 5 }),
  })

  const { data: allInvoices } = useQuery({
    queryKey: ['invoices-stats'],
    queryFn: () => invoicesApi.list({ limit: 1000 }),
  })

  const { data: customers } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: () => customersApi.list({ limit: 1000 }),
  })

  const invoiceList = allInvoices?.data ?? []
  const totalRevenue = invoiceList.reduce((sum, inv) => sum + inv.total, 0)
  const now = new Date()
  const monthRevenue = invoiceList
    .filter((inv) => {
      const d = new Date(inv.created_at)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((s, inv) => s + inv.total, 0)

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">ภาพรวม</h1>
        <p className="text-gray-500 text-sm mt-1">สรุปกิจกรรมใบเสร็จรับเงิน</p>
      </div>

      {/* Stats grid — 1 col mobile, 2 col tablet, 4 col desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="ใบเสร็จทั้งหมด"
          value={allInvoices?.pagination.total ?? '—'}
          icon={
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          color="bg-blue-50"
        />
        <StatCard
          title="รายรับรวม"
          value={formatTHB(totalRevenue)}
          icon={
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="bg-green-50"
        />
        <StatCard
          title="ลูกค้าทั้งหมด"
          value={customers?.total ?? '—'}
          icon={
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          color="bg-purple-50"
        />
        <StatCard
          title="เดือนนี้"
          value={formatTHB(monthRevenue)}
          icon={
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          color="bg-orange-50"
        />
      </div>

      {/* Recent receipts */}
      <div className="card shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">ใบเสร็จล่าสุด</h2>
          <Link to="/invoices" className="text-xs text-brand-600 hover:text-brand-700 font-medium">
            ดูทั้งหมด →
          </Link>
        </div>

        {!recentInvoices || recentInvoices.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">ยังไม่มีใบเสร็จ</p>
            <Link to="/invoices/new" className="btn-primary mt-4 text-xs">
              สร้างใบเสร็จแรก
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentInvoices.data.map((inv) => (
              <Link
                key={inv.id}
                to={`/invoices/${inv.id}`}
                className="flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{inv.invoice_number}</span>
                    <span className="badge-blue">{inv.customer.name}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    ออกเมื่อ {formatThaiDate(inv.issue_date)}
                  </p>
                </div>
                <span className="text-sm font-bold text-gray-900 shrink-0 ml-4">
                  {formatTHB(inv.total)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
