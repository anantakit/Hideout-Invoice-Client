import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card'
import type { RoomTypeRevenueEntry } from '../types'

interface Props {
  data: RoomTypeRevenueEntry[]
}

const TYPE_COLORS = [
  'bg-primary',
  'bg-info',
  'bg-success',
  'bg-warning',
  'bg-destructive',
]

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toFixed(0)
}

export function RoomTypeRevenueChart({ data }: Props) {
  const max = Math.max(...data.map((d) => d.revenue), 1)
  const total = data.reduce((s, d) => s + d.revenue, 0)

  if (data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="px-5 py-4">
          <CardTitle className="text-section">รายได้ตามประเภทห้อง</CardTitle>
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
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-section">รายได้ตามประเภทห้อง</CardTitle>
          <span className="text-xs text-muted-foreground font-medium tabular-nums">
            รวม {formatCompact(total)} ฿
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="space-y-4">
          {data.map((entry, i) => {
            const pct = total > 0 ? (entry.revenue / total) * 100 : 0
            return (
              <div key={entry.room_type_name}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-sm font-medium text-foreground">{entry.room_type_name}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {formatCompact(entry.revenue)} ฿
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${TYPE_COLORS[i % TYPE_COLORS.length]} transition-all duration-500`}
                    style={{ width: `${(entry.revenue / max) * 100}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
