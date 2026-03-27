import React from 'react'
import { cn } from '@/shared/utils'
import { Button } from '@/shared/ui/button'
import type { FilterValue } from '../utils/classifyRooms'

// ── Props ─────────────────────────────────────────────────────────────────────

interface MobileFilterBarProps {
  filter: FilterValue
  freeRoomMode: 'selected' | 'range'
  stayRangeValid: boolean
  total: number
  chipList: { value: FilterValue; label: string }[]
  chipCounts: Record<string, number>
  unassignedForDate: number
  onModeChange: (mode: 'selected' | 'range') => void
  onFilterChange: (value: FilterValue) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export const MobileFilterBar = React.memo(function MobileFilterBar({
  filter,
  freeRoomMode,
  stayRangeValid,
  total,
  chipList,
  chipCounts,
  unassignedForDate,
  onModeChange,
  onFilterChange,
}: MobileFilterBarProps) {
  return (
    <div className="px-4 pb-2">
      {/* Section title + mode toggle */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-label text-muted-foreground">
          รายการห้องพัก
        </p>

        {/* Toggle: วันที่เลือก / ช่วงเข้าพัก */}
        <div className="flex radius-button border border-border overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onModeChange('selected')}
            className={cn(
              'h-auto px-2.5 py-1 text-caption rounded-none',
              freeRoomMode === 'selected'
                ? 'date-selected'
                : 'bg-card text-muted-foreground date-hover',
            )}
          >
            วันที่เลือก
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onModeChange('range')}
            disabled={!stayRangeValid}
            className={cn(
              'h-auto px-2.5 py-1 text-caption rounded-none',
              freeRoomMode === 'range'
                ? 'date-selected'
                : 'bg-card text-muted-foreground date-hover',
              !stayRangeValid && 'date-disabled',
            )}
          >
            ช่วงเข้าพัก
          </Button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex space-inline overflow-x-auto scrollbar-hide pb-0.5">
        {chipList.map(({ value, label }) => {
          const count = value === 'all' ? total : chipCounts[value] ?? 0
          const isZero = count === 0 && value !== 'all'
          return (
            <Button
              key={value}
              variant="ghost"
              size="sm"
              onClick={() => onFilterChange(value)}
              className={cn(
                'shrink-0 h-8 px-3 radius-badge text-caption',
                filter === value
                  ? 'date-selected'
                  : isZero
                    ? 'bg-secondary/40 text-muted-foreground/50'
                    : 'bg-secondary/70 text-secondary-foreground active:bg-secondary',
              )}
            >
              {label} {count}
            </Button>
          )
        })}
      </div>

      {freeRoomMode === 'selected' && unassignedForDate > 0 && (
        <p className="text-helper mt-1.5">
          + จองที่ยังไม่กำหนดห้อง {unassignedForDate} รายการ
        </p>
      )}
    </div>
  )
})
