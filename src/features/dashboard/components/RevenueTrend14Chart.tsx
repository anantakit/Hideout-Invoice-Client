import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card'
import type { RevenueTrendEntry } from '../types'

interface Props {
  data: RevenueTrendEntry[]
}

const DAY_NAMES = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return n.toFixed(0)
}

function formatKPI(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
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

function todayDateStr(): string {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length || !label) return null
  const d = new Date(label)
  const dayName = DAY_NAMES[d.getDay()]
  const dateLabel = `${dayName} ${d.getDate()}/${d.getMonth() + 1}`
  const cash = payload.find((p) => p.dataKey === 'cash')?.value ?? 0
  const earned = payload.find((p) => p.dataKey === 'earned')?.value ?? 0

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{dateLabel}{isToday(label) ? ' (วันนี้)' : ''}</p>
      <div className="space-y-0.5">
        <p className="text-muted-foreground">
          เงินสดเข้า <span className="font-semibold text-primary tabular-nums">{formatKPI(cash)} ฿</span>
        </p>
        <p className="text-muted-foreground">
          มูลค่าเข้าพัก <span className="font-semibold text-success tabular-nums">{formatKPI(earned)} ฿</span>
        </p>
      </div>
    </div>
  )
}

export function RevenueTrend14Chart({ data }: Props) {
  if (!data || data.length === 0) return null

  const avgCash = data.reduce((s, d) => s + d.cash, 0) / data.length

  return (
    <Card className="h-full">
      <CardHeader className="px-5 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-section">รายได้ 14 วัน</CardTitle>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-primary" />
              <span className="text-muted-foreground">เงินสดเข้า</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-success/40" />
              <span className="text-muted-foreground">มูลค่าเข้าพัก</span>
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-4">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.03} />
              </linearGradient>
              <linearGradient id="earnedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0.03} />
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
                return `${date.getDate()}`
              }}
              interval={1}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v: number) => formatCompact(v)}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={avgCash}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              strokeOpacity={0.4}
              label={{
                value: `เฉลี่ย ${formatCompact(avgCash)}`,
                position: 'right',
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 10,
              }}
            />
            <ReferenceLine
              x={todayDateStr()}
              stroke="hsl(var(--primary))"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            <Area
              type="monotone"
              dataKey="earned"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              strokeOpacity={0.7}
              fill="url(#earnedGradient)"
              dot={false}
              activeDot={{ r: 3, fill: 'hsl(var(--success))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="cash"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#cashGradient)"
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
