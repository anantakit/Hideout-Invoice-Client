import { useSearchParams } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ChevronRight, CalendarX, ArrowRight } from 'lucide-react'
import { formatTHB, fmtShortISO } from '../../../shared/utils'
import ErrorPanel from '../../../shared/components/ErrorPanel'
import { usePaginatedQuery } from '../../../shared/hooks/usePaginatedQuery'
import { useBookings } from '../hooks'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Card, CardContent } from '../../../shared/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../shared/ui/table'
import Pagination from '../../../shared/ui/Pagination'
import { Fab } from '../../../shared/ui/Fab'
import { Skeleton } from '../../../shared/ui/skeleton'
import { type BookingResponse, getStatusLabel } from '../types'
import { FilterChipBar, type FilterChip as FilterChipType } from '../../../shared/ui/FilterChipBar'
import { DateRangePicker } from '../shared/components/DateRangePicker'
import type { DateRange } from '../shared/components/DateRangePicker'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format room labels as { label, count } for two-line display. */
function getRoomInfo(booking: BookingResponse): { label: string; count: number } {
  const active = booking.room_stays.filter((s) => s.status !== 'CANCELLED')
  if (active.length === 0) return { label: '—', count: 0 }

  const assigned = active.filter((s) => s.room_number)
  const unassigned = active.filter((s) => !s.room_number)

  const parts: string[] = []

  if (assigned.length > 0) {
    parts.push(assigned.map((s) => s.room_number).join(', '))
  }

  if (unassigned.length > 0) {
    const grouped: Record<string, number> = {}
    for (const s of unassigned) {
      grouped[s.room_type_name] = (grouped[s.room_type_name] || 0) + 1
    }
    for (const [name, count] of Object.entries(grouped)) {
      parts.push(count > 1 ? `${name} x ${count}` : name)
    }
  }

  return { label: parts.join(', '), count: active.length }
}

/** Extract earliest check_in and latest check_out from a booking's stays. */
function getStayRange(booking: BookingResponse): { checkIn: string; checkOut: string } | null {
  const stays = booking.room_stays
  if (!stays || stays.length === 0) return null
  let earliest = stays[0].check_in
  let latest = stays[0].check_out
  for (let i = 1; i < stays.length; i++) {
    if (stays[i].check_in < earliest) earliest = stays[i].check_in
    if (stays[i].check_out > latest) latest = stays[i].check_out
  }
  return { checkIn: earliest, checkOut: latest }
}

// ─── Status display maps ───────────────────────────────────────────────────────

type BadgeVariant = 'blue' | 'green' | 'gray' | 'red' | 'amber'

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  CONFIRMED:            'blue',
  RESERVED:             'gray',
  PARTIALLY_CHECKED_IN: 'amber',
  CHECKED_IN:           'green',
  CHECKED_OUT:          'gray',
  CANCELLED:            'red',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANTS[status] ?? 'gray'}>
      {getStatusLabel(status)}
    </Badge>
  )
}

// ─── Quick filter chips ─────────────────────────────────────────────────────────

type BookingFilter = 'active' | 'checked_in' | 'arrivals' | 'departures' | 'outstanding' | 'history'

interface BookingFilterDef extends FilterChipType<BookingFilter> {
  status: string
  view: string
}

const FILTER_CHIPS: BookingFilterDef[] = [
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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function BookingListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // ── URL-backed filter state ─────────────────────────────────────────────────
  const statusParam    = searchParams.get('status') ?? ''
  const viewParam      = searchParams.get('view') ?? ''
  const startDateParam = searchParams.get('start_date') ?? ''
  const endDateParam   = searchParams.get('end_date') ?? ''

  // Default: when no status/view in URL, apply the "active" view
  const effectiveView = (!statusParam && !viewParam) ? 'active' : viewParam

  const activeChip = getActiveChipKey(statusParam, effectiveView)

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

  // ── Pagination + search (local state, debounced) ────────────────────────────
  const { page, limit, searchInput, params, setPage, setLimit, setSearchInput } =
    usePaginatedQuery({ defaultLimit: 20 })

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

  // ── Early returns ───────────────────────────────────────────────────────────

  if (isLoading) return <LoadingState />
  if (isError)   return <ErrorState onRetry={refetch} />

  // ── Render ──────────────────────────────────────────────────────────────────

  const hasFilters = Boolean(searchInput || statusParam || viewParam || startDateParam)

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-5xl mx-auto pb-24 md:pb-6">

      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h1 className="text-section text-2xl">รายการจอง</h1>
          <p className="text-helper mt-1">
            {data ? `${total} รายการ` : ''}
          </p>
        </div>
        <Button onClick={() => navigate('/bookings/new')} className="shrink-0 hidden md:inline-flex">
          <Plus className="w-4 h-4 mr-1.5" />
          สร้างการจอง
        </Button>
      </div>

      {/* Search + Filter chips + Date range */}
      <div className="bg-card radius-card border border-border p-3 sm:p-4 mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อ หรือเบอร์โทร…"
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <FilterChipBar
          chips={FILTER_CHIPS}
          activeKey={activeChip}
          onSelect={handleChipSelect}
        />

        {/* Date range filter */}
        <div className="flex items-center gap-2">
          <DateRangePicker
            value={{ checkIn: startDateParam, checkOut: endDateParam }}
            onChange={handleDateRangeChange}
            placeholder="กรองตามช่วงวันเข้าพัก"
            className="w-auto"
          />
          {startDateParam && endDateParam && (
            <Button variant="ghost" size="sm" onClick={clearDateRange} className="shrink-0 text-muted-foreground">
              ล้าง
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {bookings.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>

          {/* Desktop table */}
          <Card className="hidden md:block overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ผู้เข้าพัก</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>ห้อง</TableHead>
                  <TableHead>วันเข้าพัก</TableHead>
                  <TableHead className="text-right">ยอดค้าง</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <DesktopRow
                    key={booking.id}
                    booking={booking}
                    onView={() => navigate(`/bookings/${booking.id}`)}
                  />
                ))}
              </TableBody>
            </Table>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          </Card>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {bookings.map((booking) => (
              <MobileCard
                key={booking.id}
                booking={booking}
                onClick={() => navigate(`/bookings/${booking.id}`)}
              />
            ))}
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          </div>
        </div>
      )}

      <Fab to="/bookings/new" label="สร้างการจอง" />
    </div>
  )
}

