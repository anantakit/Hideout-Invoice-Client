import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { formatCompactNumber } from '@/shared/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card'
import type { OccupancyPressureEntry } from '../types'

interface Props {
  data: OccupancyPressureEntry[]
}

const DAY_NAMES = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

const ZONE_COLORS: Record<string, string> = {
  critical: 'hsl(var(--destructive))',
  at_risk: 'hsl(var(--warning))',
  building: 'hsl(var(--info))',
  healthy: 'hsl(var(--success))',
  high_demand: 'hsl(var(--primary))',
}

const SCARCITY_LABEL: Record<string, string> = {
  last_room: 'ห้องสุดท้าย',
  scarce: 'เหลือน้อย',
  limited: 'จำกัด',
  available: 'ปกติ',
  excess: 'ว่างมาก',
}

const SCARCITY_CLASS: Record<string, string> = {
  last_room: 'text-destructive font-semibold',
  scarce: 'text-warning font-medium',
  limited: 'text-foreground',
  available: 'text-muted-foreground',
  excess: 'text-muted-foreground',
}

const MOMENTUM_ICON: Record<string, { symbol: string; label: string; cls: string }> = {
  accelerating: { symbol: '\u25B2', label: 'เร่งตัว', cls: 'text-success' },
  steady: { symbol: '\u25B6', label: 'ปกติ', cls: 'text-muted-foreground' },
  slowing: { symbol: '\u25BC', label: 'ชะลอ', cls: 'text-warning' },
  stalled: { symbol: '\u23F8', label: 'หยุดนิ่ง', cls: 'text-destructive' },
}

const PACE_STATUS: Record<string, { label: string; cls: string }> = {
  ahead: { label: 'เร็วกว่าปกติ', cls: 'text-success' },
  normal: { label: 'ตามปกติ', cls: 'text-muted-foreground' },
  behind: { label: 'ช้ากว่าปกติ', cls: 'text-warning' },
  far_behind: { label: 'ช้ามาก', cls: 'text-destructive' },
}

const ACTION_TYPE_ICON: Record<string, { symbol: string; label: string }> = {
  pricing: { symbol: '฿', label: 'ปรับราคา' },
  marketing: { symbol: '📢', label: 'การตลาด' },
  operations: { symbol: '⚡', label: 'ปฏิบัติการ' },
  monitoring: { symbol: '👁', label: 'ติดตาม' },
}

function formatKPI(n: number): string {
  return formatCompactNumber(n)
}

