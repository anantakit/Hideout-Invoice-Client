import React from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { DoorOpen, CheckCircle2, CircleAlert, Phone } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/shared/ui/sheet'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'
import { type TimelineBooking, getStatusLabel } from '../../types'

// ─── Public types ─────────────────────────────────────────────────────────────

export interface SelectedBookingContext {
  booking: TimelineBooking
  roomNumbers: string[]
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface BookingBottomSheetProps {
  selected: SelectedBookingContext | null
  onClose: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const THAI_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

function fmtThaiDate(iso: string): string {
  try {
    const d = parseISO(iso)
    return `${THAI_DAYS[d.getDay()]} ${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`
  } catch { return iso }
}

function statusVariant(status: string): 'default' | 'amber' | 'green' | 'gray' | 'red' | 'blue' {
  switch (status) {
    case 'CONFIRMED':             return 'blue'
    case 'PARTIALLY_CHECKED_IN':  return 'amber'
    case 'CHECKED_IN':            return 'green'
    case 'CHECKED_OUT':           return 'gray'
    case 'CANCELLED':             return 'red'
    default:                      return 'default'
  }
}

function formatTHB(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
  }).format(amount)
}

// ─── Component ────────────────────────────────────────────────────────────────

const BookingBottomSheet = React.memo(function BookingBottomSheet({
  selected,
  onClose,
}: BookingBottomSheetProps) {
  const navigate = useNavigate()
  const isOpen = selected !== null

  if (!selected) {
    return (
      <Sheet open={false} onOpenChange={() => {}}>
        <SheetContent side="bottom" className="rounded-t-2xl px-6 pb-8 pt-6" />
      </Sheet>
    )
  }

  const { booking, roomNumbers } = selected
  const hasBalance = Number(booking.balance_amount) > 0
  const nights = differenceInDays(parseISO(booking.check_out), parseISO(booking.check_in))

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl px-6 pb-8 pt-6">
        {/* ── Header ──────────────────────────────────────────────── */}
        <SheetHeader className="mb-3">
          <div className="flex items-start justify-between gap-3">
            <SheetTitle className="text-section leading-tight">
              {booking.guest_name}
            </SheetTitle>
            <Badge variant={statusVariant(booking.status)}>
              {getStatusLabel(booking.status)}
            </Badge>
          </div>
          <SheetDescription className="text-body text-muted-foreground">
            {fmtThaiDate(booking.check_in)} → {fmtThaiDate(booking.check_out)}
            <span className="ml-1.5">({nights} คืน)</span>
          </SheetDescription>
        </SheetHeader>

        <Separator className="mb-3" />

        {/* ── Room numbers ────────────────────────────────────────── */}
        {roomNumbers.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <DoorOpen className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-body text-muted-foreground">ห้อง</span>
            <div className="flex flex-wrap gap-1.5">
              {roomNumbers.map((rn) => (
                <Badge key={rn} variant="outline" className="text-xs px-2 py-0">
                  {rn}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* ── Phone ────────────────────────────────────────────────── */}
        {booking.guest_phone && (
          <a
            href={`tel:${booking.guest_phone}`}
            className="flex items-center gap-2 mb-3 text-primary active:opacity-70"
          >
            <Phone className="w-4 h-4 shrink-0" />
            <span className="text-body">{booking.guest_phone}</span>
          </a>
        )}

        {/* ── Balance ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-body text-muted-foreground">ยอดค้างชำระ</span>
          {hasBalance ? (
            <span className="flex items-center gap-1 text-sm font-semibold text-warning">
              <CircleAlert className="w-3.5 h-3.5" />
              {formatTHB(Number(booking.balance_amount))}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sm font-semibold text-success">
              <CheckCircle2 className="w-3.5 h-3.5" />
              ชำระแล้ว
            </span>
          )}
        </div>

        {/* ── Actions ─────────────────────────────────────────────── */}
        <Button
          className="w-full"
          onClick={() => navigate(`/bookings/${booking.booking_id}`)}
        >
          เปิดรายละเอียด
        </Button>
      </SheetContent>
    </Sheet>
  )
})

export default BookingBottomSheet
