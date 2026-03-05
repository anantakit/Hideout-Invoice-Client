import React from 'react'
import { format, parseISO } from 'date-fns'
import { useNavigate } from 'react-router-dom'
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
import type { TimelineBooking } from '../../types'

interface BookingBottomSheetProps {
  booking: TimelineBooking | null
  onClose: () => void
}

/** Maps booking status string to badge variant for consistent status coloring. */
function statusVariant(status: string): 'default' | 'amber' | 'green' | 'gray' | 'red' {
  switch (status) {
    case 'CONFIRMED':
    case 'PARTIALLY_CHECKED_IN':
      return 'default'
    case 'CHECKED_IN':
      return 'green'
    case 'CHECKED_OUT':
      return 'gray'
    case 'CANCELLED':
      return 'red'
    default:
      return 'default'
  }
}

/** Formats a YYYY-MM-DD date string to a human-readable date. */
function formatDate(iso: string): string {
  return format(parseISO(iso), 'MMM d, yyyy')
}

/** Formats balance_amount as Thai Baht currency string. */
function formatTHB(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Bottom sheet displayed when a BookingBlock is tapped.
 *
 * Uses the existing Sheet component from the design system.
 * All typography and color references use design-system tokens only.
 */
const BookingBottomSheet = React.memo(function BookingBottomSheet({
  booking,
  onClose,
}: BookingBottomSheetProps) {
  const navigate = useNavigate()

  const isOpen = booking !== null

  function handleOpenDetail() {
    if (!booking) return
    navigate(`/bookings/${booking.booking_id}`)
  }

  const hasBalance = booking && Number(booking.balance_amount) > 0

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl px-6 pb-8 pt-6">
        {booking && (
          <>
            <SheetHeader className="mb-4">
              <div className="flex items-start justify-between gap-3">
                <SheetTitle className="text-lg font-semibold text-foreground leading-tight">
                  {booking.guest_name}
                </SheetTitle>
                <Badge variant={statusVariant(booking.status)}>
                  {booking.status}
                </Badge>
              </div>
              <SheetDescription className="text-sm text-muted-foreground">
                {formatDate(booking.check_in)} → {formatDate(booking.check_out)}
              </SheetDescription>
            </SheetHeader>

            <Separator className="mb-4" />

            {/* Balance */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm text-muted-foreground">Balance</span>
              <span
                className={
                  hasBalance
                    ? 'text-sm font-semibold text-warning'
                    : 'text-sm font-semibold text-success'
                }
              >
                {formatTHB(Number(booking.balance_amount))}
              </span>
            </div>

            <Button className="w-full" onClick={handleOpenDetail}>
              Open Booking Detail
            </Button>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
})

export default BookingBottomSheet
