/**
 * ReceiptDateFilter — two-step date filter
 *
 * STEP 1  Quick filter bar (always visible)
 *         [ วันนี้ ] [ 7 วัน ] [ 30 วัน ] [ เดือนนี้ ] [ เลือกช่วงวันที่ ]
 *
 * STEP 2  Custom range picker
 *         Mobile  → bottom sheet with sticky footer
 *         Desktop → Radix Popover (auto-positioned, portaled)
 *
 * State rules (filtering logic untouched):
 *  - Preset chip → calls onRangeChange; custom-range button resets to label
 *  - Custom apply → calls onRangeChange; preset chips clear active state
 *  - Cancel → picker closes; applied filter unchanged
 *  - Clear ×  → calls onRangeChange('', ''); both clear
 */

import { useState, useEffect } from 'react'
import {
  format,
  startOfMonth,
  subDays,
  isSameDay, isBefore,
} from 'date-fns'
import { X } from 'lucide-react'
import { cn, fmtShortWithYear } from '../../../shared/utils'
import { FilterChipBar } from '../../../shared/ui/FilterChipBar'
import { Button } from '../../../shared/ui/button'
import { Sheet, SheetContent } from '../../../shared/ui/sheet'
import { Popover, PopoverContent, PopoverTrigger } from '../../../shared/ui/popover'
import { Calendar } from '../../../shared/ui/calendar'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toApiDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function fromApiDate(s: string): Date | null {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** "12 ก.พ. 2569 – 15 ก.พ. 2569" or just "12 ก.พ. 2569" for single-day */
function formatRange(start: Date, end: Date | null): string {
  if (!end || isSameDay(start, end)) return fmtShortWithYear(start)
  return `${fmtShortWithYear(start)} – ${fmtShortWithYear(end)}`
}

// ─── Quick presets ────────────────────────────────────────────────────────────

interface Preset {
  key: string
  label: string
  getRange: () => [Date, Date]
}

const QUICK_PRESETS: Preset[] = [
  { key: 'today',      label: 'วันนี้',   getRange: () => { const t = new Date(); return [t, t] } },
  { key: '7d',         label: '7 วัน',   getRange: () => [subDays(new Date(), 6), new Date()] },
  { key: '30d',        label: '30 วัน',  getRange: () => [subDays(new Date(), 29), new Date()] },
  { key: 'this_month', label: 'เดือนนี้', getRange: () => [startOfMonth(new Date()), new Date()] },
]


// ─── Picker body (calendar + range preview) ───────────────────────────────────
// Shared between desktop popover and mobile sheet.
// Does NOT include title or action buttons — callers place those differently.

interface PickerBodyProps {
  pendingStart: Date | null
  pendingEnd: Date | null
  hoveredDate: Date | null
  onDayClick: (date: Date) => void
  onDayHover: (date: Date | null) => void
}

function PickerBody({ pendingStart, pendingEnd, hoveredDate, onDayClick, onDayHover }: PickerBodyProps) {
  const rangeLabel = pendingStart
    ? formatRange(pendingStart, pendingEnd)
    : null

  return (
    <div className="space-y-4">
      <Calendar
        pendingStart={pendingStart}
        pendingEnd={pendingEnd}
        hoveredDate={hoveredDate}
        onDayClick={onDayClick}
        onDayHover={onDayHover}
      />

      {/* Range preview block — always visible so layout doesn't jump */}
      <div
        className={cn(
          'bg-muted radius-card p-3 text-body text-center transition-colors duration-150',
          rangeLabel ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {rangeLabel ?? 'เลือกวันเริ่มต้น…'}
      </div>
    </div>
  )
}

// ─── Desktop picker content (title + body + actions in one column) ────────────

interface DesktopPickerProps extends PickerBodyProps {
  onConfirm: () => void
  onCancel: () => void
}

function DesktopPicker({ onConfirm, onCancel, ...bodyProps }: DesktopPickerProps) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-center text-base font-semibold text-foreground">
        เลือกช่วงวันที่
      </h2>
      <PickerBody {...bodyProps} />
      <div className="flex gap-3">
        <Button
          type="button"
          variant="ghost"
          className="flex-1 touch-target"
          onClick={onCancel}
        >
          ยกเลิก
        </Button>
        <Button
          type="button"
          className="flex-1 touch-target"
          onClick={onConfirm}
          disabled={!bodyProps.pendingStart}
        >
          ใช้ช่วงนี้
        </Button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface ReceiptDateFilterProps {
  startDate: string
  endDate: string
  onRangeChange: (start: string, end: string) => void
}

export function ReceiptDateFilter({ startDate, endDate, onRangeChange }: ReceiptDateFilterProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [isMobile, setIsMobile]     = useState(() => window.innerWidth < 768)
  const [pendingStart, setPendingStart] = useState<Date | null>(null)
  const [pendingEnd,   setPendingEnd]   = useState<Date | null>(null)
  const [hoveredDate,  setHoveredDate]  = useState<Date | null>(null)

  // Track viewport breakpoint
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Close picker when crossing mobile / desktop boundary
  useEffect(() => {
    if (pickerOpen) setPickerOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile])

  // Body scroll lock while mobile sheet is open
  useEffect(() => {
    if (isMobile && pickerOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isMobile, pickerOpen])

  // ── Derived active state (computed every render, no extra state) ──────────

  /** Key of the quick-preset that matches the current applied range, else null. */
  const activePresetKey: string | null = (() => {
    if (!startDate || !endDate) return null
    for (const preset of QUICK_PRESETS) {
      const [s, e] = preset.getRange()
      if (startDate === toApiDate(s) && endDate === toApiDate(e)) return preset.key
    }
    return null
  })()

  /** True when a range is applied that doesn't match any quick preset. */
  const isCustomActive = !!(startDate || endDate) && activePresetKey === null

  /**
   * Label shown INSIDE the "เลือกช่วงวันที่" button when a custom range is active.
   * Null → show default label.
   */
  const customBtnLabel: string | null = isCustomActive
    ? formatRange(fromApiDate(startDate)!, fromApiDate(endDate))
    : null

  /**
   * Summary text shown below the filter bar whenever any date filter is active.
   * Null → summary row is hidden.
   */
  const activeSummaryLabel: string | null = (() => {
    const s = fromApiDate(startDate)
    if (!s) return null
    return formatRange(s, fromApiDate(endDate))
  })()

  // ── Handlers (filtering logic unchanged) ─────────────────────────────────

  const applyPreset = (preset: Preset) => {
    const [s, e] = preset.getRange()
    onRangeChange(toApiDate(s), toApiDate(e))
  }

  const clearCustomRange = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    onRangeChange('', '')
  }

  const openPicker = () => {
    setPendingStart(fromApiDate(startDate))
    setPendingEnd(fromApiDate(endDate))
    setHoveredDate(null)
    setPickerOpen(true)
  }

  const handleConfirm = () => {
    if (pendingStart) {
      onRangeChange(
        toApiDate(pendingStart),
        toApiDate(pendingEnd ?? pendingStart),
      )
    }
    setPickerOpen(false)
  }

  const handleCancel = () => setPickerOpen(false)

  const handleDayClick = (day: Date) => {
    if (!pendingStart || pendingEnd || isBefore(day, pendingStart)) {
      setPendingStart(day)
      setPendingEnd(null)
    } else {
      setPendingEnd(day)
    }
  }

  const bodyProps: PickerBodyProps = {
    pendingStart, pendingEnd, hoveredDate,
    onDayClick: handleDayClick,
    onDayHover: setHoveredDate,
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">

      {/* ── STEP 1: Quick filter bar ─────────────────────────────────────────── */}
      <FilterChipBar
        chips={QUICK_PRESETS}
        activeKey={activePresetKey ?? ''}
        onSelect={(key) => {
          const preset = QUICK_PRESETS.find((p) => p.key === key)
          if (preset) applyPreset(preset)
        }}
      >
        {/* Custom range trigger — rendered after preset chips */}
        {isMobile ? (
          <button
            type="button"
            onClick={openPicker}
            className={cn(
              'h-8 px-3.5 rounded-lg text-[13px] font-medium transition-all duration-150 shrink-0 whitespace-nowrap',
              'inline-flex items-center gap-1.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isCustomActive
                ? 'bg-primary text-primary-foreground shadow-active-chip'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/60 active:bg-accent/80',
            )}
          >
            <span>{customBtnLabel ?? 'เลือกช่วงวันที่'}</span>
            {isCustomActive && (
              <span
                role="button"
                tabIndex={0}
                aria-label="ล้างช่วงวันที่"
                onClick={clearCustomRange}
                onKeyDown={e => e.key === 'Enter' && clearCustomRange(e)}
                className={cn(
                  'flex items-center justify-center w-4 h-4 radius-badge shrink-0',
                  'bg-primary-foreground/20 hover:bg-primary-foreground/35',
                  'transition-colors duration-150',
                )}
              >
                <X className="w-2.5 h-2.5" />
              </span>
            )}
          </button>
        ) : (
          <Popover open={pickerOpen} onOpenChange={(v) => { if (!v) handleCancel() }}>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={openPicker}
                className={cn(
                  'h-8 px-3.5 rounded-lg text-[13px] font-medium transition-all duration-150 shrink-0 whitespace-nowrap',
                  'inline-flex items-center gap-1.5',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isCustomActive
                    ? 'bg-primary text-primary-foreground shadow-active-chip'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/60 active:bg-accent/80',
                )}
              >
                <span>{customBtnLabel ?? 'เลือกช่วงวันที่'}</span>
                {isCustomActive && (
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="ล้างช่วงวันที่"
                    onClick={clearCustomRange}
                    onKeyDown={e => e.key === 'Enter' && clearCustomRange(e)}
                    className={cn(
                      'flex items-center justify-center w-4 h-4 radius-badge shrink-0',
                      'bg-primary-foreground/20 hover:bg-primary-foreground/35',
                      'transition-colors duration-150',
                    )}
                  >
                    <X className="w-2.5 h-2.5" />
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[380px] p-6" align="start" sideOffset={8}>
              <DesktopPicker
                {...bodyProps}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
              />
            </PopoverContent>
          </Popover>
        )}
      </FilterChipBar>

      {/* ── PART 3: Active filter summary ────────────────────────────────────── */}
      {activeSummaryLabel && (
        <p className="text-body text-muted-foreground">
          กำลังแสดงข้อมูล:{' '}
          <span className="text-foreground font-medium">{activeSummaryLabel}</span>
        </p>
      )}

      {/* ── STEP 2b: Mobile bottom sheet ─────────────────────────────────────── */}
      {isMobile && (
        <Sheet open={pickerOpen} onOpenChange={open => !open && setPickerOpen(false)}>
          <SheetContent side="bottom" className="rounded-t-2xl p-0 flex flex-col max-h-[90vh]">

            {/* Header — pr-14 leaves room for the built-in × close button */}
            <div className="shrink-0 px-6 pt-6 pb-0 pr-14">
              <h3 className="text-center text-base font-semibold text-foreground">
                เลือกช่วงวันที่
              </h3>
            </div>

            {/* Scrollable calendar + preview */}
            <div className="overflow-y-auto flex-1 px-6 pt-5 pb-2">
              <PickerBody {...bodyProps} />
            </div>

            {/* Sticky action footer */}
            <div className="shrink-0 px-6 pb-8 pt-4 flex gap-3 border-t border-border bg-card">
              <Button
                type="button"
                variant="ghost"
                className="flex-1 touch-target"
                onClick={handleCancel}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                className="flex-1 touch-target"
                onClick={handleConfirm}
                disabled={!pendingStart}
              >
                ใช้ช่วงนี้
              </Button>
            </div>

          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}

// Backward-compat alias so existing imports keep working
export { ReceiptDateFilter as DateRangeFilter }
