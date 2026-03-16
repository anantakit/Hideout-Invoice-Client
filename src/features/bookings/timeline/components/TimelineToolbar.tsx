import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  PanelRight,
  LogIn,
  LogOut,
  Clock,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet'
import { Calendar } from '@/shared/ui/calendar'
import { cn, THAI_MONTHS_FULL, todayISO } from '@/shared/utils'
import type { RoomAvailability } from './AvailabilitySummary'
import { ZOOM_CONFIG, type ZoomLevel } from './timelineConstants'

const noop = () => {}

// ─── Thai helpers ────────────────────────────────────────────────────────────

const EN_MONTHS_SHORT = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
]

function fmtHeaderDate(d: Date): string {
  return `${d.getDate()} ${EN_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

// ─── DatePickerContent (shared between desktop dropdown and mobile sheet) ────

function DatePickerContent({
  displayDate,
  monthOptions,
  onDayClick,
  onMonthJump,
  mobile,
}: {
  displayDate: Date
  monthOptions: { label: string; value: string }[]
  onDayClick: (date: Date) => void
  onMonthJump: (value: string) => void
  mobile?: boolean
}) {
  const labelCls = mobile
    ? 'text-[11px] text-muted-foreground mb-2 uppercase tracking-wider font-medium'
    : 'text-[11px] text-tl-text-dim mb-1.5 uppercase tracking-wider font-medium'
  const btnCls = mobile
    ? 'text-[11px] px-2 py-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors text-center truncate'
    : 'text-[11px] px-1.5 py-1 rounded hover:bg-accent text-tl-text-dim hover:text-tl-text transition-colors text-center truncate'
  const gridCls = mobile ? 'grid grid-cols-3 gap-1.5' : 'grid grid-cols-3 gap-1'
  const separatorCls = mobile ? 'mt-4 pt-3 border-t border-border' : 'border-t border-tl-border px-3 pb-2.5 pt-2'

  // Single delegated handler — no closure per button
  const handleMonthClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const value = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-month]')?.dataset.month
    if (value) onMonthJump(value)
  }, [onMonthJump])

  return (
    <>
      <div className={mobile ? undefined : 'p-3 w-72'}>
        <Calendar
          pendingStart={displayDate}
          pendingEnd={null}
          hoveredDate={null}
          onDayClick={onDayClick}
          onDayHover={noop}
          initialViewDate={displayDate}
        />
      </div>
      <div className={separatorCls}>
        <p className={labelCls}>ข้ามไปเดือน</p>
        <div className={gridCls} onClick={handleMonthClick}>
          {monthOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              data-month={opt.value}
              className={btnCls}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Props ───────────────────────────────────────────────────────────────────

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

// ─── Shared styles ───────────────────────────────────────────────────────────

const NAV_BTN = 'w-8 h-8 flex items-center justify-center rounded-lg text-tl-text-dim hover:text-tl-text hover:bg-accent transition-colors'

// ─── Component ───────────────────────────────────────────────────────────────

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
  // ── Mobile detection ───────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  const displayDate = (isMobile && mobileSelectedDate) ? mobileSelectedDate : visibleStartDate

  // ── Date picker ──────────────────────────────────────────────────────────
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const datePickerRef = useRef<HTMLDivElement>(null)

  // Close desktop dropdown on outside click (mobile uses Sheet which handles its own close)
  useEffect(() => {
    if (!datePickerOpen || isMobile) return
    const handler = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setDatePickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [datePickerOpen, isMobile])

  const handleJumpToDate = useCallback(
    (date: Date) => {
      onJumpToDate(date)
      setDatePickerOpen(false)
    },
    [onJumpToDate],
  )

  // ── Month jump options ───────────────────────────────────────────────────
  const monthOptions = useMemo(() => {
    const now = new Date()
    const result: { value: string; label: string }[] = []
    for (let i = -2; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      result.push({
        value: format(d, 'yyyy-MM-dd'),
        label: `${THAI_MONTHS_FULL[d.getMonth()]} ${d.getFullYear() + 543}`,
      })
    }
    return result
  }, [])

  const handleMonthJump = useCallback(
    (isoDate: string) => {
      const [y, m] = isoDate.split('-').map(Number)
      const target = new Date(y, m - 1, 1)
      onJumpToDate(target)
      setDatePickerOpen(false)
    },
    [onJumpToDate],
  )

  // ── Check if start date is today ─────────────────────────────────────────
  const isToday = useMemo(
    () => format(displayDate, 'yyyy-MM-dd') === todayISO(),
    [displayDate],
  )

  // ── Occupancy bar width ─────────────────────────────────────────────────
  const occPct = kpiTotals.total > 0 ? kpiTotals.occupancyPct : 0

  return (
    <div className="tl-toolbar h-16 shrink-0 flex items-center border-b border-tl-border bg-tl-header">

      {/* ═══════ LEFT: Nav ═══════════════════════════════════════════════ */}
      <div className="flex items-center gap-2 md:gap-4 pl-4 md:pl-6 min-w-0 flex-1">

        {/* Today pill */}
        <button
          type="button"
          onClick={onToday}
          className={cn(
            'shrink-0 h-8 px-3.5 radius-badge text-body font-medium transition-colors',
            'border border-tl-border',
            isToday
              ? 'bg-tl-accent/10 text-tl-accent border-tl-accent/30'
              : 'text-tl-text-dim hover:text-tl-text hover:bg-accent',
          )}
        >
          วันนี้
        </button>

        {/* Date navigation group */}
        <div className="flex items-center">
          <button type="button" onClick={onPrev} className={NAV_BTN} aria-label="Previous">
            <ChevronLeft size={18} />
          </button>

          <div className="relative" ref={datePickerRef}>
            <button
              type="button"
              onClick={() => setDatePickerOpen((v) => !v)}
              className={cn(
                'h-9 px-3 flex items-center gap-2 radius-button transition-colors',
                'hover:bg-accent',
                datePickerOpen && 'bg-accent',
              )}
            >
              <CalendarIcon size={16} className="text-tl-text-dim shrink-0" />
              <span className="text-lg font-semibold text-tl-text tabular-nums whitespace-nowrap">
                {fmtHeaderDate(displayDate)}
              </span>
            </button>

            {/* Desktop: absolute dropdown */}
            {datePickerOpen && !isMobile && (
              <div className="absolute left-0 top-full mt-2 z-50 bg-tl-header border border-tl-border rounded-xl shadow-popover overflow-hidden">
                <DatePickerContent
                  displayDate={displayDate}
                  monthOptions={monthOptions}
                  onDayClick={handleJumpToDate}
                  onMonthJump={handleMonthJump}
                />
              </div>
            )}

            {/* Mobile: bottom Sheet */}
            {isMobile && (
              <Sheet open={datePickerOpen} onOpenChange={(v) => { if (!v) setDatePickerOpen(false) }}>
                <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-0 flex flex-col max-h-[85vh]">
                  <SheetHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
                    <SheetTitle className="text-base font-semibold tracking-tight text-left">
                      เลือกวันที่
                    </SheetTitle>
                    <SheetDescription className="sr-only">
                      เลือกวันที่จากปฏิทินเพื่อข้ามไปยังวันนั้น
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6">
                    <DatePickerContent
                      displayDate={displayDate}
                      monthOptions={monthOptions}
                      onDayClick={handleJumpToDate}
                      onMonthJump={handleMonthJump}
                      mobile
                    />
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>

          <button type="button" onClick={onNext} className={NAV_BTN} aria-label="Next">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* ═══════ CENTER: Zoom + Filter ════════════════════════════════════ */}
      <div className="hidden md:flex items-center gap-3 px-5 flex-1 min-w-0">

        {/* Zoom segmented control */}
        <div className="flex items-center h-9 bg-accent/50 rounded-lg p-0.5 gap-0.5">
          {(['3d', '7d', '14d'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => onZoomChange(level)}
              className={cn(
                'px-3.5 h-8 rounded-md text-sm font-medium transition-all',
                zoomLevel === level
                  ? 'bg-tl-accent text-white shadow-sm'
                  : 'text-tl-text-dim hover:text-tl-text',
              )}
            >
              {ZOOM_CONFIG[level].label}
            </button>
          ))}
        </div>

        {/* Room type filter */}
        <Select
          value={selectedRoomTypeId ?? '__all__'}
          onValueChange={(v) => onRoomTypeSelect(v === '__all__' ? null : v)}
        >
          <SelectTrigger className="h-8 w-auto min-w-[7rem] text-sm rounded-lg bg-accent/40 border-0 shadow-none px-3 py-1 text-tl-text-dim hover:text-tl-text focus:ring-0 focus:ring-offset-0">
            <SelectValue placeholder="ทุกประเภท" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">ทุกประเภท</SelectItem>
            {roomAvailability.map((rt) => (
              <SelectItem key={rt.room_type_id} value={rt.room_type_id}>
                {rt.room_type_name} ({rt.available_rooms})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ═══════ RIGHT: KPIs (compact inline) + Actions ═══════════════ */}
      <div className="hidden lg:flex items-center gap-2 pr-4 shrink-0 h-full pl-3">

        {/* KPI pills — grouped: occupancy | operations */}
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
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-2.5 py-1.5">
              <Clock size={13} className="text-amber-400" />
              <span className="text-sm font-bold tabular-nums leading-none text-amber-400">
                {kpiTotals.unassigned}
              </span>
              <span className="text-xs text-amber-400/70 leading-none">รอกำหนด</span>
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

        <button
          type="button"
          onClick={onToggleOpsDrawer}
          className={cn(
            'relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors',
            drawerMode === 'ops'
              ? 'bg-tl-accent text-white'
              : 'text-tl-text-dim hover:text-tl-text hover:bg-accent',
          )}
          aria-label="Operations panel"
        >
          <PanelRight size={18} />
          {todayPendingCheckinCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-bold text-white tabular-nums">
              {todayPendingCheckinCount}
            </span>
          )}
        </button>
      </div>

      {/* ═══════ SM/MD fallback: actions when KPIs are hidden ═══════════ */}
      <div className="flex lg:hidden items-center gap-1.5 pr-4 shrink-0">
        <button
          type="button"
          onClick={onToggleOpsDrawer}
          className={cn(
            'relative w-9 h-9 items-center justify-center rounded-lg transition-colors hidden md:flex',
            drawerMode === 'ops'
              ? 'bg-tl-accent text-white'
              : 'text-tl-text-dim hover:text-tl-text hover:bg-accent',
          )}
          aria-label="Operations panel"
        >
          <PanelRight size={18} />
          {todayPendingCheckinCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-bold text-white tabular-nums">
              {todayPendingCheckinCount}
            </span>
          )}
        </button>
      </div>
    </div>
  )
})

export default TimelineToolbar
