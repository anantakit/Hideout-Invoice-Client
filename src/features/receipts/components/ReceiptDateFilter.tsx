/**
 * ReceiptDateFilter — two-step date filter
 *
 * STEP 1  Quick filter bar (always visible)
 *         [ วันนี้ ] [ 7 วัน ] [ 30 วัน ] [ เดือนนี้ ] [ เลือกช่วงวันที่ ]
 *
 * STEP 2  Custom range picker
 *         Mobile  → bottom sheet with sticky footer
 *         Desktop → portal popover (position: fixed, createPortal)
 *
 * State rules (filtering logic untouched):
 *  - Preset chip → calls onRangeChange; custom-range button resets to label
 *  - Custom apply → calls onRangeChange; preset chips clear active state
 *  - Cancel → picker closes; applied filter unchanged
 *  - Clear ×  → calls onRangeChange('', ''); both clear
 */

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  format,
  startOfMonth,
  subDays,
  isSameDay, isBefore,
} from 'date-fns'
import { X } from 'lucide-react'
import { cn } from '../../../shared/utils'
import { Button } from '../../../shared/ui/button'
import { Sheet, SheetContent } from '../../../shared/ui/sheet'
import { Calendar } from '../../../shared/ui/calendar'

// ─── Thai month abbreviations (range preview text) ────────────────────────────

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.',
  'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.',
  'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toApiDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function fromApiDate(s: string): Date | null {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** "12 ก.พ. 2569" */
function formatShort(date: Date): string {
  return `${date.getDate()} ${THAI_MONTHS_SHORT[date.getMonth()]} ${date.getFullYear() + 543}`
}

/** "12 ก.พ. 2569 – 15 ก.พ. 2569" or just "12 ก.พ. 2569" for single-day */
function formatRange(start: Date, end: Date | null): string {
  if (!end || isSameDay(start, end)) return formatShort(start)
  return `${formatShort(start)} – ${formatShort(end)}`
}

// ─── Quick presets ────────────────────────────────────────────────────────────

interface Preset {
  label: string
  getRange: () => [Date, Date]
}

const QUICK_PRESETS: Preset[] = [
  { label: 'วันนี้',   getRange: () => { const t = new Date(); return [t, t] } },
  { label: '7 วัน',   getRange: () => [subDays(new Date(), 6), new Date()] },
  { label: '30 วัน',  getRange: () => [subDays(new Date(), 29), new Date()] },
  { label: 'เดือนนี้', getRange: () => [startOfMonth(new Date()), new Date()] },
]

// ─── Desktop portal popover ───────────────────────────────────────────────────

interface DesktopPopoverProps {
  triggerRef: React.RefObject<HTMLButtonElement>
  onClose: () => void
  children: React.ReactNode
}

function DesktopPopover({ triggerRef, onClose, children }: DesktopPopoverProps) {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const reposition = useCallback(() => {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    setCoords({ top: r.bottom + 8, left: r.left })
  }, [triggerRef])

  useLayoutEffect(() => { reposition() }, [reposition])

  useEffect(() => {
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [reposition])

  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) onClose()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onMouse)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouse)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose, triggerRef])

  if (!coords) return null

  return createPortal(
    <div
      ref={popoverRef}
      style={{ position: 'fixed', top: coords.top, left: coords.left, width: 380, zIndex: 50 }}
      className="bg-card rounded-3xl p-6 shadow-popover border border-border"
    >
      {children}
    </div>,
    document.body,
  )
}

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
          className="flex-1 min-h-[44px]"
          onClick={onCancel}
        >
          ยกเลิก
        </Button>
        <Button
          type="button"
          className="flex-1 min-h-[44px]"
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
  const customBtnRef = useRef<HTMLButtonElement>(null)

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

  /** Label of the quick-preset that matches the current applied range, else null. */
  const activePresetLabel: string | null = (() => {
    if (!startDate || !endDate) return null
    for (const preset of QUICK_PRESETS) {
      const [s, e] = preset.getRange()
      if (startDate === toApiDate(s) && endDate === toApiDate(e)) return preset.label
    }
    return null
  })()

  /** True when a range is applied that doesn't match any quick preset. */
  const isCustomActive = !!(startDate || endDate) && activePresetLabel === null

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
      <div className="relative">

        {/* Gradient scroll-hint — visible on mobile only (parent bg is bg-card) */}
        <div
          aria-hidden
          className="absolute right-0 top-0 bottom-0.5 w-10 bg-gradient-to-l from-card to-transparent pointer-events-none z-10 sm:hidden"
        />

        {/* Scrollable chip row — no wrap on mobile, wrap on desktop */}
        <div
          className="flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible pb-0.5 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none' }}
        >

          {/* Quick preset chips */}
          {QUICK_PRESETS.map(preset => {
            const isActive = activePresetLabel === preset.label
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className={cn(
                  'h-9 px-4 rounded-xl text-sm transition-all duration-150 shrink-0 whitespace-nowrap',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80',
                )}
              >
                {preset.label}
              </button>
            )
          })}

          {/* Custom range trigger */}
          <button
            ref={customBtnRef}
            type="button"
            onClick={openPicker}
            className={cn(
              'h-9 px-3 rounded-xl text-sm transition-all duration-150 shrink-0 whitespace-nowrap',
              'inline-flex items-center gap-1.5',
              isCustomActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground hover:bg-muted/80',
            )}
          >
            <span>{customBtnLabel ?? 'เลือกช่วงวันที่'}</span>

            {/* Clear × — only when a custom range is applied */}
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
        </div>
      </div>

      {/* ── PART 3: Active filter summary ────────────────────────────────────── */}
      {activeSummaryLabel && (
        <p className="text-body text-muted-foreground">
          กำลังแสดงข้อมูล:{' '}
          <span className="text-foreground font-medium">{activeSummaryLabel}</span>
        </p>
      )}

      {/* ── STEP 2a: Desktop portal popover ──────────────────────────────────── */}
      {!isMobile && pickerOpen && (
        <DesktopPopover triggerRef={customBtnRef} onClose={handleCancel}>
          <DesktopPicker
            {...bodyProps}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        </DesktopPopover>
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
                className="flex-1 min-h-[44px]"
                onClick={handleCancel}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                className="flex-1 min-h-[44px]"
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
