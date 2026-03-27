import { useSearchParams } from 'react-router-dom'
import { usePaginatedQuery } from '@/shared/hooks/usePaginatedQuery'
import { useBookings } from '../../hooks'
import type { FilterChip } from '@/shared/ui/FilterChipBar'
import type { DateRange } from '../../shared/components/DateRangePicker'

// ── Filter chip definitions ─────────────────────────────────────────────────

export type BookingFilter = 'active' | 'checked_in' | 'arrivals' | 'departures' | 'outstanding' | 'history'

export interface BookingFilterDef extends FilterChip<BookingFilter> {
  status: string
  view: string
}

export const FILTER_CHIPS: BookingFilterDef[] = [
  { key: 'active',      label: 'กำลังดำเนินการ', status: '',            view: 'active' },
  { key: 'checked_in',  label: 'เข้าพักอยู่',    status: 'CHECKED_IN',  view: '' },
  { key: 'arrivals',    label: 'เช็คอินวันนี้',   status: '',            view: 'arrivals_today' },
  { key: 'departures',  label: 'เช็คเอาท์วันนี้', status: '',            view: 'departures_today' },
  { key: 'outstanding', label: 'ค้างชำระ',       status: '',            view: 'outstanding' },
  { key: 'history',     label: 'ประวัติ',        status: 'CHECKED_OUT', view: '' },
]

const DEFAULT_CHIP: BookingFilter = 'active'

function getActiveChipKey(status: string, view: string): BookingFilter {
  const match = FILTER_CHIPS.find((c) => c.status === status && c.view === view)
  return match?.key ?? DEFAULT_CHIP
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useBookingListFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  // URL-backed filter state
  const statusParam    = searchParams.get('status') ?? ''
  const viewParam      = searchParams.get('view') ?? ''
  const startDateParam = searchParams.get('start_date') ?? ''
  const endDateParam   = searchParams.get('end_date') ?? ''

  // Default: when no status/view in URL, apply the "active" view
  const effectiveView = (!statusParam && !viewParam) ? 'active' : viewParam
  const activeChip = getActiveChipKey(statusParam, effectiveView)

  // Pagination + search (local state, debounced)
  const { page, limit, searchInput, params, setPage, setLimit, setSearchInput } =
    usePaginatedQuery({ defaultLimit: 20 })

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleChipSelect(key: BookingFilter) {
    const chip = FILTER_CHIPS.find((c) => c.key === key)!
    const next = new URLSearchParams(searchParams)
    next.delete('status')
    next.delete('view')
    next.delete('start_date')
    next.delete('end_date')
    if (chip.status) next.set('status', chip.status)
    if (chip.view) next.set('view', chip.view)
    setSearchParams(next, { replace: true })
    setPage(1)
  }

  function handleDateRangeChange(range: DateRange) {
    const next = new URLSearchParams(searchParams)
    if (range.checkIn && range.checkOut) {
      next.set('start_date', range.checkIn)
      next.set('end_date', range.checkOut)
    } else {
      next.delete('start_date')
      next.delete('end_date')
    }
    setSearchParams(next, { replace: true })
    setPage(1)
  }

  function clearDateRange() {
    const next = new URLSearchParams(searchParams)
    next.delete('start_date')
    next.delete('end_date')
    setSearchParams(next, { replace: true })
    setPage(1)
  }

  // ── Data fetch ──────────────────────────────────────────────────────────────

  const { data, isLoading, isError, refetch, isFetching } = useBookings({
    ...params,
    ...(statusParam    && { status: statusParam }),
    ...(effectiveView  && { view:   effectiveView }),
    ...(startDateParam && endDateParam && { start_date: startDateParam, end_date: endDateParam }),
  })

  const bookings   = data?.data ?? []
  const total      = data?.meta.total ?? 0
  const totalPages = data?.meta.total_pages ?? 1

  const hasFilters = Boolean(searchInput || statusParam || viewParam || startDateParam)

  return {
    // Filter state
    searchInput,
    setSearchInput,
    activeChip,
    onChipSelect: handleChipSelect,
    dateRange: { checkIn: startDateParam, checkOut: endDateParam },
    onDateRangeChange: handleDateRangeChange,
    onClearDateRange: clearDateRange,
    hasFilters,
    // Data
    bookings,
    total,
    isLoading,
    isError,
    isFetching,
    refetch,
    // Pagination
    page,
    totalPages,
    limit,
    setPage,
    setLimit,
  }
}
