import { useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/shared/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Badge, badgeVariants, type BadgeProps } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'
import { useMonthlyOccupancy, type OccupancyDay } from '../hooks/useMonthlyOccupancy'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dayVariant(remaining: number, capacity: number): BadgeProps['variant'] {
  if (capacity === 0) return 'gray'
  if (remaining === 0) return 'red'
  if (remaining <= 2) return 'amber'
  return 'green'
}

function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1),
  )
}

function prevMonth(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

function nextMonth(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
}

// ─── DayCell ──────────────────────────────────────────────────────────────────

function DayCell({
  day,
  capacity,
}: {
  day: OccupancyDay
  capacity: number
}) {
  const dayNum = new Date(day.date + 'T00:00:00').getDate()
  const variant = dayVariant(day.remaining, capacity)

  return (
    <div
      className={cn(
        badgeVariants({ variant }),
        'flex flex-col items-center justify-center rounded-lg min-w-[48px] flex-1 py-2 px-1 gap-0.5',
      )}
      title={`${day.date}: ${day.booked} booked, ${day.remaining} remaining`}
    >
      <span className="text-[10px] font-medium leading-none opacity-70 tabular-nums">
        {dayNum}
      </span>
      <span className="text-xs font-semibold leading-none tabular-nums">
        {day.booked}/{capacity}
      </span>
    </div>
  )
}

// ─── MonthSelector ────────────────────────────────────────────────────────────

function MonthSelector({
  year,
  month,
  onPrev,
  onNext,
}: {
  year: number
  month: number
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={onPrev} aria-label="Previous month">
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-body font-semibold min-w-[160px] text-center">
        {monthLabel(year, month)}
      </span>
      <Button variant="outline" size="icon" onClick={onNext} aria-label="Next month">
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  )
}

// ─── RoomTypeCard ─────────────────────────────────────────────────────────────

function RoomTypeCard({
  name,
  capacity,
  days,
}: {
  name: string
  capacity: number
  days: OccupancyDay[]
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-section">{name}</CardTitle>
          <Badge variant="gray">{capacity} ห้อง</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-1">
            {days.map((day) => (
              <DayCell key={day.date} day={day} capacity={capacity} />
            ))}
          </div>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
          <span className="flex items-center gap-1.5">
            <span className={cn(badgeVariants({ variant: 'green' }), 'rounded px-1.5 py-0.5 text-[10px]')}>
              ว่าง
            </span>
            <span className="text-helper">remaining &gt; 2</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn(badgeVariants({ variant: 'amber' }), 'rounded px-1.5 py-0.5 text-[10px]')}>
              ใกล้เต็ม
            </span>
            <span className="text-helper">remaining ≤ 2</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn(badgeVariants({ variant: 'red' }), 'rounded px-1.5 py-0.5 text-[10px]')}>
              เต็ม
            </span>
            <span className="text-helper">remaining = 0</span>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MonthlyOccupancyPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data, loading, error, refetch } = useMonthlyOccupancy(year, month)

  function handlePrev() {
    const p = prevMonth(year, month)
    setYear(p.year)
    setMonth(p.month)
  }

  function handleNext() {
    const n = nextMonth(year, month)
    setYear(n.year)
    setMonth(n.month)
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-section text-2xl">
          Monthly Occupancy
        </h1>
        <p className="text-helper">อัตราการเข้าพักรายเดือนตามประเภทห้อง</p>
      </div>

      <Separator />

      {/* Month selector */}
      <MonthSelector year={year} month={month} onPrev={handlePrev} onNext={handleNext} />

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              ลองใหม่
            </Button>
          </CardContent>
        </Card>
      ) : !data || data.room_types.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            ไม่พบข้อมูลประเภทห้อง
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.room_types.map((rt) => (
            <RoomTypeCard key={rt.id} name={rt.name} capacity={rt.capacity} days={rt.days} />
          ))}
        </div>
      )}
    </div>
  )
}
