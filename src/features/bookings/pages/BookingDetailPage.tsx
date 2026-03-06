import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { differenceInDays, isToday, isBefore, startOfDay, parseISO, format, addDays } from 'date-fns'
import { ArrowLeft, CheckCircle2, X, Loader2, Phone, User, CalendarClock, Calendar } from 'lucide-react'
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
import { useBooking, useCancelStay, useExtendStay, useCheckInRooms, useAvailabilityGrouped } from '../hooks'
import { PaymentPanel } from '../components/PaymentPanel'
import type { RoomStayResponse } from '../types'

// ─── Status helpers ────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'gray' | 'green' | 'red' | 'amber'

function bookingStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'CONFIRMED':            return 'default'
    case 'PARTIALLY_CHECKED_IN': return 'amber'
    case 'CHECKED_IN':           return 'green'
    case 'CHECKED_OUT':          return 'gray'
    case 'CANCELLED':            return 'red'
    default:                     return 'gray'
  }
}

function bookingStatusLabel(status: string): string {
  switch (status) {
    case 'CONFIRMED':            return 'ยืนยันแล้ว'
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

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

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

function fmtShortISO(iso: string): string {
  try {
    const d = parseISO(iso)
    return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`
  } catch { return iso }
}

/**
 * Near-full: only for room types with total >= 5 and available <= 20%.
 * Small inventory types (< 5 rooms) never show near-full.
 */
function isNearFull(available: number, total: number): boolean {
  if (available === 0 || total < 5) return false
  return available / total <= 0.20
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BookingDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: booking, isLoading, isError } = useBooking(id)
  const assignRoom = useCheckInRooms(id)

  const [availMode, setAvailMode] = useState<'range' | 'today'>('range')
  const [assigningRoomId, setAssigningRoomId] = useState<string | null>(null)

  // ── Derived booking data ──────────────────────────────────────────────────
  const bd = useMemo(() => {
    if (!booking) return null

    const active = booking.room_stays.filter((s) => s.status !== 'CANCELLED')
    const pending = active.filter((s) => s.status === 'RESERVED' || s.status === 'ASSIGNED')
    const unassigned = pending.filter((s) => !s.room_id)
    const assignedCount = active.filter(
      (s) => s.room_id || s.status === 'CHECKED_IN' || s.status === 'CHECKED_OUT',
    ).length

    const assignedRoomIds = new Set(
      active.filter((s) => s.room_id).map((s) => s.room_id!),
    )

    const unassignedByType = new Map<string, RoomStayResponse[]>()
    for (const s of unassigned) {
      const list = unassignedByType.get(s.room_type_id) ?? []
      list.push(s)
      unassignedByType.set(s.room_type_id, list)
    }

    const rangeCI = pending.length > 0
      ? pending.reduce((min, s) => (s.check_in < min ? s.check_in : min), pending[0].check_in).slice(0, 10)
      : ''
    const rangeCO = pending.length > 0
      ? pending.reduce((max, s) => (s.check_out > max ? s.check_out : max), pending[0].check_out).slice(0, 10)
      : ''

    return {
      active,
      pending,
      unassigned,
      assignedCount,
      totalActive: active.length,
      assignedRoomIds,
      unassignedByType,
      rangeCI,
      rangeCO,
      allAssigned: unassigned.length === 0,
    }
  }, [booking])

  // ── Availability query ────────────────────────────────────────────────────
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  const effCI = availMode === 'today' ? todayStr : (bd?.rangeCI ?? '')
  const effCO = availMode === 'today' ? tomorrowStr : (bd?.rangeCO ?? '')
  const hasPending = (bd?.pending.length ?? 0) > 0

  const { data: availability, isLoading: availLoading } = useAvailabilityGrouped(
    effCI, effCO, hasPending, id,
  )

  // ── Quick assign handler ──────────────────────────────────────────────────
  function handleQuickAssign(roomTypeId: string, roomId: string) {
    const staysOfType = bd?.unassignedByType.get(roomTypeId)
    if (!staysOfType?.[0]) return

    setAssigningRoomId(roomId)
    assignRoom.mutate(
      [{ room_stay_id: staysOfType[0].id, room_id: roomId }],
      {
        onSuccess: () => {
          toast.success('กำหนดห้องเรียบร้อย')
          setAssigningRoomId(null)
        },
        onError: (err: Error) => {
          toast.error(err.message || 'เกิดข้อผิดพลาด')
          setAssigningRoomId(null)
        },
      },
    )
  }

  // ── Loading / Error ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !booking || !bd) {
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

  // Check if ALL room types show zero availability
  const noRoomsAvailable = availability != null &&
    availability.room_types.every((rt) => rt.rooms.every((r) => !r.available))

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-10 space-y-6">

      {/* ── 1. Header ──────────────────────────────────────────────────── */}
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

      {/* ── 2. Reservation Summary (Guest Info) ────────────────────────── */}
      <GuestInfoCard guestName={booking.guest_name} guestPhone={booking.guest_phone} />

      {/* ── 3. Room Assignment Status ──────────────────────────────────── */}
      {bd.totalActive > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">สถานะกำหนดห้อง</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {bd.assignedCount} / {bd.totalActive} ห้องกำหนดแล้ว
                </p>
              </div>
              <Badge variant={bd.allAssigned ? 'green' : 'amber'}>
                {bd.allAssigned ? 'ครบแล้ว' : `เหลือ ${bd.unassigned.length} ห้อง`}
              </Badge>
            </div>

            {/* Progress bar */}
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  bd.allAssigned ? 'bg-success' : 'bg-primary',
                )}
                style={{ width: `${(bd.assignedCount / bd.totalActive) * 100}%` }}
              />
            </div>

            {bd.pending.length > 0 && (
              <Button
                variant={bd.allAssigned ? 'default' : 'outline'}
                size="sm"
                className="w-full"
                onClick={() => navigate(ROUTES.bookings.groupCheckIn(id))}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                {bd.allAssigned
                  ? `เช็คอิน (${bd.pending.length} ห้อง)`
                  : `กำหนดห้อง + เช็คอิน (${bd.pending.length} ห้อง)`}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── 4. Available Rooms ─────────────────────────────────────────── */}
      {hasPending && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">ห้องว่าง</CardTitle>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAvailMode('today')}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-medium transition-colors',
                    availMode === 'today'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-muted',
                  )}
                >
                  วันนี้
                </button>
                <button
                  type="button"
                  onClick={() => setAvailMode('range')}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-medium transition-colors',
                    availMode === 'range'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-muted',
                  )}
                >
                  ช่วงเข้าพัก
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {availMode === 'today'
                ? 'ห้องว่างสำหรับวันนี้'
                : `ว่างตลอดช่วง ${fmtShortISO(effCI)} → ${fmtShortISO(effCO)}`}
            </p>
          </CardHeader>

          <CardContent className="pt-0 space-y-3">
            {bd.allAssigned ? (
              <div className="py-4 text-center">
                <CheckCircle2 className="w-5 h-5 mx-auto text-success mb-1.5" />
                <p className="text-sm text-muted-foreground">ทุกห้องกำหนดเรียบร้อยแล้ว</p>
              </div>
            ) : availLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : noRoomsAvailable ? (
              <div className="py-4 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  ไม่มีห้องว่างสำหรับช่วงเวลาที่เลือก
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(ROUTES.occupancy.month)}
                >
                  <Calendar className="w-4 h-4 mr-1.5" />
                  ดูปฏิทินห้องว่าง
                </Button>
              </div>
            ) : availability ? (
              <div className="space-y-3">
                {availability.room_types.map((rt) => {
                  const totalRooms = rt.rooms.length
                  const availableRooms = rt.rooms.filter(
                    (r) => r.available && !bd.assignedRoomIds.has(r.room_id),
                  )
                  const availableCount = availableRooms.length
                  const isFull = availableCount === 0
                  const nearFull = isNearFull(availableCount, totalRooms)
                  const canAssign = bd.unassignedByType.has(rt.room_type_id) && availableCount > 0

                  return (
                    <div key={rt.room_type_id}>
                      {/* Room type header */}
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-sm font-medium">{rt.room_type_name}</span>
                        <div className="flex items-center gap-1.5">
                          {isFull && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">เต็ม</Badge>
                          )}
                          {nearFull && !isFull && (
                            <Badge variant="amber" className="text-[10px] px-1.5 py-0">ใกล้เต็ม</Badge>
                          )}
                          <span className={cn(
                            'text-sm font-semibold tabular-nums',
                            isFull ? 'text-destructive' : 'text-foreground',
                          )}>
                            {availableCount} ว่าง
                          </span>
                        </div>
                      </div>

                      {/* Assignable rooms */}
                      {canAssign && (
                        <div className="ml-1 space-y-1.5 mt-1 mb-2">
                          {availableRooms.map((room) => (
                            <div
                              key={room.room_id}
                              className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
                            >
                              <span className="text-sm">ห้อง {room.room_number}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-3 text-xs"
                                disabled={assignRoom.isPending}
                                onClick={() => handleQuickAssign(rt.room_type_id, room.room_id)}
                              >
                                {assigningRoomId === room.room_id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  'Assign'
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* ── 5. Room Stays ──────────────────────────────────────────────── */}
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

      {/* ── 6. Payment ─────────────────────────────────────────────────── */}
      <PaymentPanel booking={booking} />
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
