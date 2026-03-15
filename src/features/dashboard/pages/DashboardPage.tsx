import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, TrendingUp, TrendingDown, BedDouble, AlertTriangle, ChevronRight, CalendarPlus } from 'lucide-react'
import { Skeleton } from '../../../shared/ui/skeleton'
import { Card, CardContent } from '../../../shared/ui/card'
import { useDashboard } from '../hooks/useDashboard'
import { KPICard } from '../components/KPICard'
import { MonthSelector } from '../components/MonthSelector'
import { TodayActionPanel } from '../components/TodayActionPanel'
import { OccupancySparkline } from '../components/OccupancySparkline'
import { RevenueTrendChart } from '../components/RevenueTrendChart'
import { DailyRevenueHeatmap } from '../components/DailyRevenueHeatmap'
import { PaymentMethodChart } from '../components/PaymentMethodChart'
import { OutstandingList } from '../components/OutstandingList'
import { OwnerInsights } from '../components/OwnerInsights'
import { OccupancyPressureChart } from '../components/OccupancyPressureChart'

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function thaiYear(yyyymm: string): string {
  const y = Number(yyyymm.split('-')[0])
  return String(y + 543)
}

/** Format number as compact — no decimals for KPI display */
function formatKPI(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

function KPICardSkeleton() {
  return (
    <Card>
      <CardContent className="px-4 py-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="w-9 h-9 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

function ActionPanelSkeleton() {
  return (
    <Card>
      <CardContent className="px-4 py-4 sm:px-5 sm:py-4">
        <Skeleton className="h-4 w-36 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

function ChartSkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="p-5">
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="w-full h-48" />
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const [month, setMonth] = useState(currentMonth)
  const { data, isLoading } = useDashboard(month)

  const year = thaiYear(month)
  const prevYear = String(Number(year) - 1)
  const isCurrentMonth = month === currentMonth()

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">ภาพรวมวันนี้</h1>
          <p className="text-xs text-muted-foreground mt-0.5">สรุปผลประกอบการโรงแรม</p>
        </div>
        <MonthSelector month={month} onChange={setMonth} />
      </div>

      {/* 1. Today's Action Panel — only for current month */}
      {isCurrentMonth && (
        <div className="mb-4">
          {isLoading ? (
            <ActionPanelSkeleton />
          ) : data ? (
            <TodayActionPanel data={data.today_actions} />
          ) : null}
        </div>
      )}

      {/* 2. KPI Row (4 cards + booking pace integrated) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
        {isLoading ? (
          <>
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
          </>
        ) : data ? (
          <>
            {/* Cash collected today */}
            <Card>
              <CardContent className="px-4 py-4 sm:px-5 sm:py-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground font-medium">เงินสดเข้าวันนี้</p>
                    <p className={`mt-1.5 text-xl sm:text-2xl font-semibold tabular-nums tracking-tight leading-none ${
                      data.kpi.revenue_today > 0 ? 'text-foreground' : 'text-muted-foreground/50'
                    }`}>
                      {data.kpi.revenue_today > 0 ? `${formatKPI(data.kpi.revenue_today)} ฿` : '0 ฿'}
                    </p>
                    <div className="mt-2 space-y-1">
                      {data.kpi.revenue_today_change !== undefined && isFinite(data.kpi.revenue_today_change) && data.kpi.revenue_today_change !== -1 && data.kpi.revenue_today_change !== 0 && (
                        <p className="text-xs text-muted-foreground">
                          <span className={`font-medium ${data.kpi.revenue_today_change > 0 ? 'text-success' : 'text-destructive'}`}>
                            {data.kpi.revenue_today_change > 0 ? '+' : ''}{(data.kpi.revenue_today_change * 100).toFixed(0)}%
                          </span>
                          {' '}จากเมื่อวาน
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        มูลค่าเข้าพักคืนนี้ <span className="font-medium text-foreground tabular-nums">{formatKPI(data.kpi.earned_revenue_today)} ฿</span>
                      </p>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-success-muted text-success-muted-foreground">
                    <Banknote className="w-4 h-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Revenue MTD */}
            <KPICard
              title="รายได้เดือนนี้"
              value={`${formatKPI(data.kpi.revenue_mtd)} ฿`}
              change={data.kpi.revenue_mtd_change}
              changeLabel="เทียบช่วงเดียวกันเดือนก่อน"
              icon={TrendingUp}
              iconClassName="bg-accent text-accent-foreground"
            />
            {/* Occupancy with sparkline */}
            <Card>
              <CardContent className="px-4 py-4 sm:px-5 sm:py-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground font-medium">เข้าพักวันนี้</p>
                    <p className="mt-1.5 text-xl sm:text-2xl font-semibold tabular-nums tracking-tight text-foreground leading-none">
                      {data.kpi.occupied_rooms}/{data.kpi.total_rooms} ห้อง
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={`text-xs font-semibold tabular-nums ${
                        data.kpi.occupancy_rate >= 0.8 ? 'text-success' :
                        data.kpi.occupancy_rate <= 0.3 ? 'text-destructive' :
                        'text-info'
                      }`}>
                        {(data.kpi.occupancy_rate * 100).toFixed(0)}%
                      </span>
                      {data.occupancy_trend && data.occupancy_trend.length > 0 && (
                        <OccupancySparkline data={data.occupancy_trend} totalRooms={data.kpi.total_rooms} />
                      )}
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-info-muted text-info-muted-foreground">
                    <BedDouble className="w-4 h-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Outstanding / Booking Pace */}
            {data.kpi.outstanding_count > 0 ? (
              <Link to="/bookings?view=outstanding" className="block">
                <Card className="h-full cursor-pointer hover:border-warning/50 transition-colors">
                  <CardContent className="px-4 py-4 sm:px-5 sm:py-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground font-medium">ยอดค้างชำระ</p>
                        <p className="mt-1.5 text-xl sm:text-2xl font-semibold tabular-nums tracking-tight text-warning leading-none">
                          {formatKPI(data.kpi.outstanding_balance)} ฿
                        </p>
                        <div className="mt-2 flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">{data.kpi.outstanding_count} รายการ</span>
                          <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-warning-muted text-warning-muted-foreground">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ) : (
              <Card>
                <CardContent className="px-4 py-4 sm:px-5 sm:py-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground font-medium">Booking Pace</p>
                      {data.kpi.booking_pace_week > 0 ? (
                        <>
                          <p className="mt-1.5 text-xl sm:text-2xl font-semibold tabular-nums tracking-tight text-foreground leading-none">
                            {data.kpi.booking_pace_week} <span className="text-sm font-normal text-muted-foreground">รายการ</span>
                          </p>
                          <div className="mt-2">
                            {data.kpi.booking_pace_prev > 0 ? (() => {
                              const diff = data.kpi.booking_pace_week - data.kpi.booking_pace_prev
                              const pct = Math.round((diff / data.kpi.booking_pace_prev) * 100)
                              return (
                                <div className="flex items-center gap-1.5">
                                  <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-md ${
                                    diff > 0 ? 'text-success bg-success/10' :
                                    diff < 0 ? 'text-destructive bg-destructive/10' :
                                    'text-muted-foreground bg-muted'
                                  }`}>
                                    {diff > 0 ? <TrendingUp className="w-3 h-3" /> :
                                     diff < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                                    {diff > 0 ? '+' : ''}{pct}%
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">vs สัปดาห์ก่อน</span>
                                </div>
                              )
                            })() : (
                              <p className="text-xs text-muted-foreground">จอง 7 วันล่าสุด</p>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="mt-1.5 text-xl sm:text-2xl font-semibold tabular-nums tracking-tight text-muted-foreground/50 leading-none">
                            -
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">ไม่มียอดค้าง</p>
                        </>
                      )}
                    </div>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-accent text-accent-foreground">
                      <CalendarPlus className="w-4 h-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </div>

      {/* 3. Occupancy Pressure */}
      <div className="mb-3 sm:mb-4">
        {isLoading ? (
          <ChartSkeleton />
        ) : data?.occupancy_pressure && data.occupancy_pressure.length > 0 ? (
          <OccupancyPressureChart data={data.occupancy_pressure} />
        ) : null}
      </div>

      {/* 4. Owner Insights (moved up) */}
      {!isLoading && data && data.insights && data.insights.length > 0 && (
        <div className="mb-3 sm:mb-4">
          <OwnerInsights data={data.insights} />
        </div>
      )}

      {/* 5. Heatmap + Payment + Outstanding (3 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div>
          {isLoading ? (
            <ChartSkeleton />
          ) : data ? (
            <DailyRevenueHeatmap data={data.daily_revenue} month={month} />
          ) : null}
        </div>
        <div>
          {isLoading ? (
            <ChartSkeleton />
          ) : data ? (
            <PaymentMethodChart data={data.payment_method_breakdown} />
          ) : null}
        </div>
        <div>
          {isLoading ? (
            <ChartSkeleton />
          ) : data ? (
            <OutstandingList
              data={data.outstanding_bookings}
              total={data.kpi.outstanding_balance}
              count={data.kpi.outstanding_count}
            />
          ) : null}
        </div>
      </div>

      {/* 6. Monthly Revenue YoY */}
      <div className="mb-3 sm:mb-4">
        {isLoading ? (
          <ChartSkeleton />
        ) : data ? (
          <RevenueTrendChart
            data={data.monthly_revenue}
            yearLabel={year}
            prevYearLabel={prevYear}
          />
        ) : null}
      </div>
    </div>
  )
}
