import { formatCompactNumber } from '@/shared/utils'
import type { OccupancyPressureEntry } from '../types'

export const DAY_NAMES = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

export const ZONE_COLORS: Record<string, string> = {
  critical: 'hsl(var(--destructive))',
  at_risk: 'hsl(var(--warning))',
  building: 'hsl(var(--info))',
  healthy: 'hsl(var(--success))',
  high_demand: 'hsl(var(--primary))',
}

const SCARCITY_LABEL: Record<string, string> = {
  last_room: 'ห้องสุดท้าย', scarce: 'เหลือน้อย', limited: 'จำกัด', available: 'ปกติ', excess: 'ว่างมาก',
}

const SCARCITY_CLASS: Record<string, string> = {
  last_room: 'text-destructive font-semibold', scarce: 'text-warning font-medium',
  limited: 'text-foreground', available: 'text-muted-foreground', excess: 'text-muted-foreground',
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

export const ACTION_TYPE_ICON: Record<string, { symbol: string; label: string }> = {
  pricing: { symbol: '฿', label: 'ปรับราคา' },
  marketing: { symbol: '📢', label: 'การตลาด' },
  operations: { symbol: '⚡', label: 'ปฏิบัติการ' },
  monitoring: { symbol: '👁', label: 'ติดตาม' },
}

function formatKPI(n: number): string {
  return formatCompactNumber(n)
}

export function MomentumBadge({ momentum, pickup }: { momentum: string; pickup: number }) {
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

export function PressureTooltip({
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
            <span className="font-semibold tabular-nums text-info">~{entry.predicted_walkins} ห้อง</span>
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
