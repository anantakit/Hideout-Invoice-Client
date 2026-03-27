import { Search } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { FilterChipBar } from '@/shared/ui/FilterChipBar'
import { DateRangePicker } from '../../shared/components/DateRangePicker'
import type { DateRange } from '../../shared/components/DateRangePicker'
import { FILTER_CHIPS, type BookingFilter } from '../hooks/useBookingListFilters'

// ── Props ───────────────────────────────────────────────────────────────────

interface BookingListFiltersProps {
  searchInput: string
  onSearchChange: (value: string) => void
  activeChip: BookingFilter
  onChipSelect: (key: BookingFilter) => void
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
  onClearDateRange: () => void
}

// ── Component ───────────────────────────────────────────────────────────────

export function BookingListFilters({
  searchInput,
  onSearchChange,
  activeChip,
  onChipSelect,
  dateRange,
  onDateRangeChange,
  onClearDateRange,
}: BookingListFiltersProps) {
  return (
    <div className="bg-card radius-card border border-border p-3 sm:p-4 mb-6 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="ค้นหาชื่อ หรือเบอร์โทร…"
          className="pl-9"
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <FilterChipBar
        chips={FILTER_CHIPS}
        activeKey={activeChip}
        onSelect={onChipSelect}
      />

      {/* Date range filter */}
      <div className="flex items-center gap-2">
        <DateRangePicker
          value={dateRange}
          onChange={onDateRangeChange}
          placeholder="กรองตามช่วงวันเข้าพัก"
          className="w-auto"
        />
        {dateRange.checkIn && dateRange.checkOut && (
          <Button variant="ghost" size="sm" onClick={onClearDateRange} className="shrink-0 text-muted-foreground">
            ล้าง
          </Button>
        )}
      </div>
    </div>
  )
}
