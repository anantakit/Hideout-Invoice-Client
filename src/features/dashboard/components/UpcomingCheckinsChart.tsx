import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card'
import type { UpcomingCheckinEntry } from '../types'

interface Props {
  data: UpcomingCheckinEntry[]
  totalRooms: number
}

const DAY_NAMES = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
const THAI_SHORT_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

function isToday(dateStr: string): boolean {
  const today = new Date()
  const d = new Date(dateStr)
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
}

export function UpcomingCheckinsChart({ data, totalRooms }: Props) {
  const totalUpcoming = data.reduce((s, d) => s + d.count, 0)

  return (
    <Card className="h-full">
      <CardHeader className="px-5 py-4">
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-section">เช็คอิน 7 วันข้างหน้า</CardTitle>
          <span className="text-xs text-muted-foreground font-medium">รวม {totalUpcoming} ห้อง</span>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="flex items-end gap-2 sm:gap-3 h-[180px]">
          {data.map((entry) => {
            const d = new Date(entry.date)
            const dayName = DAY_NAMES[d.getDay()]
            const dayNum = d.getDate()
            const monthName = THAI_SHORT_MONTHS[d.getMonth()]
            const today = isToday(entry.date)

            const booked = entry.booked_rooms
            const bookedPct = totalRooms > 0 ? (booked / totalRooms) * 100 : 0
            const hasCheckins = entry.count > 0

            return (
              <div key={entry.date} className="flex-1 flex flex-col items-center gap-1">
                {/* Value labels */}
                <div className="text-center">
                  <span className={`text-xs font-semibold tabular-nums block ${
                    hasCheckins ? 'text-foreground' : 'text-muted-foreground/30'
                  }`}>
                    {hasCheckins ? `+${entry.count}` : '-'}
                  </span>
                </div>
                {/* Stacked bar: booked (blue) + available (muted) */}
                <div className="w-full flex items-end justify-center" style={{ height: '110px' }}>
                  <div className="w-full max-w-[40px] flex flex-col rounded-t-md overflow-hidden" style={{ height: '100%' }}>
                    {/* Available (top, muted) */}
                    <div
                      className="bg-muted/30 flex-1 transition-all"
                      style={{ flexBasis: `${100 - bookedPct}%` }}
                    />
                    {/* Booked (bottom, colored) */}
                    <div
                      className={`transition-all ${
                        today ? 'bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.3)]' : 'bg-primary/35'
                      }`}
                      style={{ flexBasis: `${bookedPct}%` }}
                    />
                  </div>
                </div>
                {/* Occupancy % */}
                <span className={`text-[10px] tabular-nums ${
                  bookedPct >= 80 ? 'text-success font-medium' :
                  bookedPct <= 30 ? 'text-destructive font-medium' :
                  'text-muted-foreground'
                }`}>
                  {bookedPct.toFixed(0)}%
                </span>
                {/* Day label */}
                <div className={`text-center leading-tight ${
                  today ? 'text-primary font-semibold' : 'text-foreground'
                }`}>
                  <div className="text-[11px]">{dayName}</div>
                  <div className="text-xs font-medium">{dayNum}</div>
                  <div className="text-[10px] text-muted-foreground">{monthName}</div>
                </div>
              </div>
            )
          })}
        </div>
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-primary/40" />
            จองแล้ว
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-muted/30 border border-border" />
            ว่าง
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
