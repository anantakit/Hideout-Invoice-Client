import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card'
import { formatTHB } from '../../../shared/utils'
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

export function RevenueTrendChart({ data, yearLabel, prevYearLabel }: Props) {
  const hasPrevData = data.some((d) => d.previous > 0)

  return (
    <Card className="h-full">
      <CardHeader className="px-5 py-4">
        <CardTitle className="text-section">รายได้ประจำเดือน</CardTitle>
        <p className="text-helper mt-0.5">
          {hasPrevData
            ? `เปรียบเทียบรายเดือน ปี ${yearLabel} กับ ${prevYearLabel}`
            : `รายเดือน ปี ${yearLabel}`}
        </p>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
              tickFormatter={(m) => THAI_SHORT_MONTHS[m - 1] ?? m}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={45}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
                fontSize: 13,
              }}
              formatter={(value, name) => [
                formatTHB(Number(value)),
                name === 'current' ? `ปี ${yearLabel}` : `ปี ${prevYearLabel}`,
              ]}
              labelFormatter={(m) => THAI_SHORT_MONTHS[Number(m) - 1] ?? m}
              cursor={{ fill: 'hsl(var(--accent))', opacity: 0.3 }}
            />
            {hasPrevData && (
              <Legend
                formatter={(value) => (value === 'current' ? `ปี ${yearLabel}` : `ปี ${prevYearLabel}`)}
                wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}
              />
            )}
            {hasPrevData && (
              <Bar
                dataKey="previous"
                fill="hsl(var(--muted-foreground))"
                opacity={0.25}
                radius={[3, 3, 0, 0]}
              />
            )}
            <Bar
              dataKey="current"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
