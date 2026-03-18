import { useState, useEffect } from 'react'
import {
  format,
  startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  addMonths, subMonths, subDays,
  isSameDay, isSameMonth,
  isBefore, isAfter,
  isToday,
} from 'date-fns'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Sheet, SheetContent } from '../../../shared/ui/sheet'
import { Popover, PopoverAnchor, PopoverContent } from '../../../shared/ui/popover'
import { Button } from '../../../shared/ui/button'
import { cn, THAI_MONTHS_FULL, fmtShortWithYear } from '../../../shared/utils'
const DAY_LABELS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']

// ─── Utilities ────────────────────────────────────────────────────────────────

function toApiDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function fromApiDate(s: string): Date | null {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const formatDisplayDate = fmtShortWithYear

function getCalendarWeeks(viewDate: Date): Date[][] {
  const monthStart = startOfMonth(viewDate)
  const monthEnd = endOfMonth(viewDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const weeks: Date[][] = []
  const cur = new Date(calStart)
  while (cur <= calEnd) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

// ─── Presets ─────────────────────────────────────────────────────────────────

interface Preset { label: string; getRange: () => [Date, Date] }

const QUICK_PRESETS: Preset[] = [
  { label: 'วันนี้',   getRange: () => { const t = new Date(); return [t, t] } },
  { label: '7 วัน',   getRange: () => [subDays(new Date(), 6), new Date()] },
  { label: '30 วัน',  getRange: () => [subDays(new Date(), 29), new Date()] },
  { label: 'เดือนนี้', getRange: () => [startOfMonth(new Date()), new Date()] },
]

const PICKER_PRESETS: Preset[] = [
  ...QUICK_PRESETS,
  {
    label: 'เดือนที่แล้ว',
    getRange: () => {
      const last = subMonths(new Date(), 1)
      return [startOfMonth(last), endOfMonth(last)]
    },
  },
]

// ─── Calendar Grid ────────────────────────────────────────────────────────────

interface CalendarGridProps {
  pendingStart: Date | null
  pendingEnd: Date | null
  hoveredDate: Date | null
  onDayClick: (date: Date) => void
  onDayHover: (date: Date | null) => void
  compact?: boolean
}

function CalendarGrid({
  pendingStart, pendingEnd, hoveredDate,
  onDayClick, onDayHover,
  compact = false,
}: CalendarGridProps) {
  const [viewDate, setViewDate] = useState(new Date())
  const weeks = getCalendarWeeks(viewDate)

  const effectiveEnd =
    pendingEnd ??
    (pendingStart && hoveredDate && !isBefore(hoveredDate, pendingStart) ? hoveredDate : null)

  const isMultiDay = !!(pendingStart && effectiveEnd && !isSameDay(pendingStart, effectiveEnd))

  // Size tokens: compact = desktop (smaller), full = mobile (44px tap targets)
  const cellH  = compact ? 'h-9'    : 'h-11'
  const btnSz  = compact ? 'w-8 h-8' : 'w-11 h-11'
  const navPad = compact ? 'p-1.5'  : 'p-2.5'
  const navIcon = compact ? 'w-4 h-4' : 'w-5 h-5'
  const monthTextSz = compact ? 'text-sm' : 'text-base'

  return (
    <div className="select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setViewDate(v => subMonths(v, 1))}
          className={cn('radius-button hover:bg-accent transition-colors', navPad)}
        >
          <ChevronLeft className={cn('text-muted-foreground', navIcon)} />
        </button>
        <span className={cn('font-medium text-foreground', monthTextSz)}>
          {THAI_MONTHS_FULL[viewDate.getMonth()]} {viewDate.getFullYear() + 543}
        </span>
        <button
          type="button"
          onClick={() => setViewDate(v => addMonths(v, 1))}
          className={cn('radius-button hover:bg-accent transition-colors', navPad)}
        >
          <ChevronRight className={cn('text-muted-foreground', navIcon)} />
        </button>
      </div>

      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(label => (
          <div key={label} className="text-center text-xs font-medium text-muted-foreground py-1">
            {label}
          </div>
        ))}
      </div>

      {/* Day grid */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((day, di) => {
            const inCurrentMonth = isSameMonth(day, viewDate)
            const isStart = pendingStart ? isSameDay(day, pendingStart) : false
            const isEnd   = effectiveEnd ? isSameDay(day, effectiveEnd) : false
            const inRange =
              isMultiDay &&
              isAfter(day, pendingStart!) &&
              isBefore(day, effectiveEnd!)
            const dayIsToday = isToday(day)

            return (
              <div key={di} className={cn('relative flex items-center justify-center', cellH)}>
                {/* Range connecting bar */}
                {inRange && (
                  <div className="absolute inset-y-1.5 inset-x-0 bg-accent" />
                )}
                {isStart && isMultiDay && (
                  <div className="absolute inset-y-1.5 left-1/2 right-0 bg-accent" />
                )}
                {isEnd && isMultiDay && (
                  <div className="absolute inset-y-1.5 right-1/2 left-0 bg-accent" />
                )}

                {/* Day button */}
                <button
                  type="button"
                  disabled={!inCurrentMonth}
                  onClick={() => onDayClick(day)}
                  onMouseEnter={() => onDayHover(day)}
                  onMouseLeave={() => onDayHover(null)}
                  className={cn(
                    'relative z-10 flex items-center justify-center text-sm radius-badge transition-colors',
                    btnSz,
                    !inCurrentMonth && 'text-muted-foreground/25 pointer-events-none',
                    inCurrentMonth && !isStart && !isEnd && dayIsToday &&
                      'ring-1 ring-primary/40 font-semibold text-primary',
                    inCurrentMonth && !isStart && !isEnd && 'hover:bg-accent',
                    (isStart || isEnd) && 'date-selected font-medium',
                  )}
                >
                  {format(day, 'd')}
                </button>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Picker Inner (presets + calendar — no action buttons) ────────────────────

interface PickerInnerProps {
  pendingStart: Date | null
  pendingEnd: Date | null
  hoveredDate: Date | null
  onDayClick: (date: Date) => void
  onDayHover: (date: Date | null) => void
  onPresetApply: (preset: Preset) => void
  compact?: boolean
}

function PickerInner({
  pendingStart, pendingEnd, hoveredDate,
  onDayClick, onDayHover, onPresetApply,
  compact = false,
}: PickerInnerProps) {
  return (
    <div>
      {/* Preset list */}
      {PICKER_PRESETS.map(preset => (
        <button
          key={preset.label}
          type="button"
          onClick={() => onPresetApply(preset)}
          className={cn(
            'w-full text-left px-3 rounded-xl text-sm hover:bg-accent transition-colors text-foreground',
            compact ? 'py-2' : 'touch-target flex items-center py-3',
          )}
        >
          {preset.label}
        </button>
      ))}

      <div className="border-t border-border my-3" />

      <p className="text-helper px-1 pb-2">หรือเลือกเอง:</p>

      <CalendarGrid
        pendingStart={pendingStart}
        pendingEnd={pendingEnd}
        hoveredDate={hoveredDate}
        onDayClick={onDayClick}
        onDayHover={onDayHover}
        compact={compact}
      />
    </div>
  )
}

// ─── DateRangeFilter ──────────────────────────────────────────────────────────

export interface DateRangeFilterProps {
  startDate: string
  endDate: string
  onRangeChange: (start: string, end: string) => void
}

export function DateRangeFilter({ startDate, endDate, onRangeChange }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [pendingStart, setPendingStart] = useState<Date | null>(null)
  const [pendingEnd, setPendingEnd] = useState<Date | null>(null)
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)

  // Track viewport
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Close picker when crossing the mobile/desktop boundary
  useEffect(() => {
    if (isOpen) setIsOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile])

  // Body scroll lock while mobile sheet is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isMobile, isOpen])

  const handleOpen = () => {
    setPendingStart(fromApiDate(startDate))
    setPendingEnd(fromApiDate(endDate))
    setIsOpen(true)
  }

  const handleConfirm = () => {
    if (pendingStart) {
      onRangeChange(toApiDate(pendingStart), toApiDate(pendingEnd ?? pendingStart))
    }
    setIsOpen(false)
  }

  const handleCancel = () => setIsOpen(false)

  const handleDayClick = (day: Date) => {
    if (!pendingStart || pendingEnd || isBefore(day, pendingStart)) {
      setPendingStart(day)
      setPendingEnd(null)
    } else {
      setPendingEnd(day)
    }
  }

  // Quick chips: apply immediately (outside picker)
  const applyQuickPreset = (preset: Preset) => {
    const [s, e] = preset.getRange()
    onRangeChange(toApiDate(s), toApiDate(e))
  }

  // Presets inside picker: apply + auto-close
  const applyPickerPreset = (preset: Preset) => {
    const [s, e] = preset.getRange()
    onRangeChange(toApiDate(s), toApiDate(e))
    setIsOpen(false)
  }

  // Trigger button display text
  const startDateObj = fromApiDate(startDate)
  const endDateObj   = fromApiDate(endDate)
  const displayText =
    startDateObj && endDateObj
      ? isSameDay(startDateObj, endDateObj)
        ? formatDisplayDate(startDateObj)
        : `${formatDisplayDate(startDateObj)} – ${formatDisplayDate(endDateObj)}`
      : startDateObj
      ? formatDisplayDate(startDateObj)
      : null

  const hasRange = !!(startDate || endDate)

  const innerProps = {
    pendingStart, pendingEnd, hoveredDate,
    onDayClick: handleDayClick,
    onDayHover: setHoveredDate,
    onPresetApply: applyPickerPreset,
  }

  return (
    <div className="space-y-3">
      {/* Section label */}
      <p className="text-helper uppercase tracking-wide">ช่วงวันที่ออกใบเสร็จ</p>

      {/* Quick range chips */}
      <div className="flex gap-2 flex-wrap">
        {QUICK_PRESETS.map(preset => {
          const [s, e] = preset.getRange()
          const isActive = startDate === toApiDate(s) && endDate === toApiDate(e)
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyQuickPreset(preset)}
              className={cn(
                'radius-badge px-3 py-1.5 text-xs border transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:border-primary/40 hover:bg-accent/60',
              )}
            >
              {preset.label}
            </button>
          )
        })}
      </div>

      {/* Trigger button + Desktop Popover */}
      <Popover open={!isMobile && isOpen} onOpenChange={(v) => { if (!v) handleCancel() }}>
        <PopoverAnchor asChild>
          <button
            type="button"
            onClick={handleOpen}
            className={cn(
              'w-full h-11 rounded-xl border px-4',
              'flex justify-between items-center gap-2',
              'text-body transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring',
              hasRange
                ? 'bg-accent/60 border-primary/30 text-foreground'
                : 'bg-background border-border text-muted-foreground hover:bg-accent/40',
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span className="truncate">{displayText ?? 'เลือกช่วงวันที่'}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {hasRange && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="ล้างวันที่"
                  onClick={e => { e.stopPropagation(); onRangeChange('', '') }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); onRangeChange('', '') } }}
                  className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </span>
              )}
              <ChevronDown
                className={cn(
                  'w-4 h-4 transition-transform duration-200',
                  !isMobile && isOpen && 'rotate-180',
                )}
              />
            </div>
          </button>
        </PopoverAnchor>

        <PopoverContent className="w-[340px] p-4" align="start" sideOffset={8}>
          <PickerInner {...innerProps} compact={true} />
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={handleCancel}>
              ยกเลิก
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleConfirm}
              disabled={!pendingStart}
            >
              ยืนยัน
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* ── Mobile: bottom sheet with sticky footer ── */}
      {isMobile && (
        <Sheet open={isOpen} onOpenChange={open => !open && setIsOpen(false)}>
          <SheetContent side="bottom" className="rounded-t-2xl p-0 flex flex-col max-h-[90vh]">
            {/* Header — pr-14 leaves room for the built-in X button */}
            <div className="px-6 pt-6 pb-4 shrink-0 pr-14">
              <h3 className="text-base font-semibold text-foreground">เลือกช่วงวันที่</h3>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 pb-2">
              <PickerInner {...innerProps} compact={false} />
            </div>

            {/* Sticky confirm / cancel footer */}
            <div className="shrink-0 border-t border-border bg-card px-6 py-4 flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11"
                onClick={handleCancel}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                className="flex-1 h-11"
                onClick={handleConfirm}
                disabled={!pendingStart}
              >
                ยืนยัน
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
