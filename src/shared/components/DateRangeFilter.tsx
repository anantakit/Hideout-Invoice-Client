import { isSameDay, startOfMonth, subDays } from 'date-fns'
import { X } from 'lucide-react'
import { cn, fmtShortWithYear } from '@/shared/utils'
import { FilterChipBar } from '@/shared/ui/FilterChipBar'
import { Button } from '@/shared/ui/button'
import { Sheet, SheetContent } from '@/shared/ui/sheet'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { Calendar } from '@/shared/ui/calendar'
import { useDateRangeFilter, toApiDate, fromApiDate } from '@/shared/hooks/useDateRangeFilter'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DateRangePreset {
  key: string
  label: string
  getRange: () => [Date, Date]
}

export interface DateRangeFilterProps {
  startDate: string
  endDate: string
  onRangeChange: (start: string, end: string) => void
  /** Override default presets. Pass [] to hide chip bar. */
  presets?: DateRangePreset[]
  /** Show summary line below filter bar. Default true. */
  showSummary?: boolean
}

// ─── Default presets ─────────────────────────────────────────────────────────

const DEFAULT_PRESETS: DateRangePreset[] = [
  { key: 'today',      label: 'วันนี้',   getRange: () => { const t = new Date(); return [t, t] } },
  { key: '7d',         label: '7 วัน',   getRange: () => [subDays(new Date(), 6), new Date()] },
  { key: '30d',        label: '30 วัน',  getRange: () => [subDays(new Date(), 29), new Date()] },
  { key: 'this_month', label: 'เดือนนี้', getRange: () => [startOfMonth(new Date()), new Date()] },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRange(start: Date, end: Date | null): string {
  if (!end || isSameDay(start, end)) return fmtShortWithYear(start)
  return `${fmtShortWithYear(start)} – ${fmtShortWithYear(end)}`
}

// ─── Picker body (calendar + range preview) ──────────────────────────────────

interface PickerBodyProps {
  pendingStart: Date | null
  pendingEnd: Date | null
  hoveredDate: Date | null
  onDayClick: (date: Date) => void
  onDayHover: (date: Date | null) => void
}

function PickerBody(p: PickerBodyProps) {
  const rangeLabel = p.pendingStart ? formatRange(p.pendingStart, p.pendingEnd) : null
  return (
    <div className="space-y-4">
      <Calendar {...p} />
      <div className={cn(
        'bg-muted radius-card p-3 text-body text-center transition-colors duration-150',
        rangeLabel ? 'text-foreground' : 'text-muted-foreground',
      )}>
        {rangeLabel ?? 'เลือกวันเริ่มต้น…'}
      </div>
    </div>
  )
}

// ─── Desktop picker (title + body + actions) ─────────────────────────────────

function DesktopPicker({ onConfirm, onCancel, ...bp }: PickerBodyProps & { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-center text-base font-semibold text-foreground">เลือกช่วงวันที่</h2>
      <PickerBody {...bp} />
      <div className="flex gap-3">
        <Button type="button" variant="ghost" className="flex-1 touch-target" onClick={onCancel}>ยกเลิก</Button>
        <Button type="button" className="flex-1 touch-target" onClick={onConfirm} disabled={!bp.pendingStart}>ใช้ช่วงนี้</Button>
      </div>
    </div>
  )
}

// ─── Custom-range trigger button ─────────────────────────────────────────────

const chipBase = 'h-8 px-3.5 rounded-lg text-[13px] font-medium transition-all duration-150 shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function CustomTriggerButton({ label, isActive, onClick, onClear }: {
  label: string | null; isActive: boolean
  onClick: () => void; onClear: (e: React.MouseEvent | React.KeyboardEvent) => void
}) {
  return (
    <button type="button" onClick={onClick} className={cn(chipBase,
      isActive ? 'bg-primary text-primary-foreground shadow-active-chip'
               : 'text-muted-foreground hover:text-foreground hover:bg-accent/60 active:bg-accent/80',
    )}>
      <span>{label ?? 'เลือกช่วงวันที่'}</span>
      {isActive && (
        <span role="button" tabIndex={0} aria-label="ล้างช่วงวันที่"
          onClick={onClear} onKeyDown={e => e.key === 'Enter' && onClear(e)}
          className="flex items-center justify-center w-4 h-4 radius-badge shrink-0 bg-primary-foreground/20 hover:bg-primary-foreground/35 transition-colors duration-150"
        ><X className="w-2.5 h-2.5" /></span>
      )}
    </button>
  )
}

