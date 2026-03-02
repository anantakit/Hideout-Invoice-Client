import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { differenceInDays, isToday, isBefore, startOfDay, parseISO } from 'date-fns'
import { ArrowLeft, BedDouble, LogIn, X, Loader2, Phone, User } from 'lucide-react'
import { cn } from '@/shared/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card'
import { Button } from '../../../shared/ui/button'
import { Badge } from '../../../shared/ui/badge'
import { Separator } from '../../../shared/ui/separator'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '../../../shared/ui/alert-dialog'
import { formatThaiDate } from '../../../shared/utils'
import { useBooking, useStayActions } from '../hooks'
import { AssignRoomModal } from '../components/AssignRoomModal'
import type { RoomStayResponse } from '../types'

// ─── Overall status helpers ───────────────────────────────────────────────────

// Backend stay statuses (domain.RoomStayStatus*):
//   RESERVED   → newly created, waiting for room assignment
//   ASSIGNED   → specific room assigned, waiting for check-in
//   CHECKED_IN → guest checked in
//   CANCELLED  → stay cancelled

type OverallStatus = 'RESERVED' | 'PARTIAL_ASSIGNED' | 'CHECKED_IN' | 'CANCELLED'

function computeOverallStatus(stays: RoomStayResponse[]): OverallStatus {
  if (stays.length === 0) return 'RESERVED'
  const active = stays.filter((s) => s.status !== 'CANCELLED')
  if (active.length === 0) return 'CANCELLED'
  if (active.every((s) => s.status === 'CHECKED_IN')) return 'CHECKED_IN'
  if (active.some((s) => s.status === 'ASSIGNED' || s.status === 'CHECKED_IN'))
    return 'PARTIAL_ASSIGNED'
  return 'RESERVED'
}

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'gray' | 'green' | 'red' | 'amber'

function stayStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'ASSIGNED':    return 'default'
    case 'CHECKED_IN':  return 'green'
    case 'CANCELLED':   return 'red'
    default:            return 'gray'   // RESERVED
  }
}

function stayStatusLabel(status: string): string {
  switch (status) {
    case 'RESERVED':    return 'รอกำหนดห้อง'
    case 'ASSIGNED':    return 'กำหนดห้องแล้ว'
    case 'CHECKED_IN':  return 'เช็คอินแล้ว'
    case 'CANCELLED':   return 'ยกเลิกแล้ว'
    default:            return status
  }
}

function overallStatusVariant(status: OverallStatus): BadgeVariant {
  switch (status) {
    case 'PARTIAL_ASSIGNED': return 'default'
    case 'CHECKED_IN':       return 'green'
    case 'CANCELLED':        return 'red'
    default:                 return 'gray'
  }
}

function overallStatusLabel(status: OverallStatus): string {
  switch (status) {
    case 'RESERVED':         return 'รอดำเนินการ'
    case 'PARTIAL_ASSIGNED': return 'กำลังดำเนินการ'
    case 'CHECKED_IN':       return 'เช็คอินแล้ว'
    case 'CANCELLED':        return 'ยกเลิกแล้ว'
  }
}

// ─── Date helpers (safeguards 4, 5, 6) ───────────────────────────────────────

/** #6 — Derive nights from the actual date range, ignoring backend stay.nights. */
function calcNights(checkIn: string, checkOut: string): number {
  try {
    return Math.max(0, differenceInDays(parseISO(checkOut), parseISO(checkIn)))
  } catch {
    return 0
  }
}

/** #4 — True when the check-in calendar date equals today. */
function isCheckInToday(checkIn: string): boolean {
  try {
    return isToday(parseISO(checkIn))
  } catch {
    return false
  }
}

/** #5 — True when the check-in calendar date is strictly before today. */
function isCheckInOverdue(checkIn: string): boolean {
  try {
    return isBefore(startOfDay(parseISO(checkIn)), startOfDay(new Date()))
  } catch {
    return false
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BookingDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: booking, isLoading, isError } = useBooking(id)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/bookings')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          กลับ
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            ไม่พบข้อมูลการจอง
          </CardContent>
        </Card>
      </div>
    )
  }

  const overallStatus = computeOverallStatus(booking.room_stays)

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-10 space-y-6">
      {/* Back + title */}
      <div className="space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
          onClick={() => navigate('/bookings')}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          รายการจอง
        </Button>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              #{booking.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="text-sm text-muted-foreground">
              สร้างเมื่อ {formatThaiDate(booking.created_at)}
            </p>
          </div>
          <Badge variant={overallStatusVariant(overallStatus)}>
            {overallStatusLabel(overallStatus)}
          </Badge>
        </div>
      </div>

      <Separator />

      <GuestInfoCard guestName={booking.guest_name} guestPhone={booking.guest_phone} />

      <div className="space-y-4">
        <h2 className="text-base font-semibold">
          รายการห้องพัก
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {booking.room_stays.length} ห้อง
          </span>
        </h2>
        {booking.room_stays.map((stay) => (
          <StayCardOperational key={stay.id} bookingId={booking.id} stay={stay} />
        ))}
      </div>
    </div>
  )
}

// ─── GuestInfoCard ────────────────────────────────────────────────────────────

