import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Receipt, DollarSign, Users, CalendarDays } from 'lucide-react'
import { receiptsApi } from '../../receipts/api'
import { customersApi } from '../../customers/api'
import { formatTHB, formatThaiDate } from '../../../shared/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'

function StatCard({
  title,
  value,
  icon: Icon,
  iconClassName,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  iconClassName?: string
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground font-medium truncate">{title}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground truncate">{value}</p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ml-3 ${iconClassName}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { data: recentReceipts } = useQuery({
    queryKey: ['receipts', { page: 1, limit: 5 }],
    queryFn: () => receiptsApi.list({ page: 1, limit: 5 }),
  })

  const { data: allReceipts } = useQuery({
    queryKey: ['receipts-stats'],
    queryFn: () => receiptsApi.list({ limit: 1000 }),
  })

  const { data: customers } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: () => customersApi.list({ limit: 1000 }),
  })

  const receiptList = allReceipts?.data ?? []
  const totalRevenue = receiptList.reduce((sum, r) => sum + r.total, 0)
  const now = new Date()
  const monthRevenue = receiptList
    .filter((r) => {
      const d = new Date(r.created_at)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((s, r) => s + r.total, 0)

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">ภาพรวม</h1>
        <p className="text-muted-foreground text-sm mt-1">สรุปกิจกรรมใบเสร็จรับเงิน</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="ใบเสร็จทั้งหมด"
          value={allReceipts?.meta.total ?? '—'}
          icon={Receipt}
          iconClassName="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="รายรับรวม"
          value={formatTHB(totalRevenue)}
          icon={DollarSign}
          iconClassName="bg-green-50 text-green-600"
        />
        <StatCard
          title="ลูกค้าทั้งหมด"
          value={customers?.meta.total ?? '—'}
          icon={Users}
          iconClassName="bg-purple-50 text-purple-600"
        />
        <StatCard
          title="เดือนนี้"
          value={formatTHB(monthRevenue)}
          icon={CalendarDays}
          iconClassName="bg-orange-50 text-orange-600"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-border">
          <CardTitle className="text-sm font-semibold">ใบเสร็จล่าสุด</CardTitle>
          <Link to="/receipts" className="text-xs text-primary hover:text-primary/80 font-medium">
            ดูทั้งหมด →
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {!recentReceipts || recentReceipts.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Receipt className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">ยังไม่มีใบเสร็จ</p>
              <Button asChild className="mt-4" size="sm">
                <Link to="/receipts/new">สร้างใบเสร็จแรก</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {recentReceipts.data.map((receipt) => (
                <Link
                  key={receipt.id}
                  to={`/receipts/${receipt.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{receipt.invoice_number}</span>
                      <Badge variant="blue">{receipt.customer.name}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ออกเมื่อ {formatThaiDate(receipt.issue_date)}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-foreground shrink-0 ml-4">
                    {formatTHB(receipt.total)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
