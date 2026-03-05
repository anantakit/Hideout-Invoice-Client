import { Link } from 'react-router-dom'
import { Loader2, LogIn } from 'lucide-react'
import { Card, CardContent } from '@/shared/ui/card'
import { Badge, type BadgeProps } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'
import { useTodayOperations } from '../hooks/useTodayOperations'
import { ROUTES } from '@/app/routes'

// ─── StatCard ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string
  value: number | string
  badgeLabel: string
  badgeVariant: BadgeProps['variant']
}

function StatCard({ title, value, badgeLabel, badgeVariant }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="text-sm font-medium text-muted-foreground leading-snug">{title}</p>
          <Badge variant={badgeVariant} className="shrink-0">
            {badgeLabel}
          </Badge>
        </div>
        <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
      </CardContent>
    </Card>
  )
}

// ─── QuickWalkInButton ────────────────────────────────────────────────────────

function QuickWalkInButton() {
  return (
    <div className="flex flex-col sm:flex-row gap-3 pt-2">
      <Button asChild size="lg" className="w-full sm:w-auto">
        <Link to={ROUTES.bookings.new}>
          <LogIn className="w-4 h-4" />
          Walk-in Check-in
        </Link>
      </Button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TodayBoardPage() {
  const { data, loading, error, refetch } = useTodayOperations()

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-4">
        <PageHeader />
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              ลองใหม่
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats: StatCardProps[] = [
    {
      title: 'Total Rooms',
      value: data?.total_rooms ?? '—',
      badgeLabel: 'ทั้งหมด',
      badgeVariant: 'gray',
    },
    {
      title: 'Occupied',
      value: data?.occupied ?? '—',
      badgeLabel: 'เข้าพักอยู่',
      badgeVariant: 'red',
    },
    {
      title: 'Available',
      value: data?.available ?? '—',
      badgeLabel: 'ว่าง',
      badgeVariant: 'green',
    },
    {
      title: 'Arrivals Today',
      value: data?.arrivals_today ?? '—',
      badgeLabel: 'เช็คอิน',
      badgeVariant: 'default',
    },
    {
      title: 'Departures Today',
      value: data?.departures_today ?? '—',
      badgeLabel: 'เช็คเอาท์',
      badgeVariant: 'amber',
    },
  ]

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 pb-10">
      <PageHeader date={data?.date} />

      <Separator />

      {/* Summary card grid — 2-col mobile, 4-col desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <QuickWalkInButton />
    </div>
  )
}

// ─── PageHeader ───────────────────────────────────────────────────────────────

function PageHeader({ date }: { date?: string }) {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Today Operations
      </h1>
      {date && (
        <p className="text-sm text-muted-foreground">{date}</p>
      )}
    </div>
  )
}
