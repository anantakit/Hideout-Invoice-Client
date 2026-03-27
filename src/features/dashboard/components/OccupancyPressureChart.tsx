import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { formatCompactNumber } from '@/shared/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import type { OccupancyPressureEntry } from '../types'
import { calcPressureKPI, getTopInsights } from '../utils/dashboardCalc'
import {
  DAY_NAMES, ZONE_COLORS, ACTION_TYPE_ICON, MomentumBadge, PressureTooltip,
} from './PressureTooltip'

interface Props {
  data: OccupancyPressureEntry[]
}

function formatKPI(n: number): string {
  return formatCompactNumber(n)
}

export function OccupancyPressureChart({ data }: Props) {
  if (!data || data.length === 0) return null

  const { criticalCount, totalAtRisk, totalUpside } = calcPressureKPI(data)

  return (
    <Card className="h-full">
      <CardHeader className="px-5 py-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-section">แรงกดดันห้องว่าง 7 วัน</CardTitle>
            <p className="text-micro-sm text-muted-foreground mt-0.5">
              {criticalCount > 0 && (
                <span className="text-destructive font-medium">{criticalCount} วันเสี่ยง</span>
              )}
              {criticalCount > 0 && (totalAtRisk > 0 || totalUpside > 0) && ' | '}
              {totalAtRisk > 0 && (
                <span className="text-warning font-medium">เสี่ยงเสีย {formatKPI(totalAtRisk)} ฿</span>
              )}
              {totalAtRisk > 0 && totalUpside > 0 && ' | '}
              {totalUpside > 0 && (
                <span className="text-success font-medium">ขึ้นราคาได้ +{formatKPI(totalUpside)} ฿</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 text-micro-sm flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: ZONE_COLORS.critical }} />
              <span className="text-muted-foreground">วิกฤต</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: ZONE_COLORS.at_risk }} />
              <span className="text-muted-foreground">เสี่ยง</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: ZONE_COLORS.healthy }} />
              <span className="text-muted-foreground">ปกติ</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: ZONE_COLORS.high_demand }} />
              <span className="text-muted-foreground">ดีมาก</span>
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-4">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(d: string) => {
                const date = new Date(d)
                return `${DAY_NAMES[date.getDay()]} ${date.getDate()}`
              }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v: number) => `${v}%`}
              domain={[0, 100]}
              width={38}
            />
            <Tooltip content={<PressureTooltip />} />
            <Bar dataKey="occupancy_pct" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {data.map((entry, idx) => (
                <Cell key={idx} fill={ZONE_COLORS[entry.zone] || ZONE_COLORS.healthy} fillOpacity={0.85} />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="target_pct"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Insight cards */}
        {data.some((d) => d.insight || d.zone === 'critical' || d.zone === 'at_risk' || d.zone === 'high_demand') && (
          <div className="mt-3 flex flex-wrap gap-2 px-2">
            {getTopInsights(data, 4).map((d) => {
                const date = new Date(d.date)
                const dayLabel = `${DAY_NAMES[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`
                const at = ACTION_TYPE_ICON[d.action_type] || ACTION_TYPE_ICON.monitoring
                return (
                  <div
                    key={d.date}
                    className={`text-micro-sm px-2.5 py-1.5 rounded-md border flex items-center gap-1.5 ${
                      d.action_type === 'operations'
                        ? 'border-destructive/30 bg-destructive/8 text-destructive'
                        : d.action_type === 'marketing'
                          ? 'border-warning/30 bg-warning/8 text-warning'
                          : d.action_type === 'pricing'
                            ? 'border-primary/30 bg-primary/8 text-primary'
                            : 'border-muted/30 bg-muted/8 text-muted-foreground'
                    }`}
                  >
                    <span className="text-[10px]" title={at.label}>{at.symbol}</span>
                    <span className={`font-semibold tabular-nums px-1 rounded ${
                      d.action_priority >= 70 ? 'bg-destructive/20' :
                      d.action_priority >= 50 ? 'bg-warning/20' :
                      d.action_priority >= 30 ? 'bg-info/20' :
                      'bg-success/20'
                    }`}>{d.action_priority.toFixed(0)}</span>
                    <span className="font-semibold">{dayLabel}</span>
                    <MomentumBadge momentum={d.momentum} pickup={d.daily_pickup} />
                    <span className="mx-0.5">—</span>
                    <span>{d.insight || d.action}</span>
                  </div>
                )
              })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
