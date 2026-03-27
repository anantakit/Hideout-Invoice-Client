import { useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, LabelList, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Check, Pencil, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card'
import { Input } from '../../../shared/ui/input'
import { Button } from '../../../shared/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../shared/ui/select'
import { formatTHB, THAI_MONTHS_SHORT, THAI_MONTHS_FULL, formatCompact } from '../../../shared/utils'
import { useUpdateRevenueTarget } from '../hooks/useUpdateRevenueTarget'
import type { MonthlyRevenueEntry } from '../types'
import { calcYTDCumulative, calcYoYPercent } from '../utils/dashboardCalc'

interface Props {
  data: MonthlyRevenueEntry[]
  /** e.g. "2569" */
  yearLabel: string
  /** e.g. "2568" */
  prevYearLabel: string
}

export function RevenueTrendChart({ data, yearLabel, prevYearLabel }: Props) {
  const hasPrevData = data.some((d) => d.previous > 0)
  const hasTarget = data.some((d) => d.target > 0)

  const chartData = calcYTDCumulative(data)

  // Extract year from yearLabel (Thai BE → CE)
  const ceYear = Number(yearLabel) - 543

  // Target editing state
  const [editMonth, setEditMonth] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const { mutate, isPending } = useUpdateRevenueTarget(ceYear)

  const handleEditSubmit = (month: number) => {
    const amount = parseFloat(editValue)
    if (!isNaN(amount) && amount >= 0) {
      mutate({ month, amount })
    } else {
      setEditMonth(null)
    }
  }

  // Custom label for YoY % change
  const YoYLabel = (props: Record<string, unknown>) => {
    const { x, y, width, index } = props as { x: number; y: number; width: number; index: number }
    const entry = chartData[index]
    const pct = calcYoYPercent(entry?.current ?? 0, entry?.previous ?? 0)
    if (pct == null) return null
    const color = pct >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'
    return (
      <text x={x + width / 2} y={y - 6} textAnchor="middle" fill={color} fontSize={10} fontWeight={500}>
        {pct >= 0 ? '+' : ''}{pct.toFixed(0)}%
      </text>
    )
  }

  // Max value for left Y axis
  const maxBarVal = Math.max(
    ...chartData.map((d) => Math.max(d.current, d.previous, d.target || 0)),
    1,
  )
  const maxYTD = chartData.length > 0 ? chartData[chartData.length - 1].ytd : 1

  return (
    <Card>
      {/* ── Header ── */}
      <CardHeader className="px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm sm:text-base font-semibold text-foreground">รายได้ประจำเดือน (Accrual)</CardTitle>
            <p className="text-micro-sm sm:text-xs text-muted-foreground mt-0.5">
              {hasPrevData
                ? `มูลค่าห้องพักรายเดือน ปี ${yearLabel} vs ${prevYearLabel}`
                : `มูลค่าห้องพักรายเดือน ปี ${yearLabel}`}
            </p>
          </div>
          {editMonth === null && (
            <button
              onClick={() => {
                const first = data[0]
                if (first) {
                  setEditMonth(first.month)
                  setEditValue((first.target || 0).toFixed(0))
                }
              }}
              className="text-muted-foreground hover:text-foreground transition-colors duration-200 p-1.5 rounded-md hover:bg-accent cursor-pointer"
              title="ตั้งเป้ารายได้"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-2 sm:px-3 pb-3 sm:pb-4 pt-0">
        {/* ── Target editor ── */}
        {editMonth !== null && (
          <div className="mx-2 sm:mx-0 mb-3 p-3 rounded-lg bg-accent/50 border border-border">
            <p className="text-micro-sm text-muted-foreground font-medium mb-2">ตั้งเป้ารายได้</p>
            <div className="flex items-center gap-2">
              <Select
                value={String(editMonth)}
                onValueChange={(v) => {
                  const m = Number(v)
                  const entry = data.find((d) => d.month === m)
                  setEditMonth(m)
                  setEditValue((entry?.target || 0).toFixed(0))
                }}
              >
                <SelectTrigger className="w-[7.5rem] shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {data.map((d) => (
                    <SelectItem key={d.month} value={String(d.month)}>
                      {THAI_MONTHS_FULL[d.month - 1]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                inputMode="numeric"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEditSubmit(editMonth)
                  if (e.key === 'Escape') setEditMonth(null)
                }}
                placeholder="จำนวนเงิน"
                className="flex-1 min-w-0 tabular-nums"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-9 w-9 text-success hover:text-success hover:bg-success/10"
                onClick={() => handleEditSubmit(editMonth)}
                disabled={isPending}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={() => setEditMonth(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Chart ── */}
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={chartData} margin={{ top: 18, right: 45, left: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
              tickFormatter={(m) => THAI_MONTHS_SHORT[m - 1] ?? m}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={(v) => formatCompact(v)}
              domain={[0, Math.ceil(maxBarVal * 1.15)]}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: 'hsl(var(--warning))', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={(v) => formatCompact(v)}
              domain={[0, Math.ceil(maxYTD * 1.1)]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
                fontSize: 12,
                padding: '8px 12px',
              }}
              formatter={(value, name) => {
                const label =
                  name === 'current' ? `ปี ${yearLabel}` :
                  name === 'previous' ? `ปี ${prevYearLabel}` :
                  name === 'target' ? 'เป้ารายได้' :
                  name === 'ytd' ? 'สะสม YTD' : String(name)
                return [formatTHB(Number(value)), label]
              }}
              labelFormatter={(m) => THAI_MONTHS_SHORT[Number(m) - 1] ?? m}
              cursor={{ fill: 'hsl(var(--accent))', opacity: 0.3 }}
            />
            <Legend
              formatter={(value) => {
                if (value === 'current') return `ปี ${yearLabel}`
                if (value === 'previous') return `ปี ${prevYearLabel}`
                if (value === 'target') return 'เป้า'
                if (value === 'ytd') return 'สะสม YTD'
                return value
              }}
              wrapperStyle={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', paddingTop: 4 }}
            />
            {/* Previous year bars */}
            {hasPrevData && (
              <Bar
                yAxisId="left"
                dataKey="previous"
                fill="hsl(var(--muted-foreground))"
                opacity={0.2}
                radius={[3, 3, 0, 0]}
              />
            )}
            {/* Current year bars */}
            <Bar
              yAxisId="left"
              dataKey="current"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            >
              {hasPrevData && <LabelList content={<YoYLabel />} />}
            </Bar>
            {/* Target dashed line */}
            {hasTarget && (
              <Line
                yAxisId="left"
                dataKey="target"
                type="monotone"
                stroke="hsl(var(--destructive))"
                strokeDasharray="5 5"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3 }}
              />
            )}
            {/* Cumulative YTD line */}
            <Line
              yAxisId="right"
              dataKey="ytd"
              type="monotone"
              stroke="hsl(var(--warning))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
