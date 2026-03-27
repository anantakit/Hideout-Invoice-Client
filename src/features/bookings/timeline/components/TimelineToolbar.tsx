import React from 'react'
import { PanelRight } from 'lucide-react'
import { cn } from '@/shared/utils'
import type { RoomAvailability } from './AvailabilitySummary'
import type { ZoomLevel } from '../utils/timelineConstants'
import DateNavigation from './DateNavigation'
import ZoomControl from './ZoomControl'
import RoomTypeFilter from './RoomTypeFilter'
import ToolbarKPIStrip from './ToolbarKPIStrip'

// ─── Props ──────────────────────────────────────────────────────────────────

interface TimelineToolbarProps {
  /** Left edge of the visible viewport (the date the user "is on"). */
  visibleStartDate: Date

  /** Zoom */
  zoomLevel: ZoomLevel
  onZoomChange: (level: ZoomLevel) => void

  /** Navigation */
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onJumpToDate: (date: Date) => void
  /** Mobile: currently selected date (overrides visibleStartDate for display on mobile) */
  mobileSelectedDate?: Date

  /** Room type filter */
  selectedRoomTypeId: string | null
  onRoomTypeSelect: (id: string | null) => void
  roomAvailability: RoomAvailability[]

  /** KPI data */
  kpiTotals: { total: number; occupied: number; unassigned: number; available: number; occupancyPct: number }
  arrivalsDepartures: { arrivals: number; departures: number }
  availLoading: boolean

  /** Actions */
  onToggleOpsDrawer: () => void
  drawerMode: string | null

  /** Number of pending check-in tasks today (unassigned + assigned not checked in) */
  todayPendingCheckinCount?: number
}

// ─── Ops Drawer Button ──────────────────────────────────────────────────────

function OpsDrawerButton({
  onClick,
  drawerMode,
  pendingCount,
  className,
}: {
  onClick: () => void
  drawerMode: string | null
  pendingCount: number
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors',
        drawerMode === 'ops'
          ? 'bg-tl-accent text-white'
          : 'text-tl-text-dim hover:text-tl-text hover:bg-accent',
        className,
      )}
      aria-label="Operations panel"
    >
      <PanelRight size={18} />
      {pendingCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-micro-sm font-bold text-white tabular-nums">
          {pendingCount}
        </span>
      )}
    </button>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────

const TimelineToolbar = React.memo(function TimelineToolbar({
  visibleStartDate,
  zoomLevel,
  onZoomChange,
  onPrev,
  onNext,
  onToday,
  onJumpToDate,
  mobileSelectedDate,
  selectedRoomTypeId,
  onRoomTypeSelect,
  roomAvailability,
  kpiTotals,
  arrivalsDepartures,
  availLoading,
  onToggleOpsDrawer,
  drawerMode,
  todayPendingCheckinCount = 0,
}: TimelineToolbarProps) {
  return (
    <div className="tl-toolbar h-16 shrink-0 flex items-center border-b border-tl-border bg-tl-header">

      {/* ═══════ LEFT: Nav ═══════════════════════════════════════════════ */}
      <div className="flex items-center pl-4 md:pl-6 min-w-0 flex-1">
        <DateNavigation
          visibleStartDate={visibleStartDate}
          mobileSelectedDate={mobileSelectedDate}
          onPrev={onPrev}
          onNext={onNext}
          onToday={onToday}
          onJumpToDate={onJumpToDate}
        />
      </div>

      {/* ═══════ CENTER: Zoom + Filter ════════════════════════════════════ */}
      <div className="hidden md:flex items-center gap-3 px-5 flex-1 min-w-0">
        <ZoomControl zoomLevel={zoomLevel} onZoomChange={onZoomChange} />
        <RoomTypeFilter
          selectedRoomTypeId={selectedRoomTypeId}
          onRoomTypeSelect={onRoomTypeSelect}
          roomAvailability={roomAvailability}
        />
      </div>

      {/* ═══════ RIGHT: KPIs + Actions ═══════════════════════════════════ */}
      <div className="hidden lg:flex items-center gap-2 pr-4 shrink-0 h-full pl-3">
        <ToolbarKPIStrip
          kpiTotals={kpiTotals}
          arrivalsDepartures={arrivalsDepartures}
          availLoading={availLoading}
        />
        <OpsDrawerButton
          onClick={onToggleOpsDrawer}
          drawerMode={drawerMode}
          pendingCount={todayPendingCheckinCount}
        />
      </div>

      {/* ═══════ SM/MD fallback: actions when KPIs are hidden ═══════════ */}
      <div className="flex lg:hidden items-center gap-1.5 pr-4 shrink-0">
        <OpsDrawerButton
          onClick={onToggleOpsDrawer}
          drawerMode={drawerMode}
          pendingCount={todayPendingCheckinCount}
          className="hidden md:flex"
        />
      </div>
    </div>
  )
})

export default TimelineToolbar
