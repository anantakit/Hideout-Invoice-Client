import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import type { DailyRevenueEntry } from '../types'
import { getIntensityClass, buildCalendarGrid } from '../utils/heatmapCalc'

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

export function DailyRevenueHeatmap({ data, month }: Props) {
  const [yearStr, monthStr] = month.split('-')
  const year = Number(yearStr)
  const monthIdx = Number(monthStr) - 1 // 0-based

  const max = Math.max(...data.map((d) => d.amount), 1)
  const total = data.reduce((s, d) => s + d.amount, 0)
  const weeks = useMemo(() => buildCalendarGrid(year, monthIdx, data), [year, monthIdx, data])

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
              {week.map((cell, di) => {
                if (cell.day === null) {
                  return <div key={di} className="aspect-square" />
                }

                return (
                  <div
                    key={di}
                    className={`
                      aspect-square rounded-md flex items-center justify-center relative
                      text-micro-sm tabular-nums transition-colors
                      ${cell.isFuture ? 'bg-muted/30 text-muted-foreground/40' : getIntensityClass(cell.amount, max)}
                      ${!cell.isFuture && cell.amount > 0 ? 'text-foreground font-medium' : ''}
                      ${!cell.isFuture && cell.amount <= 0 ? 'text-muted-foreground/60' : ''}
                      ${cell.isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}
                    `}
                    title={cell.isFuture ? `วันที่ ${cell.day}` : `วันที่ ${cell.day}: ${formatCompact(cell.amount)} ฿`}
                  >
                    {cell.day}
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
