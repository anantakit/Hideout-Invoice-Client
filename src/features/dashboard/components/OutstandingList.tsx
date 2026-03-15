import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { formatCompactNumber } from '@/shared/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card'
import type { OutstandingBookingEntry } from '../types'

interface Props {
  data: OutstandingBookingEntry[]
  total: number
  count: number
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  return formatCompactNumber(n)
}

function agingLabel(days: number): { text: string; className: string } {
  if (days > 30) return { text: `${days} วัน`, className: 'text-destructive bg-destructive/10' }
  if (days > 7) return { text: `${days} วัน`, className: 'text-warning bg-warning/10' }
  if (days > 0) return { text: `${days} วัน`, className: 'text-muted-foreground bg-muted' }
  return { text: 'ยังไม่ถึงกำหนด', className: 'text-muted-foreground bg-muted' }
}

const MAX_DISPLAY = 5

export function OutstandingList({ data, total, count }: Props) {
  if (count === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="px-5 py-4">
          <CardTitle className="text-section">ยอดค้างชำระ</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 flex items-center justify-center h-32">
          <p className="text-sm text-success font-medium">ไม่มียอดค้างชำระ</p>
        </CardContent>
      </Card>
    )
  }

  const displayed = data.slice(0, MAX_DISPLAY)
  const remaining = count - displayed.length

  return (
    <Card className="h-full">
      <CardHeader className="px-5 py-4">
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-section">ยอดค้างชำระ</CardTitle>
          <span className="text-sm font-semibold tabular-nums text-warning">{formatCompact(total)} ฿</span>
        </div>
        <p className="text-xs text-muted-foreground">{count} รายการที่ยังไม่ชำระครบ</p>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        <div className="divide-y divide-border">
          {displayed.map((b) => {
            const aging = agingLabel(b.days_overdue)
            return (
              <Link
                key={b.booking_id}
                to={`/bookings/${b.booking_id}`}
                className="flex items-center justify-between py-2.5 hover:bg-accent/50 -mx-3 px-3 rounded-lg transition-colors cursor-pointer group first:pt-0"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors truncate block">
                    {b.guest_name}
                  </span>
                  <span className={`inline-block text-[11px] font-medium px-1.5 py-0.5 rounded mt-0.5 ${aging.className}`}>
                    {aging.text}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-3">
                  <span className="text-sm font-semibold tabular-nums text-foreground">{formatCompact(b.balance)} ฿</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            )
          })}
        </div>
        {remaining > 0 && (
          <Link
            to="/bookings"
            className="block text-center text-xs text-primary hover:text-primary/80 font-medium mt-3 pt-3 border-t border-border transition-colors"
          >
            ดูเพิ่มเติมอีก {remaining} รายการ
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
