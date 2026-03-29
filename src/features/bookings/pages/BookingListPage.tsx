import { useNavigate } from 'react-router'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Fab } from '@/shared/ui/Fab'
import { useBookingListFilters } from '../booking-list/hooks/useBookingListFilters'
import { BookingListFilters } from '../booking-list/components/BookingListFilters'
import { BookingListTable } from '../booking-list/components/BookingListTable'
import { LoadingState, ErrorState, EmptyState } from '../booking-list/components/BookingListStates'

// ── Page ────────────────────────────────────────────────────────────────────

export default function BookingListPage() {
  const navigate = useNavigate()
  const filters = useBookingListFilters()

  if (filters.isLoading) return <LoadingState />
  if (filters.isError)   return <ErrorState onRetry={filters.refetch} />

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-5xl mx-auto pb-24 md:pb-6">

      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h1 className="text-section text-2xl">รายการจอง</h1>
          <p className="text-helper mt-1">{`${filters.total} รายการ`}</p>
        </div>
        <Button onClick={() => navigate('/bookings/new')} className="shrink-0 hidden md:inline-flex">
          <Plus className="w-4 h-4 mr-1.5" />
          สร้างการจอง
        </Button>
      </div>

      {/* Filters */}
      <BookingListFilters
        searchInput={filters.searchInput}
        onSearchChange={filters.setSearchInput}
        activeChip={filters.activeChip}
        onChipSelect={filters.onChipSelect}
        dateRange={filters.dateRange}
        onDateRangeChange={filters.onDateRangeChange}
        onClearDateRange={filters.onClearDateRange}
      />

      {/* Content */}
      {filters.bookings.length === 0 ? (
        <EmptyState hasFilters={filters.hasFilters} />
      ) : (
        <BookingListTable
          bookings={filters.bookings}
          isFetching={filters.isFetching}
          page={filters.page}
          totalPages={filters.totalPages}
          total={filters.total}
          limit={filters.limit}
          onPageChange={filters.setPage}
          onLimitChange={filters.setLimit}
          onView={(id) => navigate(`/bookings/${id}`)}
        />
      )}

      <Fab to="/bookings/new" label="สร้างการจอง" />
    </div>
  )
}
