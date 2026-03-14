import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card'
import type { PaymentMethodEntry } from '../types'

interface Props {
  data: PaymentMethodEntry[]
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--info))',
]

const METHOD_LABELS: Record<string, string> = {
  CASH: 'เงินสด',
  TRANSFER: 'โอนเงิน',
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toFixed(0)
}

export function PaymentMethodChart({ data }: Props) {
  const total = data.reduce((s, d) => s + d.amount, 0)

  if (data.length === 0 || total === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="px-5 py-4">
          <CardTitle className="text-section">ช่องทางชำระเงิน</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4 flex items-center justify-center h-40">
          <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="px-5 py-4">
        <CardTitle className="text-section">ช่องทางชำระเงิน</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="flex items-center gap-5">
          {/* Donut with center label */}
          <div className="relative shrink-0">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="amount"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={56}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-muted-foreground">รวม</span>
              <span className="text-sm font-semibold tabular-nums text-foreground">{formatCompact(total)} ฿</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-3">
            {data.map((entry, i) => {
              const pct = (entry.amount / total) * 100
              return (
                <div key={entry.method}>
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-sm text-muted-foreground">{METHOD_LABELS[entry.method] ?? entry.method}</span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {formatCompact(entry.amount)} ฿
                    </span>
                  </div>
                  <div className="ml-[18px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground tabular-nums w-8 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