function GuestInfoCard({ guestName, guestPhone }: { guestName: string; guestPhone: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground">ข้อมูลผู้เข้าพัก</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex items-center gap-3">
          <User className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium">{guestName}</span>
        </div>
        <div className="flex items-center gap-3">
          <Phone className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span className="text-sm">{guestPhone}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── StayCardOperational ──────────────────────────────────────────────────────

function StayCardOperational({
  bookingId,
  stay,
}: {
  bookingId: string
  stay: RoomStayResponse
}) {
  const [assignOpen,  setAssignOpen]  = useState(false)
  const [cancelOpen,  setCancelOpen]  = useState(false)
  const [checkInOpen, setCheckInOpen] = useState(false)

  const actions = useStayActions(bookingId, stay.id)

  // ── Derived state ──────────────────────────────────────────────────────────

  // #6 — Nights from actual dates, not backend value.
  const nights = calcNights(stay.check_in, stay.check_out)

  const checkInDate  = formatThaiDate(stay.check_in)
  const checkOutDate = formatThaiDate(stay.check_out)

  const isActive = stay.status === 'RESERVED' || stay.status === 'ASSIGNED'

  // #4 — Check-in is today (only meaningful while still actionable).
  const showTodayBadge   = isActive && isCheckInToday(stay.check_in)
  // #5 — Check-in date has passed without the guest being checked in.
  const showOverdueBadge = isActive && isCheckInOverdue(stay.check_in)

  // #2 — room_id must be set before check-in is permitted.
  const hasRoom = Boolean(stay.room_id)

  return (
    // #5 — Subtle red border when overdue.
    <Card className={cn(showOverdueBadge && 'border-destructive/40')}>
      <CardContent className="p-5 space-y-4">

        {/* ── Header row ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">{stay.room_type_name}</p>
            {stay.room_number && (
              <p className="text-sm text-muted-foreground">ห้อง {stay.room_number}</p>
            )}
          </div>

          {/* Status + urgency badges */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {/* #5 — Overdue takes priority over today badge. */}
            {showOverdueBadge && <Badge variant="red">เกินกำหนด</Badge>}
            {/* #4 — Today warning (only when not also overdue). */}
            {showTodayBadge && !showOverdueBadge && <Badge variant="amber">เช็คอินวันนี้</Badge>}
            <Badge variant={stayStatusVariant(stay.status)}>
              {stayStatusLabel(stay.status)}
            </Badge>
          </div>
        </div>

        {/* ── Dates — #5 red text when overdue ──────────────────────────── */}
        <p className={cn(
          'text-sm',
          showOverdueBadge ? 'text-destructive' : 'text-muted-foreground',
        )}>
          {checkInDate} → {checkOutDate}
          {/* #6 — nights derived from date arithmetic */}
          <span className="ml-2">({nights} คืน)</span>
        </p>

        {/* ── Action buttons ─────────────────────────────────────────────── */}
        {isActive && (
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-1">

            {/* Assign room — #3 visible for RESERVED + ASSIGNED; disabled once assigned. */}
            <Button
              variant="outline"
              size="sm"
              disabled={stay.status !== 'RESERVED' || actions.loading}
              onClick={() => setAssignOpen(true)}
            >
              <BedDouble className="w-4 h-4 mr-2" />
              กำหนดห้อง
            </Button>

            {/* Check-in — only for ASSIGNED; #2 further gated on room_id presence. */}
            {stay.status === 'ASSIGNED' && (
              <Button
                size="sm"
                disabled={!hasRoom || actions.loading}
                onClick={() => setCheckInOpen(true)}
              >
                {actions.loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4 mr-2" />
                )}
                เช็คอิน
              </Button>
            )}

            {/* #1 — Cancel always opens a confirmation dialog (never fires directly). */}
            <Button
              variant="outline"
              size="sm"
              disabled={actions.loading}
              className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setCancelOpen(true)}
            >
              {actions.loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              ยกเลิก
            </Button>
          </div>
        )}

        {/* #2 — Hint when assigned but room_id is unexpectedly absent. */}
        {stay.status === 'ASSIGNED' && !hasRoom && (
          <p className="text-xs text-muted-foreground">
            ยังไม่ได้กำหนดห้องพัก — กรุณากำหนดห้องก่อนเช็คอิน
          </p>
        )}

        {/* Inline error to complement the toast */}
        {actions.error && (
          <p className="text-xs text-destructive">{actions.error}</p>
        )}

      </CardContent>

      {/* ── Assign room modal ─────────────────────────────────────────────── */}
      <AssignRoomModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        stay={stay}
        confirmLoading={actions.loading}
        onConfirm={(roomId) => {
          setAssignOpen(false)
          actions.assignRoom(roomId)
        }}
      />

      {/* ── #1 Cancel confirmation ────────────────────────────────────────── */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการยกเลิก</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการยกเลิกห้อง {stay.room_type_name} ({checkInDate} – {checkOutDate}) ใช่หรือไม่?
              การยกเลิกไม่สามารถเลิกทำได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actions.loading}>ไม่ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={actions.cancelStay}
            >
              ยืนยันยกเลิก
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Check-in confirmation ─────────────────────────────────────────── */}
      <AlertDialog open={checkInOpen} onOpenChange={setCheckInOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการเช็คอิน</AlertDialogTitle>
            <AlertDialogDescription>
              เช็คอิน{stay.room_number ? ` ห้อง ${stay.room_number}` : ''} ({stay.room_type_name})
              วันที่ {checkInDate} ถึง {checkOutDate} ใช่หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actions.loading}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={actions.checkInStay}>
              ยืนยันเช็คอิน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
