import React from 'react'
import { parseISO, differenceInDays } from 'date-fns'
import { ChevronRight } from 'lucide-react'
import { fmtShortISO } from '@/shared/utils'
import { CardButton } from '@/shared/ui/card-button'
import type { UnassignedStay } from '../../types'
import { toDateStr } from '../utils/operationTypes'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PendingBooking {
  bookingId: string
  guestName: string
  checkIn: string
  roomTypeNames: string[]
  totalRooms: number
  nights: number
}

// ── Utility ───────────────────────────────────────────────────────────────────

/** Group unassigned stays into pending bookings (today & overdue only). */
export function computePendingBookings(
  unassignedStays: UnassignedStay[],
  todayISO: string,
): PendingBooking[] {
  const map = new Map<string, PendingBooking>()
  for (const s of unassignedStays) {
    if (s.status === 'CANCELLED' || s.status === 'CHECKED_OUT') continue
    const ci = toDateStr(s.check_in)
    if (ci >= todayISO) continue
    const existing = map.get(s.booking_id)
    if (existing) {
      existing.totalRooms++
      if (!existing.roomTypeNames.includes(s.room_type_name)) {
        existing.roomTypeNames.push(s.room_type_name)
      }
    } else {
      map.set(s.booking_id, {
        bookingId: s.booking_id,
        guestName: s.guest_name,
        checkIn: ci,
        roomTypeNames: [s.room_type_name],
        totalRooms: 1,
        nights: differenceInDays(parseISO(s.check_out), parseISO(s.check_in)),
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.checkIn.localeCompare(b.checkIn))
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface MobileBookingItemProps {
  booking: PendingBooking
  onAssign: (bookingId: string) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export const MobileBookingItem = React.memo(function MobileBookingItem({
  booking,
  onAssign,
}: MobileBookingItemProps) {
  return (
    <CardButton
      onClick={() => onAssign(booking.bookingId)}
      className="active:bg-muted/50"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-body font-semibold truncate">{booking.guestName}</span>
        <span className="text-helper shrink-0 tabular-nums">
          {booking.totalRooms} ห้อง · {fmtShortISO(booking.checkIn)}
        </span>
      </div>
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-helper">{booking.roomTypeNames.join(', ')}</span>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
      </div>
    </CardButton>
  )
})
