import { useMemo, useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, LabelList, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card'
import { Input } from '../../../shared/ui/input'
import { formatTHB } from '../../../shared/utils'
import { dashboardApi } from '../api'
import type { MonthlyRevenueEntry } from '../types'

interface Props {
  data: MonthlyRevenueEntry[]
  /** e.g. "2569" */
  yearLabel: string
  /** e.g. "2568" */
  prevYearLabel: string
}

const THAI_SHORT_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.',
  'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.',
  'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return n.toFixed(0)
}

const LEGEND_NAMES: Record<string, string> = {
  current: '',
  previous: '',
  target: 'เป้า',
  ytd: 'สะสม YTD',
}

export function RevenueTrendChart({ data, yearLabel, prevYearLabel }: Props) {
  const hasPrevData = data.some((d) => d.previous > 0)
  const hasTarget = data.some((d) => d.target > 0)

  // Enrich with YTD cumulative
  const chartData = useMemo(() => {
    let cumulative = 0
    return data.map((d) => {
      cumulative += d.current
      return { ...d, ytd: cumulative }
    })
  }, [data])

  // Extract year from yearLabel (Thai BE → CE)
  const ceYear = Number(yearLabel) - 543

  // Target editing state
  const [editMonth, setEditMonth] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ month, amount }: { month: number; amount: number }) =>
      dashboardApi.upsertRevenueTarget(ceYear, month, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setEditMonth(null)
    },
  })

  const handleEditSubmit = (month: number) => {
    const amount = parseFloat(editValue)
    if (!isNaN(amount) && amount >= 0) {
      mutation.mutate({ month, amount })
    } else {
      setEditMonth(null)
    }
  }

  // Custom label for YoY % change
  const YoYLabel = (props: Record<string, unknown>) => {
    const { x, y, width, index } = props as { x: number; y: number; width: number; index: number }
    const entry = chartData[index]
    if (!entry?.previous || entry.previous <= 0) return null
    const pct = ((entry.current - entry.previous) / entry.previous) * 100
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
    <Card className="h-full">
      <CardHeader className="px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-section">รายได้ประจำเดือน (Accrual)</CardTitle>
            <p className="text-helper mt-0.5">
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
              className="text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
              title="ตั้งเป้ารายได้"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        {/* Inline target editor */}
        {editMonth !== null && (
          <div className="flex items-center gap-2 px-3 mb-3">
            <span className="text-xs text-muted-foreground">เป้า {THAI_SHORT_MONTHS[editMonth - 1]}:</span>
            <Input
              inputMode="numeric"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEditSubmit(editMonth)
                if (e.key === 'Escape') setEditMonth(null)
              }}
              className="w-32 tabular-nums"
              autoFocus
            />
            <button
              onClick={() => handleEditSubmit(editMonth)}
              disabled={mutation.isPending}
              className="text-xs text-primary hover:underline"
            >
              บันทึก
            </button>
            <button
              onClick={() => setEditMonth(null)}
              className="text-xs text-muted-foreground hover:underline"
            >
              ยกเลิก
            </button>
            {/* Month navigation */}
            <div className="flex gap-1 ml-auto">
              {data.map((d) => (
                <button
                  key={d.month}
                  onClick={() => {
                    setEditMonth(d.month)
                    setEditValue((d.target || 0).toFixed(0))
                  }}
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    d.month === editMonth
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {THAI_SHORT_MONTHS[d.month - 1]}
                </button>
              ))}
            </div>
          </div>
        )}

        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={chartData} margin={{ top: 20, right: 50, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
              tickFormatter={(m) => THAI_SHORT_MONTHS[m - 1] ?? m}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={45}
              tickFormatter={(v) => formatCompact(v)}
              domain={[0, Math.ceil(maxBarVal * 1.15)]}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: 'hsl(var(--warning))', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={45}
              tickFormatter={(v) => formatCompact(v)}
              domain={[0, Math.ceil(maxYTD * 1.1)]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
                fontSize: 13,
              }}
              formatter={(value, name) => {
                const label =
                  name === 'current' ? `ปี ${yearLabel}` :
                  name === 'previous' ? `ปี ${prevYearLabel}` :
                  name === 'target' ? 'เป้ารายได้' :
                  name === 'ytd' ? 'สะสม YTD' : String(name)
                return [formatTHB(Number(value)), label]
              }}
              labelFormatter={(m) => THAI_SHORT_MONTHS[Number(m) - 1] ?? m}
              cursor={{ fill: 'hsl(var(--accent))', opacity: 0.3 }}
            />
            <Legend
              formatter={(value) => {
                if (value === 'current') return `ปี ${yearLabel}`
                if (value === 'previous') return `ปี ${prevYearLabel}`
                return LEGEND_NAMES[value] ?? value
              }}
              wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}
            />
            {/* Previous year bars */}
            {hasPrevData && (
              <Bar
                yAxisId="left"
                dataKey="previous"
                fill="hsl(var(--muted-foreground))"
                opacity={0.25}
                radius={[3, 3, 0, 0]}
              />
            )}
            {/* Current year bars with YoY labels */}
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
