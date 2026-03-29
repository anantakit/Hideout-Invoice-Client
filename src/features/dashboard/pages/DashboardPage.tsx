import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router'
import { Banknote, TrendingUp, TrendingDown, BedDouble, AlertTriangle, ChevronRight, CalendarPlus } from 'lucide-react'
import { Card, CardContent } from '@/shared/ui/card'
import { formatKPI } from '@/shared/utils'
import { useDashboard } from '../hooks/useDashboard'
import { KPICard } from '../components/KPICard'
import { MonthSelector } from '../components/MonthSelector'
import { TodayActionPanel } from '../components/TodayActionPanel'
import { OccupancySparkline } from '../components/OccupancySparkline'
import { OutstandingList } from '../components/OutstandingList'
import { OwnerInsights } from '../components/OwnerInsights'
import { KPICardSkeleton, ActionPanelSkeleton, ChartSkeleton } from '../components/DashboardSkeletons'

const RevenueTrendChart = lazy(() => import('../components/RevenueTrendChart').then(m => ({ default: m.RevenueTrendChart })))
const DailyRevenueHeatmap = lazy(() => import('../components/DailyRevenueHeatmap').then(m => ({ default: m.DailyRevenueHeatmap })))
const PaymentMethodChart = lazy(() => import('../components/PaymentMethodChart').then(m => ({ default: m.PaymentMethodChart })))
const OccupancyPressureChart = lazy(() => import('../components/OccupancyPressureChart').then(m => ({ default: m.OccupancyPressureChart })))

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function thaiYear(yyyymm: string): string {
  return String(Number(yyyymm.split('-')[0]) + 543)
}

