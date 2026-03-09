import React from 'react'
import { useNavigate } from 'react-router-dom'
import { differenceInDays, parseISO } from 'date-fns'
import {
  X,
  DoorOpen,
  CheckCircle2,
  CircleAlert,
  ChevronRight,
  LogIn,
  LogOut,
  Banknote,
  FileText,
} from 'lucide-react'
import { cn } from '@/shared/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'
import { type TimelineBooking, type TimelineRoom, type UnassignedStay, getStatusLabel } from '../../types'
import { DesktopOperationsPanel } from './DesktopOperationsPanel'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type DrawerMode = 'ops' | 'booking-detail' | null

export interface SelectedBookingContext {
  booking: TimelineBooking
  roomNumbers: string[]
}

interface OperationsDrawerProps {
  mode: DrawerMode
  onClose: () => void

  // Booking detail props
  selectedBooking: SelectedBookingContext | null
  /** Quick check-in action from drawer. */
  onQuickCheckIn?: (booking: TimelineBooking, roomId?: string) => void
  /** Quick check-out action from drawer. */
  onQuickCheckOut?: (booking: TimelineBooking) => void
  /** Navigate to full detail page. */
  onOpenDetail?: (booking: TimelineBooking) => void

  // Ops panel props
  rooms: TimelineRoom[]
  todayStr: string
  roomTypeNameMap: Record<string, string>
  unassignedStays: UnassignedStay[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

function formatTHB(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
  }).format(amount)
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

// ─── Booking Detail Content ────────────────────────────────────────────────────

function BookingDetailContent({
  selected,
  onClose,
  onQuickCheckIn,
  onQuickCheckOut,
  onOpenDetail,
}: {
  selected: SelectedBookingContext
  onClose: () => void
  onQuickCheckIn?: (booking: TimelineBooking, roomId?: string) => void
  onQuickCheckOut?: (booking: TimelineBooking) => void
  onOpenDetail?: (booking: TimelineBooking) => void
}) {
  const navigate = useNavigate()
  const { booking, roomNumbers } = selected
  const hasBalance = Number(booking.balance_amount) > 0
  const nights = differenceInDays(parseISO(booking.check_out), parseISO(booking.check_in))
  const status = booking.status

  // Determine primary action based on status
  const canCheckIn = status === 'RESERVED' || status === 'ASSIGNED' || status === 'CONFIRMED'
  const canCheckOut = status === 'CHECKED_IN'
  const isTerminal = status === 'CHECKED_OUT' || status === 'CANCELLED'

  const handleOpenDetail = () => {
    if (onOpenDetail) {
      onOpenDetail(booking)
    } else {
      navigate(`/bookings/${booking.booking_id}`)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-border-soft">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-foreground truncate">
            {booking.guest_name}
          </span>
          <Badge variant={statusVariant(booking.status)} className="shrink-0">
            {getStatusLabel(booking.status)}
          </Badge>
        </div>
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Dates */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">วันที่เข้าพัก</p>
          <p className="text-sm font-medium">
            {fmtThaiDate(booking.check_in)} → {fmtThaiDate(booking.check_out)}
            <span className="ml-1.5 text-muted-foreground font-normal">({nights} คืน)</span>
          </p>
        </div>

        <Separator />

        {/* Rooms */}
        {roomNumbers.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <DoorOpen className="w-3.5 h-3.5" />
              ห้องพัก
            </p>
            <div className="flex flex-wrap gap-1.5">
              {roomNumbers.map((rn) => (
                <Badge key={rn} variant="outline" className="text-xs px-2 py-0.5">
                  {rn}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {roomNumbers.length > 1 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            จองกลุ่ม {roomNumbers.length} ห้อง
          </p>
        )}

        <Separator />

        {/* Balance */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">ยอดค้างชำระ</span>
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

        {/* Booking source */}
        {booking.source && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">ช่องทาง</span>
              <span className="text-sm font-medium text-foreground capitalize">
                {booking.source === 'walk_in' ? 'Walk-in' : 'จองล่วงหน้า'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Footer — status-aware quick actions + detail link */}
      <div className="shrink-0 p-4 border-t border-border-soft space-y-2">
        {/* Primary action based on status */}
        {canCheckIn && onQuickCheckIn && (
          <Button
            className="w-full gap-1.5"
            variant="default"
            onClick={() => onQuickCheckIn(booking)}
          >
            <LogIn size={14} />
            เช็คอิน
          </Button>
        )}

        {canCheckOut && onQuickCheckOut && (
          <Button
            className="w-full gap-1.5 bg-info hover:bg-info/90 text-info-foreground"
            onClick={() => onQuickCheckOut(booking)}
          >
            <LogOut size={14} />
            เช็คเอาท์
          </Button>
        )}

        {isTerminal && (
          <Button
            className="w-full gap-1.5"
            variant="outline"
            onClick={handleOpenDetail}
          >
            <FileText size={14} />
            ดูใบเสร็จ
          </Button>
        )}

        {/* Secondary: open detail page */}
        {!isTerminal && (
          <Button
            className="w-full gap-1.5"
            variant="outline"
            onClick={handleOpenDetail}
          >
            เปิดรายละเอียด
            <ChevronRight size={14} />
          </Button>
        )}

        {/* Payment shortcut if balance > 0 */}
        {hasBalance && !isTerminal && (
          <Button
            className="w-full gap-1.5"
            variant="ghost"
            onClick={handleOpenDetail}
          >
            <Banknote size={14} />
            รับชำระเงิน
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Ops Content ───────────────────────────────────────────────────────────────

function OpsContent({
  rooms,
  todayStr,
  roomTypeNameMap,
  unassignedStays,
  onClose,
}: {
  rooms: TimelineRoom[]
  todayStr: string
  roomTypeNameMap: Record<string, string>
  unassignedStays: UnassignedStay[]
  onClose: () => void
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
  onQuickCheckIn,
  onQuickCheckOut,
  onOpenDetail,
  rooms,
  todayStr,
  roomTypeNameMap,
  unassignedStays,
}: OperationsDrawerProps) {
  const isOpen = mode !== null

  return (
    <div
      className={cn(
        'shrink-0 border-l border-border-soft bg-card overflow-hidden transition-[width] duration-220 ease-[cubic-bezier(0.4,0,0.2,1)]',
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
            onQuickCheckIn={onQuickCheckIn}
            onQuickCheckOut={onQuickCheckOut}
            onOpenDetail={onOpenDetail}
          />
        )}

        {mode === 'ops' && (
          <OpsContent
            rooms={rooms}
            todayStr={todayStr}
            roomTypeNameMap={roomTypeNameMap}
            unassignedStays={unassignedStays}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
})
