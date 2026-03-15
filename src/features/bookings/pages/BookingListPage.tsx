import { useSearchParams } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ChevronRight, CalendarX, X } from 'lucide-react'
import { formatThaiDate } from '../../../shared/utils'
import ErrorPanel from '../../../shared/components/ErrorPanel'
import { usePaginatedQuery } from '../../../shared/hooks/usePaginatedQuery'
import { useBookings } from '../hooks'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Card, CardContent } from '../../../shared/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../shared/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../shared/ui/table'
import Pagination from '../../../shared/ui/Pagination'
import { DateRangePicker } from '../components/DateRangePicker'
import { Skeleton } from '../../../shared/ui/skeleton'
import { type BookingResponse, getStatusLabel } from '../types'

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

// ─── Date display helper ───────────────────────────────────────────────────────

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

function formatDateShort(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${d} ${THAI_MONTHS_SHORT[m - 1]} ${y + 543}`
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function BookingListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // ── URL-backed filter state ─────────────────────────────────────────────────
  const statusParam = searchParams.get('status') ?? ''
  const startDate   = searchParams.get('start_date') ?? ''
  const endDate     = searchParams.get('end_date') ?? ''
  const viewParam   = searchParams.get('view') ?? ''

  const hasDateFilter = Boolean(startDate && endDate)

  function updateUrlParams(updates: Record<string, string>) {
    const next = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(updates)) {
      if (v) next.set(k, v)
      else   next.delete(k)
    }
    setSearchParams(next, { replace: true })
  }

  function setStatus(v: string) {
    updateUrlParams({ status: v })
    setPage(1)
  }

  function setDateRange(range: { checkIn: string; checkOut: string }) {
    updateUrlParams({ start_date: range.checkIn, end_date: range.checkOut })
    setPage(1)
  }

  function clearDateRange() {
    setDateRange({ checkIn: '', checkOut: '' })
  }

  // ── Pagination + search (local state, debounced) ────────────────────────────
  const { page, limit, searchInput, params, setPage, setLimit, setSearchInput } =
    usePaginatedQuery({ defaultLimit: 20 })

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const { data, isLoading, isError, refetch, isFetching } = useBookings({
    ...params,
    ...(statusParam                  && { status:     statusParam }),
    ...(startDate && endDate         && { start_date: startDate, end_date: endDate }),
    ...(viewParam                    && { view:       viewParam }),
  })

  const bookings   = data?.data ?? []
  const total      = data?.meta.total ?? 0
  const totalPages = data?.meta.total_pages ?? 1

  // ── Early returns ───────────────────────────────────────────────────────────

  if (isLoading) return <LoadingState />
  if (isError)   return <ErrorState onRetry={refetch} />

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-section text-2xl">รายการจอง</h1>
          <p className="text-helper mt-1">
            {data ? `ทั้งหมด ${total} รายการ` : ''}
          </p>
        </div>
        <Button onClick={() => navigate('/bookings/new')} className="shrink-0">
          <Plus className="w-4 h-4 mr-1.5" />
          <span className="hidden sm:inline">สร้างการจอง</span>
          <span className="sm:hidden">สร้าง</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card radius-card border border-border p-4 mb-6 space-y-3">

        {/* Row 1: search + status */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาชื่อ หรือเบอร์โทร…"
              className="pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Select
            value={statusParam || '_all'}
            onValueChange={(v) => setStatus(v === '_all' ? '' : v)}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="ทุกสถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">ทุกสถานะ</SelectItem>
              <SelectItem value="RESERVED">รอดำเนินการ</SelectItem>
              <SelectItem value="PARTIALLY_CHECKED_IN">เช็คอินบางส่วน</SelectItem>
              <SelectItem value="CHECKED_IN">เช็คอินแล้ว</SelectItem>
              <SelectItem value="CHECKED_OUT">เช็คเอาท์แล้ว</SelectItem>
              <SelectItem value="CANCELLED">ยกเลิก</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Row 2: date range picker + clear */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <DateRangePicker
              value={{ checkIn: startDate, checkOut: endDate }}
              onChange={setDateRange}
              placeholder="กรองตามช่วงวันเช็คอิน – เช็คเอาท์"
            />
          </div>
          {hasDateFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearDateRange}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              ล้าง
            </Button>
          )}
        </div>

        {/* Active date filter badge */}
        {hasDateFilter && (
          <div className="flex items-center gap-2 pt-0.5">
            <Badge variant="secondary" className="text-xs gap-1.5">
              ช่วงวันพัก: {formatDateShort(startDate)} – {formatDateShort(endDate)}
            </Badge>
          </div>
        )}

        {/* Active view filter badge */}
        {viewParam && (
          <div className="flex items-center gap-2 pt-0.5">
            <Badge variant="amber" className="text-xs gap-1.5">
              {viewParam === 'arrivals_today' && 'เช็คอินวันนี้'}
              {viewParam === 'departures_today' && 'เช็คเอาท์วันนี้'}
              {viewParam === 'outstanding' && 'ค้างชำระ'}
              {viewParam === 'departures_today_owing' && 'เช็คเอาท์วันนี้ — ค้างชำระ'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateUrlParams({ view: '' })}
              className="h-6 px-1.5 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {bookings.length === 0 ? (
        <EmptyState hasFilters={Boolean(searchInput || statusParam || hasDateFilter || viewParam)} />
      ) : (
        <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>

          {/* Desktop table */}
          <Card className="hidden md:block overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ผู้เข้าพัก</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-center">ห้อง</TableHead>
                  <TableHead>วันที่จอง</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
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
  return (
    <TableRow className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={onView}>
      <TableCell>
        <p className="font-medium">{booking.guest_name}</p>
        <p className="text-helper mt-0.5">{booking.guest_phone}</p>
      </TableCell>
      <TableCell>
        <StatusBadge status={booking.status} />
      </TableCell>
      <TableCell className="text-center text-body text-muted-foreground">
        {booking.room_stays.length} ห้อง
      </TableCell>
      <TableCell className="text-body text-muted-foreground">
        {formatThaiDate(booking.created_at)}
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm" onClick={onView}>
          ดูรายละเอียด
        </Button>
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
            <span className="text-helper">
              {booking.room_stays.length} ห้อง
            </span>
            <span className="text-helper ml-auto">
              {formatThaiDate(booking.created_at)}
            </span>
          </div>
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
            ? 'ลองเปลี่ยนคำค้นหา สถานะ หรือช่วงวันที่'
            : 'กดปุ่ม "สร้างการจอง" เพื่อเริ่มต้น'}
        </p>
      </div>
    </div>
  )
}
