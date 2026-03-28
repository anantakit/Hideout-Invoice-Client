import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useBookingListFilters,
  FILTER_CHIPS,
} from './useBookingListFilters'

// ── Mocks ────────────────────────────────────────────────────────────────────

let currentParams = new URLSearchParams()
const mockSetSearchParams = vi.fn((next: URLSearchParams, _opts?: unknown) => {
  currentParams = next
})

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [currentParams, mockSetSearchParams],
}))

const mockSetPage = vi.fn()
const mockSetLimit = vi.fn()
const mockSetSearchInput = vi.fn()

vi.mock('@/shared/hooks/usePaginatedQuery', () => ({
  usePaginatedQuery: vi.fn(() => ({
    page: 1,
    limit: 20,
    searchInput: '',
    params: { page: 1, limit: 20 },
    setPage: mockSetPage,
    setLimit: mockSetLimit,
    setSearchInput: mockSetSearchInput,
  })),
}))

const mockBookingsData = {
  data: [{ id: 'b1', guest_name: 'ทดสอบ' }],
  meta: { page: 1, limit: 20, total: 1, total_pages: 1 },
}

vi.mock('../../hooks', () => ({
  useBookings: vi.fn(() => ({
    data: mockBookingsData,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  })),
}))

// ── Tests ────────────────────────────────────────────────────────────────────

describe('FILTER_CHIPS', () => {
  it('has 6 filter options', () => {
    expect(FILTER_CHIPS).toHaveLength(6)
  })

  it('has Thai labels for all chips', () => {
    const labels = FILTER_CHIPS.map((c) => c.label)
    expect(labels).toContain('กำลังดำเนินการ')
    expect(labels).toContain('เข้าพักอยู่')
    expect(labels).toContain('เช็คอินวันนี้')
    expect(labels).toContain('เช็คเอาท์วันนี้')
    expect(labels).toContain('ค้างชำระ')
    expect(labels).toContain('ประวัติ')
  })
})

