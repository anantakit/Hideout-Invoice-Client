import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { differenceInDays, isToday, isBefore, startOfDay, parseISO, format, addDays } from 'date-fns'
import { ArrowLeft, CheckCircle2, X, Loader2, Phone, User, CalendarClock, Receipt, FileText, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/shared/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card'
import { Button } from '../../../shared/ui/button'
import { Badge } from '../../../shared/ui/badge'
import { Separator } from '../../../shared/ui/separator'
import { Input } from '../../../shared/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/ui/select'
import { RadioCardGroup, RadioCardItem } from '../../../shared/ui/radio-card-group'
import { CheckboxCard } from '../../../shared/ui/checkbox-card'
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
import { formatThaiDate, formatTHB } from '../../../shared/utils'
import { ROUTES } from '@/app/routes'
import ErrorPage from '@/shared/components/ErrorPage'
import { useBooking, useCancelStay, useExtendStay, useCheckInRooms, useCheckoutRooms, useAvailabilityGrouped } from '../hooks'
import { PaymentPanel } from '../components/PaymentPanel'
import { type RoomStayResponse, type BookingEventResponse, type BookingResponse, type InvoiceResponseShort, getStatusLabel } from '../types'

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


function stayStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'ASSIGNED':    return 'default'
    case 'CHECKED_IN':  return 'green'
    case 'CHECKED_OUT': return 'gray'
    case 'CANCELLED':   return 'red'
    default:            return 'gray'  // RESERVED
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
      <ErrorPage
        variant="error"
        title="ไม่พบข้อมูลการจอง"
        description="รายการจองนี้อาจถูกลบไปแล้ว หรือเกิดข้อผิดพลาดในการโหลดข้อมูล"
      />
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
            <p className="text-helper">
              สร้างเมื่อ {formatThaiDate(booking.created_at)}
            </p>
          </div>
          <Badge variant={bookingStatusVariant(booking.status)}>
            {getStatusLabel(booking.status)}
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
                <p className="text-body font-semibold">สถานะกำหนดห้อง</p>
                <p className="text-helper mt-0.5">
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
              <CardTitle className="text-body">ห้องว่าง</CardTitle>
              <div className="flex radius-button border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAvailMode('today')}
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium transition-colors',
                    availMode === 'today'
                      ? 'date-selected'
                      : 'bg-card text-muted-foreground date-hover',
                  )}
                >
                  วันนี้
                </button>
                <button
                  type="button"
                  onClick={() => setAvailMode('range')}
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium transition-colors',
                    availMode === 'range'
                      ? 'date-selected'
                      : 'bg-card text-muted-foreground date-hover',
                  )}
                >
                  ช่วงเข้าพัก
                </button>
              </div>
            </div>
            <p className="text-helper">
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
              <div className="py-4 text-center">
                <p className="text-sm text-muted-foreground">
                  ไม่มีห้องว่างสำหรับช่วงเวลาที่เลือก
                </p>
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
                        <span className="text-body font-medium">{rt.room_type_name}</span>
                        <div className="flex items-center gap-1.5">
                          {isFull && (
                            <Badge variant="destructive" className="text-helper px-1.5 py-0">เต็ม</Badge>
                          )}
                          {nearFull && !isFull && (
                            <Badge variant="amber" className="text-helper px-1.5 py-0">ใกล้เต็ม</Badge>
                          )}
                          <span className={cn(
                            'text-body font-semibold tabular-nums',
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
                              <span className="text-body">ห้อง {room.room_number}</span>
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
        <h2 className="text-section">
          รายการห้องพัก
          <span className="ml-2 text-body font-normal text-muted-foreground">
            {booking.room_stays.length} ห้อง
          </span>
        </h2>
        {booking.room_stays.map((stay) => (
          <StayCardOperational key={stay.id} bookingId={booking.id} stay={stay} />
        ))}
      </div>

      {/* ── 6. Payment ─────────────────────────────────────────────────── */}
      <PaymentPanel booking={booking} />

      {/* ── 7. Receipts ────────────────────────────────────────────────── */}
      <ReceiptSection bookingId={id} booking={booking} navigate={navigate} stays={bd.active} />

      {/* ── 8. Event Timeline ──────────────────────────────────────────── */}
      {booking.events && booking.events.length > 0 && (
        <EventTimeline events={booking.events} />
      )}
    </div>
  )
}

// ─── GuestInfoCard ────────────────────────────────────────────────────────────

