import React from 'react'
import { LogIn, LogOut, Clock } from 'lucide-react'
import { cn } from '@/shared/utils'

// ─── Props ──────────────────────────────────────────────────────────────────

interface ToolbarKPIStripProps {
  kpiTotals: { total: number; occupied: number; unassigned: number; available: number; occupancyPct: number }
  arrivalsDepartures: { arrivals: number; departures: number }
  availLoading: boolean
}

// ─── Component ──────────────────────────────────────────────────────────────

const ToolbarKPIStrip = React.memo(function ToolbarKPIStrip({
  kpiTotals,
  arrivalsDepartures,
  availLoading,
}: ToolbarKPIStripProps) {
  const occPct = kpiTotals.total > 0 ? kpiTotals.occupancyPct : 0

  return (
    <div className="flex items-center gap-1.5 mr-2">

      {/* ─ Group 1: Occupancy ─ */}
      <div className="flex items-center gap-2 rounded-lg bg-accent/40 px-3 py-1.5">
        <div className="w-10 h-1.5 rounded-full bg-tl-border overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              occPct >= 90 ? 'bg-destructive' : occPct >= 70 ? 'bg-kpi-occ' : 'bg-tl-accent',
            )}
            style={{ width: `${occPct}%` }}
          />
        </div>
        <span className={cn(
          'text-sm font-bold tabular-nums leading-none',
          occPct >= 90 ? 'text-destructive' : occPct >= 70 ? 'text-kpi-occ' : 'text-tl-text',
        )}>
          {kpiTotals.total > 0 ? `${kpiTotals.occupied}/${kpiTotals.total}` : '—'}
        </span>
        <span className="text-xs text-tl-text-dim leading-none">เข้าพัก</span>
      </div>

      {kpiTotals.unassigned > 0 && (
        <div className="flex items-center gap-1.5 rounded-lg bg-kpi-pending-muted px-2.5 py-1.5">
          <Clock size={13} className="text-kpi-pending" />
          <span className="text-sm font-bold tabular-nums leading-none text-kpi-pending">
            {kpiTotals.unassigned}
          </span>
          <span className="text-xs text-kpi-pending/70 leading-none">รอกำหนด</span>
        </div>
      )}

      <div className="flex items-center gap-1.5 rounded-lg bg-accent/40 px-2.5 py-1.5">
        <span className={cn(
          'text-sm font-bold tabular-nums leading-none',
          kpiTotals.available === 0 ? 'text-destructive' : 'text-kpi-avl',
        )}>
          {availLoading ? '…' : kpiTotals.available}
        </span>
        <span className="text-xs text-tl-text-dim leading-none">ว่าง</span>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-tl-border mx-0.5" />

      {/* ─ Group 2: Operations ─ */}
      <div className="flex items-center gap-1.5 rounded-lg bg-accent/40 px-2.5 py-1.5">
        <LogIn size={13} className="text-kpi-arr" />
        <span className="text-sm font-bold tabular-nums leading-none text-kpi-arr">
          {arrivalsDepartures.arrivals}
        </span>
        <span className="text-xs text-tl-text-dim leading-none">เข้า</span>
      </div>

      <div className="flex items-center gap-1.5 rounded-lg bg-accent/40 px-2.5 py-1.5">
        <LogOut size={13} className="text-kpi-dep" />
        <span className="text-sm font-bold tabular-nums leading-none text-kpi-dep">
          {arrivalsDepartures.departures}
        </span>
        <span className="text-xs text-tl-text-dim leading-none">ออก</span>
      </div>
    </div>
  )
})

export default ToolbarKPIStrip
