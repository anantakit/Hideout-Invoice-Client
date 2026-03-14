import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card'
import type { DailyOccupancyEntry } from '../types'

interface Props {
  data: DailyOccupancyEntry[]
  totalRooms: number
}

const DAY_NAMES = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return n.toFixed(0)
}

function formatKPI(n: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

function isToday(dateStr: string): boolean {
  const today = new Date()
  const d = new Date(dateStr)
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr)
  return d.getDay() === 0 || d.getDay() === 6
}

interface ChartRow {
  date: string
  occupancyPct: number
  adr: number
  isWeekend: boolean
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length || !label) return null
  const d = new Date(label)
  const dayName = DAY_NAMES[d.getDay()]
  const dateLabel = `${dayName} ${d.getDate()}/${d.getMonth() + 1}`
  const occ = payload.find((p) => p.dataKey === 'occupancyPct')?.value ?? 0
  const adr = payload.find((p) => p.dataKey === 'adr')?.value ?? 0

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">
        {dateLabel}
        {isToday(label) ? ' (วันนี้)' : ''}
        {isWeekend(label) ? ' 🅦' : ''}
      </p>
      <div className="space-y-0.5">
        <p className="text-muted-foreground">
          Occ <span className="font-semibold text-info tabular-nums">{occ.toFixed(0)}%</span>
        </p>
        <p className="text-muted-foreground">
          ADR <span className="font-semibold text-warning tabular-nums">{formatKPI(adr)} ฿</span>
        </p>
      </div>
    </div>
  )
}

export function OccupancyTrendChart({ data, totalRooms }: Props) {
  if (!data || data.length === 0 || totalRooms === 0) return null

  const chartData: ChartRow[] = data.map((d) => {
    const occPct = totalRooms > 0 ? (d.occupied / totalRooms) * 100 : 0
    const adr = d.occupied > 0 ? d.earned / d.occupied : 0
    return {
      date: d.date,
      occupancyPct: occPct,
      adr,
      isWeekend: isWeekend(d.date),
    }
  })

  const avgOcc = chartData.reduce((s, d) => s + d.occupancyPct, 0) / chartData.length
  const avgAdr = chartData.filter((d) => d.adr > 0).reduce((s, d, _, arr) => s + d.adr / arr.length, 0)

  return (
    <Card className="h-full">
      <CardHeader className="px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-section">Occupancy & ADR 14 วัน</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Avg Occ {avgOcc.toFixed(0)}% | Avg ADR {formatKPI(avgAdr)} ฿
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-info" />
              <span className="text-muted-foreground">Occ%</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-warning" />
              <span className="text-muted-foreground">ADR</span>
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-4">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="occGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(d: string) => {
                const date = new Date(d)
                const wd = isWeekend(d)
                return `${wd ? '•' : ''}${date.getDate()}`
              }}
              interval={1}
            />
            <YAxis
              yAxisId="occ"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v: number) => `${v}%`}
              domain={[0, 100]}
              width={38}
            />
            <YAxis
              yAxisId="adr"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v: number) => formatCompact(v)}
              width={38}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              yAxisId="occ"
              y={avgOcc}
              stroke="hsl(var(--info))"
              strokeDasharray="4 4"
              strokeOpacity={0.4}
            />
            <Area
              yAxisId="occ"
              type="monotone"
              dataKey="occupancyPct"
              stroke="hsl(var(--info))"
              strokeWidth={2}
              fill="url(#occGradient)"
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(var(--info))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
            />
            <Line
              yAxisId="adr"
              type="monotone"
              dataKey="adr"
              stroke="hsl(var(--warning))"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              activeDot={{ r: 3, fill: 'hsl(var(--warning))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
