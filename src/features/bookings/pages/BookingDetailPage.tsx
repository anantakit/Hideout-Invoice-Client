import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { differenceInDays, isToday, isBefore, startOfDay, parseISO } from 'date-fns'
import { ArrowLeft, CheckCircle2, X, Loader2, Phone, User, CalendarClock } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/shared/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card'
import { Button } from '../../../shared/ui/button'
import { Badge } from '../../../shared/ui/badge'
import { Separator } from '../../../shared/ui/separator'
import { Input } from '../../../shared/ui/input'
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
import { ROUTES } from '@/app/routes'
import { useBooking, useCancelStay, useExtendStay } from '../hooks'
import { PaymentPanel } from '../components/PaymentPanel'
import type { RoomStayResponse } from '../types'

// ─── Status helpers ────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'gray' | 'green' | 'red' | 'amber'

function bookingStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'PARTIALLY_CHECKED_IN': return 'amber'
    case 'CHECKED_IN':           return 'green'
    case 'CHECKED_OUT':          return 'gray'
    case 'CANCELLED':            return 'red'
    default:                     return 'gray'  // RESERVED
  }
}

function bookingStatusLabel(status: string): string {
  switch (status) {
    case 'RESERVED':             return 'รอดำเนินการ'
    case 'PARTIALLY_CHECKED_IN': return 'เช็คอินบางส่วน'
    case 'CHECKED_IN':           return 'เช็คอินแล้ว'
    case 'CHECKED_OUT':          return 'เช็คเอาท์แล้ว'
    case 'CANCELLED':            return 'ยกเลิกแล้ว'
    default:                     return status
  }
}

function stayStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'ASSIGNED':    return 'default'
    case 'CHECKED_IN':  return 'green'
    case 'CHECKED_OUT': return 'gray'
    case 'CANCELLED':   return 'red'
    default:            return 'gray'  // RESERVED
  }
}

function stayStatusLabel(status: string): string {
  switch (status) {
    case 'RESERVED':    return 'รอกำหนดห้อง'
    case 'ASSIGNED':    return 'กำหนดห้องแล้ว'
    case 'CHECKED_IN':  return 'เช็คอินแล้ว'
    case 'CHECKED_OUT': return 'เช็คเอาท์แล้ว'
    case 'CANCELLED':   return 'ยกเลิกแล้ว'
    default:            return status
  }
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function calcNights(checkIn: string, checkOut: string): number {
  try {
    return Math.max(0, differenceInDays(parseISO(checkOut), parseISO(checkIn)))
  } catch {
    return 0
  }
}

function isCheckInToday(checkIn: string): boolean {
  try {
    return isToday(parseISO(checkIn))
  } catch {
    return false
  }
}

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

  const pendingStays = booking.room_stays.filter(
    (s) => s.status === 'RESERVED' || s.status === 'ASSIGNED',
  )

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
          <Badge variant={bookingStatusVariant(booking.status)}>
            {bookingStatusLabel(booking.status)}
          </Badge>
        </div>
      </div>

      <Separator />

      <GuestInfoCard guestName={booking.guest_name} guestPhone={booking.guest_phone} />

      <PaymentPanel booking={booking} />

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">
            รายการห้องพัก
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {booking.room_stays.length} ห้อง
            </span>
          </h2>
          {pendingStays.length > 0 && (
            <Button size="sm" onClick={() => navigate(ROUTES.bookings.groupCheckIn(id))}>
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              เช็คอิน
            </Button>
          )}
        </div>
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
  const [cancelOpen, setCancelOpen]   = useState(false)
  const [extendOpen, setExtendOpen]   = useState(false)
  const [newCheckOut, setNewCheckOut] = useState('')

  const cancel = useCancelStay(bookingId)
  const extend = useExtendStay(bookingId)

  const nights       = calcNights(stay.check_in, stay.check_out)
  const checkInDate  = formatThaiDate(stay.check_in)
  const checkOutDate = formatThaiDate(stay.check_out)

  const isActive         = stay.status === 'RESERVED' || stay.status === 'ASSIGNED'
  const isCheckedIn      = stay.status === 'CHECKED_IN'
  const canExtend        = isActive || isCheckedIn
  const showTodayBadge   = isActive && isCheckInToday(stay.check_in)
  const showOverdueBadge = isActive && isCheckInOverdue(stay.check_in)

  // Minimum date for extend is the day after current check-out
  const currentCheckOutISO = stay.check_out.slice(0, 10)

  return (
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

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {showOverdueBadge && <Badge variant="red">เกินกำหนด</Badge>}
            {showTodayBadge && !showOverdueBadge && <Badge variant="amber">เช็คอินวันนี้</Badge>}
            <Badge variant={stayStatusVariant(stay.status)}>
              {stayStatusLabel(stay.status)}
            </Badge>
          </div>
        </div>

        {/* ── Dates ────────────────────────────────────────────────────────── */}
        <p className={cn(
          'text-sm',
          showOverdueBadge ? 'text-destructive' : 'text-muted-foreground',
        )}>
          {checkInDate} → {checkOutDate}
          <span className="ml-2">({nights} คืน)</span>
        </p>

        {/* ── Action buttons ──────────────────────────────────────────────── */}
        {(isActive || canExtend) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {canExtend && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setNewCheckOut(''); setExtendOpen(true) }}
              >
                <CalendarClock className="w-4 h-4 mr-2" />
                ขยายวันเช็คเอาท์
              </Button>
            )}
            {isActive && (
              <Button
                variant="outline"
                size="sm"
                disabled={cancel.isPending}
                className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setCancelOpen(true)}
              >
                {cancel.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <X className="w-4 h-4 mr-2" />
                )}
                ยกเลิก
              </Button>
            )}
          </div>
        )}

      </CardContent>

      {/* ── Cancel confirmation ─────────────────────────────────────────────── */}
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
            <AlertDialogCancel disabled={cancel.isPending}>ไม่ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                cancel.mutate(stay.id, {
                  onSuccess: () => {
                    setCancelOpen(false)
                    toast.success('ยกเลิกรายการสำเร็จ')
                  },
                  onError: (err) => {
                    toast.error(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
                  },
                })
              }}
            >
              ยืนยันยกเลิก
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Extend stay dialog ─────────────────────────────────────────────── */}
      <AlertDialog open={extendOpen} onOpenChange={setExtendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ขยายวันเช็คเอาท์</AlertDialogTitle>
            <AlertDialogDescription>
              วันเช็คเอาท์ปัจจุบัน: {checkOutDate}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 py-2">
            <label className="text-sm font-medium block mb-1.5">วันเช็คเอาท์ใหม่</label>
            <Input
              type="date"
              min={currentCheckOutISO}
              value={newCheckOut}
              onChange={(e) => setNewCheckOut(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={extend.isPending}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              disabled={!newCheckOut || newCheckOut <= currentCheckOutISO || extend.isPending}
              onClick={() => {
                extend.mutate(
                  { stayId: stay.id, payload: { new_check_out: newCheckOut } },
                  {
                    onSuccess: () => {
                      setExtendOpen(false)
                      toast.success('ขยายวันเช็คเอาท์สำเร็จ')
                    },
                    onError: (err) => {
                      toast.error((err as Error).message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
                    },
                  },
                )
              }}
            >
              {extend.isPending ? 'กำลังบันทึก…' : 'ยืนยัน'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
