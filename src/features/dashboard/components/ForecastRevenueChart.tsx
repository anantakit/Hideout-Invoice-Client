import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card'
import type { ForecastRevenueEntry } from '../types'

interface Props {
  data: ForecastRevenueEntry[]
}

const DAY_NAMES = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
const THAI_SHORT_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toFixed(0)
}

function isToday(dateStr: string): boolean {
  const today = new Date()
  const d = new Date(dateStr)
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
}

export function ForecastRevenueChart({ data }: Props) {
  const max = Math.max(...data.map((d) => d.amount), 1)
  const totalForecast = data.reduce((s, d) => s + d.amount, 0)

  return (
    <Card className="h-full">
      <CardHeader className="px-5 py-4">
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-section">รายได้คาดการณ์ 7 วัน</CardTitle>
          <span className="text-xs text-muted-foreground font-medium tabular-nums">
            รวม {formatCompact(totalForecast)} ฿
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="flex items-end gap-2 sm:gap-3 h-[180px]">
          {data.map((entry) => {
            const d = new Date(entry.date)
            const dayName = DAY_NAMES[d.getDay()]
            const dayNum = d.getDate()
            const monthName = THAI_SHORT_MONTHS[d.getMonth()]
            const barHeight = max > 0 ? (entry.amount / max) * 100 : 0
            const today = isToday(entry.date)
            const hasAmount = entry.amount > 0

            return (
              <div key={entry.date} className="flex-1 flex flex-col items-center gap-1">
                {/* Value label */}
                <span className={`text-[11px] font-semibold tabular-nums ${
                  hasAmount ? 'text-foreground' : 'text-muted-foreground/30'
                }`}>
                  {hasAmount ? `${formatCompact(entry.amount)}` : '-'}
                </span>
                {/* Bar */}
                <div className="w-full flex items-end justify-center" style={{ height: '120px' }}>
                  {hasAmount ? (
                    <div
                      className={`w-full max-w-[40px] rounded-t-md transition-all duration-500 ${
                        today ? 'bg-success shadow-[0_0_8px_hsl(var(--success)/0.3)]' : 'bg-success/35'
                      }`}
                      style={{ height: `${Math.max(barHeight, 8)}%` }}
                    />
                  ) : (
                    <div className="w-full max-w-[40px] h-1 rounded bg-muted/40" />
                  )}
                </div>
                {/* Label */}
                <div className={`text-center leading-tight ${
                  today
                    ? 'text-primary font-semibold'
                    : hasAmount ? 'text-foreground' : 'text-muted-foreground/60'
                }`}>
                  <div className="text-[11px]">{dayName}</div>
                  <div className="text-xs font-medium">{dayNum}</div>
                  <div className="text-[10px] text-muted-foreground">{monthName}</div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