describe('useBookingListFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentParams = new URLSearchParams()
  })

  it('returns default active chip as "active" when no URL params', () => {
    const { result } = renderHook(() => useBookingListFilters())

    expect(result.current.activeChip).toBe('active')
  })

  it('returns bookings data from useBookings', () => {
    const { result } = renderHook(() => useBookingListFilters())

    expect(result.current.bookings).toHaveLength(1)
    expect(result.current.total).toBe(1)
    expect(result.current.totalPages).toBe(1)
  })

  it('returns loading/error states', () => {
    const { result } = renderHook(() => useBookingListFilters())

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.isFetching).toBe(false)
  })

  describe('onChipSelect', () => {
    it('sets status param for checked_in chip', () => {
      const { result } = renderHook(() => useBookingListFilters())

      act(() => result.current.onChipSelect('checked_in'))

      expect(mockSetSearchParams).toHaveBeenCalled()
      const params = mockSetSearchParams.mock.calls[0][0] as URLSearchParams
      expect(params.get('status')).toBe('CHECKED_IN')
      expect(params.get('view')).toBeNull()
    })

    it('sets view param for arrivals chip', () => {
      const { result } = renderHook(() => useBookingListFilters())

      act(() => result.current.onChipSelect('arrivals'))

      const params = mockSetSearchParams.mock.calls[0][0] as URLSearchParams
      expect(params.get('view')).toBe('arrivals_today')
      expect(params.get('status')).toBeNull()
    })

    it('sets view param for outstanding chip', () => {
      const { result } = renderHook(() => useBookingListFilters())

      act(() => result.current.onChipSelect('outstanding'))

      const params = mockSetSearchParams.mock.calls[0][0] as URLSearchParams
      expect(params.get('view')).toBe('outstanding')
    })

    it('sets status for history chip', () => {
      const { result } = renderHook(() => useBookingListFilters())

      act(() => result.current.onChipSelect('history'))

      const params = mockSetSearchParams.mock.calls[0][0] as URLSearchParams
      expect(params.get('status')).toBe('CHECKED_OUT')
    })

    it('clears date params when changing chip', () => {
      currentParams.set('start_date', '2025-03-01')
      currentParams.set('end_date', '2025-03-31')

      const { result } = renderHook(() => useBookingListFilters())

      act(() => result.current.onChipSelect('active'))

      const params = mockSetSearchParams.mock.calls[0][0] as URLSearchParams
      expect(params.get('start_date')).toBeNull()
      expect(params.get('end_date')).toBeNull()
    })

    it('resets page to 1 when chip changes', () => {
      const { result } = renderHook(() => useBookingListFilters())

      act(() => result.current.onChipSelect('departures'))

      expect(mockSetPage).toHaveBeenCalledWith(1)
    })
  })

  describe('onDateRangeChange', () => {
    it('sets date range params', () => {
      const { result } = renderHook(() => useBookingListFilters())

      act(() => {
        result.current.onDateRangeChange({
          checkIn: '2025-03-01',
          checkOut: '2025-03-31',
        })
      })

      const params = mockSetSearchParams.mock.calls[0][0] as URLSearchParams
      expect(params.get('start_date')).toBe('2025-03-01')
      expect(params.get('end_date')).toBe('2025-03-31')
    })

    it('removes date params when range is empty', () => {
      currentParams.set('start_date', '2025-03-01')
      currentParams.set('end_date', '2025-03-31')

      const { result } = renderHook(() => useBookingListFilters())

      act(() => {
        result.current.onDateRangeChange({ checkIn: '', checkOut: '' })
      })

      const params = mockSetSearchParams.mock.calls[0][0] as URLSearchParams
      expect(params.get('start_date')).toBeNull()
      expect(params.get('end_date')).toBeNull()
    })

    it('resets page to 1', () => {
      const { result } = renderHook(() => useBookingListFilters())

      act(() => {
        result.current.onDateRangeChange({
          checkIn: '2025-03-01',
          checkOut: '2025-03-31',
        })
      })

      expect(mockSetPage).toHaveBeenCalledWith(1)
    })
  })

  describe('onClearDateRange', () => {
    it('removes start_date and end_date from URL', () => {
      currentParams.set('start_date', '2025-03-01')
      currentParams.set('end_date', '2025-03-31')

      const { result } = renderHook(() => useBookingListFilters())

      act(() => result.current.onClearDateRange())

      const params = mockSetSearchParams.mock.calls[0][0] as URLSearchParams
      expect(params.get('start_date')).toBeNull()
      expect(params.get('end_date')).toBeNull()
    })

    it('resets page to 1', () => {
      const { result } = renderHook(() => useBookingListFilters())

      act(() => result.current.onClearDateRange())

      expect(mockSetPage).toHaveBeenCalledWith(1)
    })
  })

  describe('hasFilters', () => {
    it('is false by default', () => {
      const { result } = renderHook(() => useBookingListFilters())

      expect(result.current.hasFilters).toBe(false)
    })

    it('is true when status param is set', () => {
      currentParams.set('status', 'CHECKED_IN')

      const { result } = renderHook(() => useBookingListFilters())

      expect(result.current.hasFilters).toBe(true)
    })

    it('is true when start_date param is set', () => {
      currentParams.set('start_date', '2025-03-01')

      const { result } = renderHook(() => useBookingListFilters())

      expect(result.current.hasFilters).toBe(true)
    })
  })

  describe('dateRange', () => {
    it('returns empty strings when no URL date params', () => {
      const { result } = renderHook(() => useBookingListFilters())

      expect(result.current.dateRange).toEqual({
        checkIn: '',
        checkOut: '',
      })
    })

    it('returns URL date params when set', () => {
      currentParams.set('start_date', '2025-03-01')
      currentParams.set('end_date', '2025-03-31')

      const { result } = renderHook(() => useBookingListFilters())

      expect(result.current.dateRange).toEqual({
        checkIn: '2025-03-01',
        checkOut: '2025-03-31',
      })
    })
  })

  describe('pagination passthrough', () => {
    it('exposes page, totalPages, limit, setPage, setLimit', () => {
      const { result } = renderHook(() => useBookingListFilters())

      expect(result.current.page).toBe(1)
      expect(result.current.limit).toBe(20)
      expect(result.current.setPage).toBeDefined()
      expect(result.current.setLimit).toBeDefined()
    })
  })
})
