import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Receipt, DollarSign, Users, CalendarDays, Plus } from 'lucide-react'
import { receiptsApi } from '../../receipts/api'
import { customersApi } from '../../customers/api'
import { formatTHB, formatThaiDate } from '../../../shared/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { BottomBar } from '../../../shared/ui/BottomBar'
import { Skeleton } from '../../../shared/ui/skeleton'

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
            <p className="text-helper font-medium truncate">{title}</p>
            <p className="mt-1 text-metric tracking-tight text-foreground truncate">{value}</p>
          </div>
          <div className={`w-10 h-10 radius-card flex items-center justify-center shrink-0 ml-3 ${iconClassName}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-28" />
          </div>
          <Skeleton className="w-10 h-10 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  )
}

function ReceiptRowSkeleton() {
  return (
    <div className="flex items-center justify-between px-5 md:px-6 py-4">
      <div className="space-y-2 flex-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-4 w-20" />
    </div>
  )
}

export default function Dashboard() {
  const { data: recentReceipts, isLoading: receiptsLoading } = useQuery({
    queryKey: ['receipts', { page: 1, limit: 5 }],
    queryFn: () => receiptsApi.list({ page: 1, limit: 5 }),
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  })

  const { data: allReceipts, isLoading: statsLoading } = useQuery({
    queryKey: ['receipts-stats'],
    queryFn: () => receiptsApi.list({ limit: 1000 }),
    staleTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
  })

  const { data: customers } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: () => customersApi.list({ limit: 1000 }),
    staleTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
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
    <>
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-28 md:pb-6">
      <div className="mb-6">
        <h1 className="text-section text-2xl">ภาพรวม</h1>
        <p className="text-helper mt-1">สรุปกิจกรรมใบเสร็จรับเงิน</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="ใบเสร็จทั้งหมด"
              value={allReceipts?.meta.total ?? '—'}
              icon={Receipt}
              iconClassName="bg-accent text-accent-foreground"
            />
            <StatCard
              title="รายรับรวม"
              value={formatTHB(totalRevenue)}
              icon={DollarSign}
              iconClassName="bg-success-muted text-success-muted-foreground"
            />
            <StatCard
              title="ลูกค้าทั้งหมด"
              value={customers?.meta.total ?? '—'}
              icon={Users}
              iconClassName="bg-info-muted text-info-muted-foreground"
            />
            <StatCard
              title="เดือนนี้"
              value={formatTHB(monthRevenue)}
              icon={CalendarDays}
              iconClassName="bg-warning-muted text-warning-muted-foreground"
            />
          </>
        )}
      </div>

      <Card className="shadow-card">
        <CardHeader className="px-5 md:px-6 py-4 border-b border-border flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-section">ใบเสร็จล่าสุด</CardTitle>
          <Link to="/receipts" className="text-helper text-primary hover:text-primary/80 font-medium transition-colors">
            ดูทั้งหมด →
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {receiptsLoading ? (
            <div className="divide-y divide-border/50">
              <ReceiptRowSkeleton />
              <ReceiptRowSkeleton />
              <ReceiptRowSkeleton />
              <ReceiptRowSkeleton />
              <ReceiptRowSkeleton />
            </div>
          ) : !recentReceipts || recentReceipts.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Receipt className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-body">ยังไม่มีใบเสร็จ</p>
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
                  className="flex items-center justify-between px-5 md:px-6 py-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-body font-semibold text-foreground">{receipt.invoice_number}</span>
                      <Badge variant="blue">{receipt.customer.name}</Badge>
                    </div>
                    <p className="text-helper mt-0.5">
                      ออกเมื่อ {formatThaiDate(receipt.issue_date)}
                    </p>
                  </div>
                  <span className="text-body font-semibold text-foreground shrink-0 ml-4">
                    {formatTHB(receipt.total)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    <BottomBar>
      <Button asChild className="w-full min-h-[48px] radius-card font-medium transition-transform duration-150 active:scale-[0.98]">
        <Link to="/receipts/new">
          <Plus className="w-4 h-4" />
          สร้างใบเสร็จ
        </Link>
      </Button>
    </BottomBar>
    </>
  )
}
