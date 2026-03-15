import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card'
import type { DailyRevenueEntry } from '../types'

interface Props {
  data: DailyRevenueEntry[]
  /** YYYY-MM string for building the calendar grid */
  month: string
}

const DAY_HEADERS = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.']

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toFixed(0)
}

/** 5-level intensity: 0 = no revenue, 1-4 = quartile-based */
function getIntensityClass(amount: number, max: number): string {
  if (amount <= 0) return 'bg-muted/50'
  const ratio = amount / max
  if (ratio <= 0.25) return 'bg-primary/20'
  if (ratio <= 0.5) return 'bg-primary/40'
  if (ratio <= 0.75) return 'bg-primary/65'
  return 'bg-primary'
}

function isToday(year: number, monthIdx: number, day: number): boolean {
  const now = new Date()
  return now.getFullYear() === year && now.getMonth() === monthIdx && now.getDate() === day
}

function isFuture(year: number, monthIdx: number, day: number): boolean {
  const now = new Date()
  const d = new Date(year, monthIdx, day)
  return d > new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function DailyRevenueHeatmap({ data, month }: Props) {
  const [yearStr, monthStr] = month.split('-')
  const year = Number(yearStr)
  const monthIdx = Number(monthStr) - 1 // 0-based

  // Build a map: day number → amount
  const dayMap = new Map<number, number>()
  for (const d of data) {
    dayMap.set(d.day, d.amount)
  }

  const max = Math.max(...data.map((d) => d.amount), 1)
  const total = data.reduce((s, d) => s + d.amount, 0)

  // Build calendar grid
  const firstDay = new Date(year, monthIdx, 1)
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate()
  // JS: 0=Sun, convert to Mon=0
  const startDow = (firstDay.getDay() + 6) % 7

  // Fill weeks array
  const weeks: (number | null)[][] = []
  let currentWeek: (number | null)[] = Array(startDow).fill(null)

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push(currentWeek)
  }

  return (
    <Card className="h-full">
      <CardHeader className="px-5 py-4">
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-section">เงินสดเข้ารายวัน</CardTitle>
          <span className="text-xs text-muted-foreground font-medium tabular-nums">
            รวม {formatCompact(total)} ฿
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="text-center text-[10px] text-muted-foreground font-medium">
              {d}
            </div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((day, di) => {
                if (day === null) {
                  return <div key={di} className="aspect-square" />
                }
                const amount = dayMap.get(day) ?? 0
                const today = isToday(year, monthIdx, day)
                const future = isFuture(year, monthIdx, day)

                return (
                  <div
                    key={di}
                    className={`
                      aspect-square rounded-md flex items-center justify-center relative
                      text-[11px] tabular-nums transition-colors
                      ${future ? 'bg-muted/30 text-muted-foreground/40' : getIntensityClass(amount, max)}
                      ${!future && amount > 0 ? 'text-foreground font-medium' : ''}
                      ${!future && amount <= 0 ? 'text-muted-foreground/60' : ''}
                      ${today ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}
                    `}
                    title={future ? `วันที่ ${day}` : `วันที่ ${day}: ${formatCompact(amount)} ฿`}
                  >
                    {day}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="flex items-center justify-end gap-1.5 mt-3">
          <span className="text-[10px] text-muted-foreground">น้อย</span>
          <div className="w-3 h-3 rounded-sm bg-muted/50" />
          <div className="w-3 h-3 rounded-sm bg-primary/20" />
          <div className="w-3 h-3 rounded-sm bg-primary/40" />
          <div className="w-3 h-3 rounded-sm bg-primary/65" />
          <div className="w-3 h-3 rounded-sm bg-primary" />
          <span className="text-[10px] text-muted-foreground">มาก</span>
        </div>
      </CardContent>
    </Card>
  )
}