// ─── Desktop row ───────────────────────────────────────────────────────────────

function DesktopRow({
  booking,
  onView,
}: {
  booking: BookingResponse
  onView: () => void
}) {
  const range = getStayRange(booking)
  const balance = booking.balance_amount

  return (
    <TableRow className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={onView}>
      <TableCell>
        <p className="font-medium">{booking.guest_name}</p>
        <p className="text-helper mt-0.5">{booking.guest_phone}</p>
      </TableCell>
      <TableCell>
        <StatusBadge status={booking.status} />
      </TableCell>
      <TableCell>
        {(() => {
          const info = getRoomInfo(booking)
          return (
            <>
              <p className="text-body">{info.label}</p>
              <p className="text-helper mt-0.5">{info.count} ห้อง</p>
            </>
          )
        })()}
      </TableCell>
      <TableCell className="text-body text-muted-foreground whitespace-nowrap">
        {range ? (
          <span className="inline-flex items-center gap-1">
            {fmtShortISO(range.checkIn)}
            <ArrowRight className="w-3 h-3" />
            {fmtShortISO(range.checkOut)}
          </span>
        ) : '—'}
      </TableCell>
      <TableCell className="text-right text-body tabular-nums">
        {balance > 0 ? (
          <span className="text-warning font-medium">{formatTHB(balance)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </TableCell>
    </TableRow>
  )
}

// ─── Mobile card ───────────────────────────────────────────────────────────────

function MobileCard({
  booking,
  onClick,
}: {
  booking: BookingResponse
  onClick: () => void
}) {
  const range = getStayRange(booking)
  const balance = booking.balance_amount

  return (
    <button
      type="button"
      className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 radius-card"
      onClick={onClick}
    >
      <Card className="transition-colors active:bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold truncate">{booking.guest_name}</p>
              <p className="text-helper mt-0.5">{booking.guest_phone}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>

          <div className="flex items-center gap-2 mt-3">
            <StatusBadge status={booking.status} />
            <span className="text-helper truncate max-w-[140px]">
              {(() => {
                const info = getRoomInfo(booking)
                return `${info.label} · ${info.count} ห้อง`
              })()}
            </span>
            {range && (
              <span className="text-helper ml-auto inline-flex items-center gap-1">
                {fmtShortISO(range.checkIn)}
                <ArrowRight className="w-3 h-3" />
                {fmtShortISO(range.checkOut)}
              </span>
            )}
          </div>

          {balance > 0 && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
              <span className="text-helper">ค้างชำระ</span>
              <span className="text-caption font-medium text-warning tabular-nums">
                {formatTHB(balance)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </button>
  )
}

// ─── State components ──────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="space-y-4 px-4 py-6">
      {/* Mobile card skeletons */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Desktop table skeletons */}
      <div className="hidden md:block space-y-3 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-24 ml-auto rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <ErrorPanel
      message="โหลดข้อมูลการจองไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ"
      onRetry={onRetry}
    />
  )
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center px-4">
      <CalendarX className="w-10 h-10 text-muted-foreground/50" />
      <div>
        <p className="font-medium text-foreground">
          {hasFilters ? 'ไม่พบรายการที่ตรงกัน' : 'ยังไม่มีรายการจอง'}
        </p>
        <p className="text-helper mt-1">
          {hasFilters
            ? 'ลองเปลี่ยนตัวกรอง หรือคำค้นหา'
            : 'กดปุ่ม "สร้างการจอง" เพื่อเริ่มต้น'}
        </p>
      </div>
    </div>
  )
}