// ─── DateRangeFilter ─────────────────────────────────────────────────────────

export function DateRangeFilter({
  startDate,
  endDate,
  onRangeChange,
  presets = DEFAULT_PRESETS,
  showSummary = true,
}: DateRangeFilterProps) {
  const {
    pickerOpen, setPickerOpen, isMobile,
    pendingStart, pendingEnd, hoveredDate, setHoveredDate,
    openPicker, handleConfirm, handleCancel, handleDayClick,
  } = useDateRangeFilter({ startDate, endDate, onRangeChange })

  // ── Derived state ──────────────────────────────────────────────────────────

  const activePresetKey: string | null = (() => {
    if (!startDate || !endDate) return null
    for (const preset of presets) {
      const [s, e] = preset.getRange()
      if (startDate === toApiDate(s) && endDate === toApiDate(e)) return preset.key
    }
    return null
  })()

  const isCustomActive = !!(startDate || endDate) && activePresetKey === null

  const customBtnLabel: string | null = isCustomActive
    ? formatRange(fromApiDate(startDate)!, fromApiDate(endDate))
    : null

  const activeSummaryLabel: string | null = (() => {
    const s = fromApiDate(startDate)
    if (!s) return null
    return formatRange(s, fromApiDate(endDate))
  })()

  // ── Handlers ───────────────────────────────────────────────────────────────

  const applyPreset = (preset: DateRangePreset) => {
    const [s, e] = preset.getRange()
    onRangeChange(toApiDate(s), toApiDate(e))
  }

  const clearCustomRange = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    onRangeChange('', '')
  }

  const bodyProps: PickerBodyProps = {
    pendingStart, pendingEnd, hoveredDate,
    onDayClick: handleDayClick,
    onDayHover: setHoveredDate,
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">

      {/* Quick filter bar */}
      <FilterChipBar
        chips={presets}
        activeKey={activePresetKey ?? ''}
        onSelect={(key) => {
          const preset = presets.find((p) => p.key === key)
          if (preset) applyPreset(preset)
        }}
      >
        {isMobile ? (
          <CustomTriggerButton
            label={customBtnLabel}
            isActive={isCustomActive}
            onClick={openPicker}
            onClear={clearCustomRange}
          />
        ) : (
          <Popover open={pickerOpen} onOpenChange={(v) => { if (!v) handleCancel() }}>
            <PopoverTrigger asChild>
              <CustomTriggerButton
                label={customBtnLabel}
                isActive={isCustomActive}
                onClick={openPicker}
                onClear={clearCustomRange}
              />
            </PopoverTrigger>
            <PopoverContent className="w-95 p-6" align="start" sideOffset={8}>
              <DesktopPicker {...bodyProps} onConfirm={handleConfirm} onCancel={handleCancel} />
            </PopoverContent>
          </Popover>
        )}
      </FilterChipBar>

      {/* Active filter summary */}
      {showSummary && activeSummaryLabel && (
        <p className="text-body text-muted-foreground">
          กำลังแสดงข้อมูล:{' '}
          <span className="text-foreground font-medium">{activeSummaryLabel}</span>
        </p>
      )}

      {/* Mobile bottom sheet */}
      {isMobile && (
        <Sheet open={pickerOpen} onOpenChange={open => !open && setPickerOpen(false)}>
          <SheetContent side="bottom" className="rounded-t-2xl p-0 flex flex-col max-h-[90vh]">
            <div className="shrink-0 px-6 pt-6 pb-0 pr-14">
              <h3 className="text-center text-base font-semibold text-foreground">
                เลือกช่วงวันที่
              </h3>
            </div>
            <div className="overflow-y-auto flex-1 px-6 pt-5 pb-2">
              <PickerBody {...bodyProps} />
            </div>
            <div className="shrink-0 px-6 pb-8 pt-4 flex gap-3 border-t border-border bg-card">
              <Button type="button" variant="ghost" className="flex-1 touch-target" onClick={handleCancel}>
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