function GuestInfoCard({ guestName, guestPhone }: { guestName: string; guestPhone: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-helper font-semibold">ข้อมูลผู้เข้าพัก</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex items-center gap-3">
          <User className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span className="text-body font-medium">{guestName}</span>
        </div>
        <div className="flex items-center gap-3">
          <Phone className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span className="text-body">{guestPhone}</span>
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
  const [cancelOpen, setCancelOpen]     = useState(false)
  const [extendOpen, setExtendOpen]     = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [newCheckOut, setNewCheckOut]   = useState('')

  const cancel   = useCancelStay(bookingId)
  const extend   = useExtendStay(bookingId)
  const checkout = useCheckoutRooms(bookingId)

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
              <p className="text-helper">ห้อง {stay.room_number}</p>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {showOverdueBadge && <Badge variant="red">เกินกำหนด</Badge>}
            {showTodayBadge && !showOverdueBadge && <Badge variant="amber">เช็คอินวันนี้</Badge>}
            <Badge variant={stayStatusVariant(stay.status)}>
              {getStatusLabel(stay.status)}
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
            {isCheckedIn && (
              <Button
                variant="default"
                size="sm"
                disabled={checkout.isPending}
                onClick={() => setCheckoutOpen(true)}
              >
                {checkout.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                เช็คเอาท์
              </Button>
            )}
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

      {/* ── Checkout confirmation ─────────────────────────────────────────── */}
      <AlertDialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันเช็คเอาท์</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการเช็คเอาท์ห้อง {stay.room_number ?? stay.room_type_name} ใช่หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={checkout.isPending}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              disabled={checkout.isPending}
              onClick={() => {
                checkout.mutate([stay.id], {
                  onSuccess: () => {
                    setCheckoutOpen(false)
                    toast.success('เช็คเอาท์สำเร็จ')
                  },
                  onError: (err) => {
                    toast.error((err as Error).message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
                  },
                })
              }}
            >
              {checkout.isPending ? 'กำลังดำเนินการ…' : 'ยืนยันเช็คเอาท์'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

// ─── ReceiptSection ──────────────────────────────────────────────────────────

type BillingMode = 'booking' | 'stay' | 'night'

function ReceiptSection({
  bookingId,
  booking,
  navigate,
  stays,
}: {
  bookingId: string
  booking: BookingResponse
  navigate: (path: string) => void
  stays: RoomStayResponse[]
}) {
  const [showModeSelect, setShowModeSelect] = useState(false)
  const [billingMode, setBillingMode] = useState<BillingMode>('booking')
  const [selectedStayIds, setSelectedStayIds] = useState<string[]>([])
  const [selectedStayId, setSelectedStayId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')

  function handleConfirm() {
    const params = new URLSearchParams({ booking_id: bookingId })
    if (billingMode !== 'booking') params.set('mode', billingMode)
    if (billingMode === 'stay' && selectedStayIds.length > 0) {
      params.set('stay_ids', selectedStayIds.join(','))
    }
    if (billingMode === 'night' && selectedStayId) {
      params.set('stay_ids', selectedStayId)
      if (selectedDate) params.set('date', selectedDate)
    }
    setShowModeSelect(false)
    navigate(`/receipts/new?${params.toString()}`)
  }

  function toggleStayId(id: string) {
    setSelectedStayIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
  }

  const canConfirm =
    billingMode === 'booking' ||
    (billingMode === 'stay' && selectedStayIds.length > 0) ||
    (billingMode === 'night' && selectedStayId && selectedDate)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-helper font-semibold flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            ใบเสร็จ
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-xs"
            onClick={() => setShowModeSelect(true)}
          >
            <FileText className="w-3.5 h-3.5 mr-1" />
            ออกใบเสร็จ
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {booking.invoices && booking.invoices.length > 0 ? (
          <div className="space-y-2">
            {booking.invoices.map((inv: InvoiceResponseShort) => (
              <Link
                key={inv.id}
                to={`/receipts/${inv.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 hover:bg-accent/60 transition-colors"
              >
                <div>
                  <p className="text-body font-medium text-primary">{inv.invoice_number}</p>
                  <p className="text-helper">{formatThaiDate(inv.issue_date)}</p>
                </div>
                <span className="text-body font-semibold">{formatTHB(inv.total)}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-helper text-center py-3">ยังไม่มีใบเสร็จ</p>
        )}
      </CardContent>

      {/* Billing mode dialog */}
      <AlertDialog open={showModeSelect} onOpenChange={setShowModeSelect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>เลือกรูปแบบใบเสร็จ</AlertDialogTitle>
            <AlertDialogDescription>
              เลือกวิธีออกใบเสร็จสำหรับการจองนี้
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2">
            {/* Mode selection cards */}
            <RadioCardGroup
              value={billingMode}
              onValueChange={(val) => {
                setBillingMode(val as 'booking' | 'stay' | 'night')
                setSelectedStayIds([])
                setSelectedStayId('')
                setSelectedDate('')
              }}
            >
              {([
                ['booking', 'ทั้งการจอง', 'รวมทุกห้องในใบเสร็จเดียว'],
                ['stay', 'แยกตามห้อง', 'เลือกห้องที่ต้องการออกใบเสร็จ'],
                ['night', 'รายวัน', 'ออกใบเสร็จสำหรับคืนที่เลือก'],
              ] as const).map(([value, label, desc]) => (
                <RadioCardItem key={value} value={value}>
                  <p className="text-body font-medium">{label}</p>
                  <p className="text-helper text-xs">{desc}</p>
                </RadioCardItem>
              ))}
            </RadioCardGroup>

            {/* Stay selection for mode=stay */}
            {billingMode === 'stay' && (
              <div className="pl-2 space-y-1.5 pt-1">
                <p className="text-helper text-xs font-medium mb-1">เลือกห้อง:</p>
                {stays.map((stay) => (
                  <CheckboxCard
                    key={stay.id}
                    checked={selectedStayIds.includes(stay.id)}
                    onCheckedChange={() => toggleStayId(stay.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-body text-sm">
                        {stay.room_number ? `ห้อง ${stay.room_number}` : stay.room_type_name}
                      </span>
                      <span className="text-helper text-xs">
                        {stay.nights} คืน
                      </span>
                    </div>
                  </CheckboxCard>
                ))}
              </div>
            )}

            {/* Stay + date selection for mode=night */}
            {billingMode === 'night' && (
              <div className="pl-2 space-y-2 pt-1">
                <div>
                  <p className="text-helper text-xs font-medium mb-1">เลือกห้อง:</p>
                  <Select
                    value={selectedStayId || undefined}
                    onValueChange={(val) => {
                      setSelectedStayId(val)
                      setSelectedDate('')
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือก..." />
                    </SelectTrigger>
                    <SelectContent sheetTitle="เลือกห้อง">
                      {stays.map((stay) => (
                        <SelectItem key={stay.id} value={stay.id}>
                          {stay.room_number ? `ห้อง ${stay.room_number}` : stay.room_type_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedStayId && (() => {
                  const stay = stays.find((s) => s.id === selectedStayId)
                  if (!stay) return null
                  return (
                    <div>
                      <p className="text-helper text-xs font-medium mb-1">เลือกวันที่:</p>
                      <Input
                        type="date"
                        value={selectedDate}
                        min={stay.check_in.slice(0, 10)}
                        max={(() => {
                          // max = check_out - 1 day (last night)
                          const co = parseISO(stay.check_out)
                          return format(addDays(co, -1), 'yyyy-MM-dd')
                        })()}
                        onChange={(e) => setSelectedDate(e.target.value)}
                      />
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction disabled={!canConfirm} onClick={handleConfirm}>
              ต่อไป
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

// ─── Event action labels (Thai) ──────────────────────────────────────────────

const EVENT_LABEL_TH: Record<string, string> = {
  BOOKING_CREATED:  'สร้างการจอง',
  PAYMENT_RECEIVED: 'รับชำระเงิน',
  PAYMENT_REFUNDED: 'คืนเงิน',
  ROOM_ASSIGNED:    'มอบหมายห้อง',
  AUTO_ASSIGNED:    'มอบหมายอัตโนมัติ',
  CHECKED_IN:       'เช็คอิน',
  CHECKED_OUT:      'เช็คเอาท์',
  STAY_CANCELLED:   'ยกเลิกห้อง',
  STAY_EXTENDED:    'ขยายเวลา',
  STAY_MOVED:       'ย้ายห้อง',
  ROOM_TRANSFERRED: 'ย้ายห้อง',
  INVOICE_ISSUED:   'ออกใบเสร็จ',
}

// ─── EventTimeline ───────────────────────────────────────────────────────────

function EventTimeline({ events }: { events: BookingEventResponse[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-helper font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4" />
          ประวัติกิจกรรม
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-0">
          {events.map((ev, i) => (
            <div key={ev.id} className="flex gap-3">
              {/* Timeline line + dot */}
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                {i < events.length - 1 && <div className="w-px flex-1 bg-border" />}
              </div>
              {/* Content */}
              <div className="pb-4 min-w-0">
                <p className="text-body font-medium">
                  {EVENT_LABEL_TH[ev.action] ?? ev.action}
                </p>
                <p className="text-helper text-sm">{ev.detail}</p>
                <p className="text-helper text-xs mt-0.5">
                  {formatThaiDate(ev.created_at)}
                  {ev.actor && ` · ${ev.actor}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
