import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card'
import type { PaymentMethodEntry } from '../types'

interface Props {
  data: PaymentMethodEntry[]
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'เงินสด',
  TRANSFER: 'โอนเงิน',
}

const METHOD_COLORS: Record<string, string> = {
  CASH: 'bg-primary',
  TRANSFER: 'bg-success',
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
        {/* Total */}
        <p className="text-lg font-semibold tabular-nums text-foreground mb-3">
          {formatCompact(total)} ฿
        </p>

        {/* Split bar */}
        <div className="flex h-3 rounded-full overflow-hidden mb-4">
          {data.map((entry) => {
            const pct = (entry.amount / total) * 100
            if (pct === 0) return null
            return (
              <div
                key={entry.method}
                className={`${METHOD_COLORS[entry.method] ?? 'bg-info'} transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            )
          })}
        </div>

        {/* Legend */}
        <div className="space-y-2.5">
          {data.map((entry) => {
            const pct = (entry.amount / total) * 100
            return (
              <div key={entry.method} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${METHOD_COLORS[entry.method] ?? 'bg-info'}`} />
                  <span className="text-sm text-muted-foreground">{METHOD_LABELS[entry.method] ?? entry.method}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {formatCompact(entry.amount)} ฿
                  </span>
                  <span className="text-[11px] text-muted-foreground tabular-nums w-8 text-right">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