function MomentumBadge({ momentum, pickup }: { momentum: string; pickup: number }) {
  const m = MOMENTUM_ICON[momentum] || MOMENTUM_ICON.steady
  return (
    <span className={`inline-flex items-center gap-0.5 ${m.cls}`}>
      <span className="text-[10px]">{m.symbol}</span>
      <span className="text-[10px]">
        {pickup > 0 ? `+${pickup}` : pickup < 0 ? `${pickup}` : '0'}
      </span>
    </span>
  )
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; payload: OccupancyPressureEntry }>
  label?: string
}) {
  if (!active || !payload?.length || !label) return null
  const entry = payload[0]?.payload
  if (!entry) return null

  const d = new Date(label)
  const dayName = DAY_NAMES[d.getDay()]
  const dateLabel = `${dayName} ${d.getDate()}/${d.getMonth() + 1}`
  const m = MOMENTUM_ICON[entry.momentum] || MOMENTUM_ICON.steady

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs max-w-[240px]">
      <p className="font-semibold text-foreground mb-1.5">
        {dateLabel}
        {entry.days_until === 0 ? ' (วันนี้)' : ` (อีก ${entry.days_until} วัน)`}
      </p>
      <div className="space-y-1">
        <p className="text-muted-foreground">
          เข้าพัก{' '}
          <span className="font-semibold text-foreground tabular-nums">
            {entry.occupied_rooms}/{entry.total_rooms} ห้อง ({entry.occupancy_pct.toFixed(0)}%)
          </span>
        </p>
        <p className="text-muted-foreground">
          เป้าหมาย <span className="font-semibold tabular-nums">{entry.target_pct.toFixed(0)}%</span>
          {entry.curve_sample_size > 0 ? (
            <span className="text-muted-foreground/70"> (จาก {entry.curve_sample_size} สัปดาห์)</span>
          ) : (
            <span className="text-muted-foreground/70"> (ค่าเริ่มต้น)</span>
          )}
        </p>
        <p className="text-muted-foreground">
          ห้องว่าง{' '}
          <span className={`tabular-nums ${SCARCITY_CLASS[entry.scarcity_level] || ''}`}>
            {entry.remaining_rooms} ห้อง ({SCARCITY_LABEL[entry.scarcity_level] || ''})
          </span>
        </p>
        <p className="text-muted-foreground">
          จองเพิ่มวันนี้{' '}
          <span className={`font-semibold tabular-nums ${m.cls}`}>
            {entry.daily_pickup > 0 ? `+${entry.daily_pickup}` : entry.daily_pickup} ห้อง ({m.label})
          </span>
        </p>
        {entry.pace_vs_normal !== 0 && (
          <p className="text-muted-foreground">
            จอง vs ปกติ{' '}
            <span className={`font-semibold tabular-nums ${(PACE_STATUS[entry.pace_status] || PACE_STATUS.normal).cls}`}>
              {entry.pace_vs_normal > 0 ? '+' : ''}{entry.pace_vs_normal.toFixed(0)}% ({(PACE_STATUS[entry.pace_status] || PACE_STATUS.normal).label})
            </span>
          </p>
        )}
        {entry.cancel_risk_pct > 5 && (
          <p className="text-muted-foreground">
            ความเสี่ยงยกเลิก{' '}
            <span className={`font-semibold tabular-nums ${
              entry.cancel_risk_level === 'high' ? 'text-destructive' :
              entry.cancel_risk_level === 'medium' ? 'text-warning' : 'text-muted-foreground'
            }`}>
              {entry.cancel_risk_pct.toFixed(0)}% ({
                entry.cancel_risk_level === 'high' ? 'สูง' :
                entry.cancel_risk_level === 'medium' ? 'ปานกลาง' : 'ต่ำ'
              })
            </span>
          </p>
        )}
        {entry.predicted_walkins > 0 && (
          <p className="text-muted-foreground">
            คาด walk-in{' '}
            <span className="font-semibold tabular-nums text-info">
              ~{entry.predicted_walkins} ห้อง
            </span>
          </p>
        )}
        <p className="text-muted-foreground">
          ราคาเฉลี่ย <span className="font-semibold tabular-nums">{formatKPI(entry.date_adr)} ฿</span>
          {entry.suggested_adr_change_pct !== 0 && (
            <span className={`ml-1 font-semibold ${entry.suggested_adr_change_pct > 0 ? 'text-success' : 'text-warning'}`}>
              ({entry.suggested_adr_change_pct > 0 ? '+' : ''}{entry.suggested_adr_change_pct.toFixed(0)}%)
            </span>
          )}
        </p>
        {entry.revenue_at_risk > 0 && (
          <p className="text-muted-foreground">
            รายได้เสี่ยง{' '}
            <span className="font-semibold text-warning tabular-nums">{formatKPI(entry.revenue_at_risk)} ฿</span>
          </p>
        )}
        {entry.revenue_upside > 0 && (
          <p className="text-muted-foreground">
            ขึ้นราคาได้{' '}
            <span className="font-semibold text-success tabular-nums">+{formatKPI(entry.revenue_upside)} ฿</span>
          </p>
        )}
        <div className="pt-1 border-t border-border mt-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded ${
              entry.risk_score >= 76 ? 'bg-destructive/15 text-destructive' :
              entry.risk_score >= 51 ? 'bg-warning/15 text-warning' :
              entry.risk_score >= 26 ? 'bg-info/15 text-info' :
              'bg-success/15 text-success'
            }`} style={{ opacity: entry.confidence_score < 0.4 ? 0.5 : 1 }}>
              {entry.risk_score.toFixed(0)}
            </span>
            <span className="text-muted-foreground">{entry.zone_label}</span>
            <span className="text-muted-foreground/60 text-[10px] ml-auto tabular-nums">
              ความมั่นใจ {(entry.confidence_score * 100).toFixed(0)}%
            </span>
          </div>
          {entry.insight ? (
            <p className="text-muted-foreground">
              {entry.confidence_score < 0.4 && <span className="text-warning mr-1">⚠</span>}
              {entry.insight}
            </p>
          ) : (
            <p className="text-muted-foreground">{entry.action}</p>
          )}
          {entry.confidence_factors?.length > 0 && (
            <p className="text-muted-foreground/50 text-[10px] mt-0.5">
              {entry.confidence_factors.join(' · ')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function OccupancyPressureChart({ data }: Props) {
  if (!data || data.length === 0) return null

  const criticalCount = data.filter((d) => d.zone === 'critical' || d.zone === 'at_risk').length
  const totalAtRisk = data.reduce((s, d) => s + d.revenue_at_risk, 0)
  const totalUpside = data.reduce((s, d) => s + d.revenue_upside, 0)

  return (
    <Card className="h-full">
      <CardHeader className="px-5 py-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-section">แรงกดดันห้องว่าง 7 วัน</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
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
          <div className="flex items-center gap-3 text-[11px] flex-wrap">
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
            <Tooltip content={<CustomTooltip />} />
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

        {/* Insight cards — sorted by action priority desc, show only actionable days */}
        {data.some((d) => d.insight || d.zone === 'critical' || d.zone === 'at_risk' || d.zone === 'high_demand') && (
          <div className="mt-3 flex flex-wrap gap-2 px-2">
            {[...data]
              .filter((d) => d.insight || d.zone === 'critical' || d.zone === 'at_risk' || d.zone === 'high_demand')
              .sort((a, b) => b.action_priority - a.action_priority)
              .slice(0, 4)
              .map((d) => {
                const date = new Date(d.date)
                const dayLabel = `${DAY_NAMES[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`
                const at = ACTION_TYPE_ICON[d.action_type] || ACTION_TYPE_ICON.monitoring
                return (
                  <div
                    key={d.date}
                    className={`text-[11px] px-2.5 py-1.5 rounded-md border flex items-center gap-1.5 ${
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