export default function Dashboard() {
  const [month, setMonth] = useState(currentMonth)
  const { data, isLoading } = useDashboard(month)

  const year = thaiYear(month)
  const prevYear = String(Number(year) - 1)
  const isCurrentMonth = month === currentMonth()

  return (
    <div className="px-4 py-5 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">ภาพรวมวันนี้</h1>
          <p className="text-xs text-muted-foreground mt-0.5">สรุปผลประกอบการโรงแรม</p>
        </div>
        <MonthSelector month={month} onChange={setMonth} />
      </div>

      {/* 1. Today's Action Panel */}
      {isCurrentMonth && (
        isLoading ? <ActionPanelSkeleton /> : data ? <TodayActionPanel data={data.today_actions} /> : null
      )}

      {/* 2. KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading ? (
          <>{Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}</>
        ) : data ? (
          <>
            {/* Cash today */}
            <Card>
              <CardContent className="px-4 py-3 sm:px-5 sm:py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-micro-sm sm:text-xs text-muted-foreground font-medium">เงินสดเข้าวันนี้</p>
                    <p className={`mt-1 text-lg sm:text-2xl font-semibold tabular-nums tracking-tight leading-none ${data.kpi.revenue_today > 0 ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                      {data.kpi.revenue_today > 0 ? `${formatKPI(data.kpi.revenue_today)} ฿` : '0 ฿'}
                    </p>
                    <div className="mt-1.5 space-y-0.5">
                      {data.kpi.revenue_today_change !== undefined && isFinite(data.kpi.revenue_today_change) && data.kpi.revenue_today_change !== -1 && data.kpi.revenue_today_change !== 0 && (
                        <p className="text-micro-sm text-muted-foreground">
                          <span className={`font-medium ${data.kpi.revenue_today_change > 0 ? 'text-success' : 'text-destructive'}`}>
                            {data.kpi.revenue_today_change > 0 ? '+' : ''}{(data.kpi.revenue_today_change * 100).toFixed(0)}%
                          </span>{' '}จากเมื่อวาน
                        </p>
                      )}
                      <p className="text-micro-sm text-muted-foreground">
                        มูลค่าเข้าพักคืนนี้ <span className="font-medium text-foreground tabular-nums">{formatKPI(data.kpi.earned_revenue_today)} ฿</span>
                      </p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-success-muted text-success-muted-foreground">
                    <Banknote className="w-4 h-4" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cash MTD */}
            <KPICard title="เงินสดเข้าเดือนนี้" value={`${formatKPI(data.kpi.revenue_mtd)} ฿`} change={data.kpi.revenue_mtd_change} changeLabel="เทียบช่วงเดียวกันเดือนก่อน" icon={TrendingUp} iconClassName="bg-accent text-accent-foreground" />

            {/* Occupancy + ADR/RevPAR */}
            <Card>
              <CardContent className="px-4 py-3 sm:px-5 sm:py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-micro-sm sm:text-xs text-muted-foreground font-medium">เข้าพักวันนี้</p>
                    <p className="mt-1 text-lg sm:text-2xl font-semibold tabular-nums tracking-tight text-foreground leading-none">
                      {data.kpi.occupied_rooms}/{data.kpi.total_rooms} <span className="text-sm font-normal text-muted-foreground">ห้อง</span>
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={`text-micro-sm sm:text-xs font-semibold tabular-nums ${data.kpi.occupancy_rate >= 0.8 ? 'text-success' : data.kpi.occupancy_rate <= 0.3 ? 'text-destructive' : 'text-info'}`}>
                        {(data.kpi.occupancy_rate * 100).toFixed(0)}%
                      </span>
                      {data.occupancy_trend && data.occupancy_trend.length > 0 && (
                        <OccupancySparkline data={data.occupancy_trend} totalRooms={data.kpi.total_rooms} />
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-micro-sm text-muted-foreground">
                      <span>ADR <span className="font-medium text-foreground tabular-nums">{formatKPI(data.kpi.adr)}</span></span>
                      <span className="text-border">|</span>
                      <span>RevPAR <span className="font-medium text-foreground tabular-nums">{formatKPI(data.kpi.revpar)}</span></span>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-info-muted text-info-muted-foreground">
                    <BedDouble className="w-4 h-4" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Outstanding / Booking Pace */}
            {data.kpi.outstanding_count > 0 ? (
              <Link to="/bookings?view=outstanding" className="block">
                <Card className="h-full cursor-pointer hover:border-warning/50 transition-colors duration-200">
                  <CardContent className="px-4 py-3 sm:px-5 sm:py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-micro-sm sm:text-xs text-muted-foreground font-medium">ยอดค้างชำระ</p>
                        <p className="mt-1 text-lg sm:text-2xl font-semibold tabular-nums tracking-tight text-warning leading-none">{formatKPI(data.kpi.outstanding_balance)} ฿</p>
                        <div className="mt-1.5 flex items-center gap-1">
                          <span className="text-micro-sm text-muted-foreground">{data.kpi.outstanding_count} รายการ</span>
                          <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-warning-muted text-warning-muted-foreground"><AlertTriangle className="w-4 h-4" /></div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ) : (
              <Card>
                <CardContent className="px-4 py-3 sm:px-5 sm:py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-micro-sm sm:text-xs text-muted-foreground font-medium">จองสัปดาห์นี้</p>
                      {data.kpi.booking_pace_week > 0 ? (
                        <>
                          <p className="mt-1 text-lg sm:text-2xl font-semibold tabular-nums tracking-tight text-foreground leading-none">
                            {data.kpi.booking_pace_week} <span className="text-sm font-normal text-muted-foreground">รายการ</span>
                          </p>
                          <div className="mt-1.5">
                            {data.kpi.booking_pace_prev > 0 ? (() => {
                              const diff = data.kpi.booking_pace_week - data.kpi.booking_pace_prev
                              const pct = Math.round((diff / data.kpi.booking_pace_prev) * 100)
                              return (
                                <div className="flex items-center gap-1.5">
                                  <span className={`inline-flex items-center gap-0.5 text-micro-sm font-medium px-1.5 py-0.5 rounded-md ${diff > 0 ? 'text-success bg-success/10' : diff < 0 ? 'text-destructive bg-destructive/10' : 'text-muted-foreground bg-muted'}`}>
                                    {diff > 0 ? <TrendingUp className="w-3 h-3" /> : diff < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                                    {diff > 0 ? '+' : ''}{pct}%
                                  </span>
                                  <span className="text-micro-sm text-muted-foreground">vs สัปดาห์ก่อน</span>
                                </div>
                              )
                            })() : <p className="text-micro-sm text-muted-foreground">7 วันล่าสุด</p>}
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="mt-1 text-lg sm:text-2xl font-semibold tabular-nums tracking-tight text-muted-foreground/40 leading-none">-</p>
                          <p className="mt-1.5 text-micro-sm text-muted-foreground">ไม่มียอดค้าง</p>
                        </>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-accent text-accent-foreground"><CalendarPlus className="w-4 h-4" /></div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </div>

      {/* 3. Occupancy Pressure */}
      {isLoading ? <ChartSkeleton /> : data?.occupancy_pressure && data.occupancy_pressure.length > 0 ? (
        <Suspense fallback={<ChartSkeleton />}><OccupancyPressureChart data={data.occupancy_pressure} /></Suspense>
      ) : null}

      {/* 4. Owner Insights */}
      {!isLoading && data?.insights && data.insights.length > 0 && <OwnerInsights data={data.insights} />}

      {/* 5. Cash Flow Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {isLoading ? <><ChartSkeleton /><ChartSkeleton /><ChartSkeleton /></> : data ? (
          <Suspense fallback={<><ChartSkeleton /><ChartSkeleton /><ChartSkeleton /></>}>
            <DailyRevenueHeatmap data={data.daily_revenue} month={month} />
            <PaymentMethodChart data={data.payment_method_breakdown} />
            <OutstandingList data={data.outstanding_bookings} total={data.kpi.outstanding_balance} count={data.kpi.outstanding_count} />
          </Suspense>
        ) : null}
      </div>

      {/* 6. Monthly Revenue YoY */}
      {isLoading ? <ChartSkeleton /> : data ? (
        <Suspense fallback={<ChartSkeleton />}>
          <RevenueTrendChart data={data.monthly_revenue} yearLabel={year} prevYearLabel={prevYear} />
        </Suspense>
      ) : null}
    </div>
  )
}
