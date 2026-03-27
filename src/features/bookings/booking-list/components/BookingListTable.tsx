import { ChevronRight, ArrowRight } from 'lucide-react'
import { formatTHB, fmtShortISO, formatPhone } from '@/shared/utils'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent } from '@/shared/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import Pagination from '@/shared/ui/Pagination'
import { type BookingResponse, getStatusLabel } from '../../types'
import { bookingStatusVariant } from '../../booking-detail/utils/bookingStatusHelpers'
import { getRoomInfo, getStayRange } from '../utils/bookingListUtils'

// ── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={bookingStatusVariant(status)}>
      {getStatusLabel(status)}
    </Badge>
  )
}

// ── Table props ─────────────────────────────────────────────────────────────

interface BookingListTableProps {
  bookings: BookingResponse[]
  isFetching: boolean
  page: number
  totalPages: number
  total: number
  limit: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  onView: (id: string) => void
}

// ── Main component ──────────────────────────────────────────────────────────

export function BookingListTable({
  bookings,
  isFetching,
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  onView,
}: BookingListTableProps) {
  return (
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
              <DesktopRow key={booking.id} booking={booking} onView={() => onView(booking.id)} />
            ))}
          </TableBody>
        </Table>
        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={onPageChange} onLimitChange={onLimitChange} />
      </Card>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {bookings.map((booking) => (
          <MobileCard key={booking.id} booking={booking} onClick={() => onView(booking.id)} />
        ))}
        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={onPageChange} onLimitChange={onLimitChange} />
      </div>
    </div>
  )
}

// ── Desktop row ─────────────────────────────────────────────────────────────

function DesktopRow({ booking, onView }: { booking: BookingResponse; onView: () => void }) {
  const range = getStayRange(booking)
  const balance = booking.balance_amount

  return (
    <TableRow className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={onView}>
      <TableCell>
        <p className="font-medium">{booking.guest_name}</p>
        <p className="text-helper mt-0.5">{formatPhone(booking.guest_phone)}</p>
      </TableCell>
      <TableCell><StatusBadge status={booking.status} /></TableCell>
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
            {fmtShortISO(range.checkIn)} <ArrowRight className="w-3 h-3" /> {fmtShortISO(range.checkOut)}
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
      <TableCell><ChevronRight className="w-4 h-4 text-muted-foreground" /></TableCell>
    </TableRow>
  )
}

// ── Mobile card ─────────────────────────────────────────────────────────────

function MobileCard({ booking, onClick }: { booking: BookingResponse; onClick: () => void }) {
  const range = getStayRange(booking)
  const balance = booking.balance_amount

  return (
    <button type="button" className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 radius-card" onClick={onClick}>
      <Card className="transition-colors active:bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold truncate break-all">{booking.guest_name}</p>
              <p className="text-helper mt-0.5">{formatPhone(booking.guest_phone)}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <StatusBadge status={booking.status} />
            <span className="text-helper truncate max-w-[140px]">
              {(() => { const info = getRoomInfo(booking); return `${info.label} · ${info.count} ห้อง` })()}
            </span>
            {range && (
              <span className="text-helper ml-auto inline-flex items-center gap-1">
                {fmtShortISO(range.checkIn)} <ArrowRight className="w-3 h-3" /> {fmtShortISO(range.checkOut)}
              </span>
            )}
          </div>
          {balance > 0 && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
              <span className="text-helper">ค้างชำระ</span>
              <span className="text-caption font-medium text-warning tabular-nums">{formatTHB(balance)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </button>
  )
}

