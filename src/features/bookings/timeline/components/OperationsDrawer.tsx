import React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/shared/utils'
import { Button } from '@/shared/ui/button'
import { type TimelineBooking, type TimelineRoom, type UnassignedStay } from '../../types'
import { DesktopOperationsPanel } from './DesktopOperationsPanel'
import { BookingDetailContent } from './BookingDetailContent'
import { InlineCreateBookingForm } from './InlineCreateBookingForm'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type DrawerMode = 'ops' | 'booking-detail' | 'create-booking' | null

export interface SelectedBookingContext {
  booking: TimelineBooking
  roomNumbers: string[]
}

export interface CreateBookingPrefill {
  roomId: string
  roomTypeId: string
  roomNumber: string
  roomTypeName: string
  pricePerNight: number
  checkIn: string   // YYYY-MM-DD
  checkOut: string   // YYYY-MM-DD
}

interface OperationsDrawerProps {
  mode: DrawerMode
  onClose: () => void

  // Booking detail props
  selectedBooking: SelectedBookingContext | null
  /** Quick check-in action from drawer. */
  onQuickCheckIn?: (booking: TimelineBooking, roomId?: string) => void
  /** Check-out action — calls mutation directly (cards have their own confirm). */
  onDirectCheckOut?: (booking: TimelineBooking) => void
  /** Navigate to full detail page. */
  onOpenDetail?: (booking: TimelineBooking) => void

  // Create booking props
  createBookingPrefill?: CreateBookingPrefill | null
  /** Called after successful booking creation — receives the new booking ID. */
  onBookingCreated?: (bookingId: string) => void

  // Ops panel props
  rooms: TimelineRoom[]
  todayStr: string
  roomTypeNameMap: Record<string, string>
  unassignedStays: UnassignedStay[]
}

// ─── Ops Content ───────────────────────────────────────────────────────────────

function OpsContent({
  rooms,
  todayStr,
  roomTypeNameMap,
  unassignedStays,
  onClose,
  onDirectCheckOut,
}: {
  rooms: TimelineRoom[]
  todayStr: string
  roomTypeNameMap: Record<string, string>
  unassignedStays: UnassignedStay[]
  onClose: () => void
  onDirectCheckOut?: (booking: TimelineBooking) => void
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-border-soft">
        <span className="text-sm font-semibold text-foreground">ปฏิบัติการวันนี้</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7 shrink-0"
          aria-label="ปิด"
        >
          <X size={14} />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <DesktopOperationsPanel
          rooms={rooms}
          selectedDateStr={todayStr}
          roomTypeNameMap={roomTypeNameMap}
          unassignedStays={unassignedStays}
          onDirectCheckOut={onDirectCheckOut}
        />
      </div>
    </div>
  )
}

// ─── Main Drawer Component ─────────────────────────────────────────────────────

const DRAWER_WIDTH = 420

export const OperationsDrawer = React.memo(function OperationsDrawer({
  mode,
  onClose,
  selectedBooking,
  // onQuickCheckIn — no longer used; check-in handled inline via InlineCheckIn
  onDirectCheckOut,
  onOpenDetail,
  createBookingPrefill,
  onBookingCreated,
  rooms,
  todayStr,
  roomTypeNameMap,
  unassignedStays,
}: OperationsDrawerProps) {
  const isOpen = mode !== null

  return (
    <div
      className={cn(
        'shrink-0 h-full border-l border-border-soft bg-card overflow-hidden transition-[width] duration-220 ease-in-out',
      )}
      style={{ width: isOpen ? DRAWER_WIDTH : 0 }}
    >
      <div
        className="h-full overflow-hidden"
        style={{ width: DRAWER_WIDTH }}
      >
        {mode === 'booking-detail' && selectedBooking && (
          <BookingDetailContent
            key={selectedBooking.booking.booking_id + selectedBooking.booking.room_stay_id}
            selected={selectedBooking}
            onClose={onClose}
            onOpenDetail={onOpenDetail}
          />
        )}

        {mode === 'create-booking' && createBookingPrefill && (
          <InlineCreateBookingForm
            key={`${createBookingPrefill.roomId}-${createBookingPrefill.checkIn}`}
            prefill={createBookingPrefill}
            onClose={onClose}
            onBookingCreated={onBookingCreated}
          />
        )}

        {mode === 'ops' && (
          <OpsContent
            rooms={rooms}
            todayStr={todayStr}
            roomTypeNameMap={roomTypeNameMap}
            unassignedStays={unassignedStays}
            onClose={onClose}
            onDirectCheckOut={onDirectCheckOut}
          />
        )}
      </div>
    </div>
  )
})
