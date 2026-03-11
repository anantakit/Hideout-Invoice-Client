import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { differenceInDays, isToday, isBefore, startOfDay, parseISO, format, addDays } from 'date-fns'
import { ArrowLeft, CheckCircle2, X, Loader2, Phone, User, CalendarClock, Receipt, FileText, Clock, ArrowRightLeft, CreditCard, DoorOpen, LogIn, LogOut, Ban, Timer, Wand2, Repeat } from 'lucide-react'
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../../shared/ui/sheet'
import { useIsMobile } from '../../../shared/hooks/useIsMobile'
import { formatThaiDate, formatTHB } from '../../../shared/utils'
import { ROUTES } from '@/app/routes'
import ErrorPage from '@/shared/components/ErrorPage'
import { useBooking, useCancelStay, useExtendStay, useCheckInRooms, useCheckoutRooms, useAvailabilityGrouped, useTransferRoom } from '../hooks'
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
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
          onClick={() => navigate('/bookings')}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          รายการจอง
        </Button>

        <Card>
          <CardContent className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-section">
                    #{booking.id.slice(0, 8).toUpperCase()}
                  </h1>
                  <Badge variant={bookingStatusVariant(booking.status)}>
                    {getStatusLabel(booking.status)}
                  </Badge>
                  <Badge variant="outline" className="text-micro">
                    {booking.source === 'walk_in' ? 'Walk-in' : booking.source === 'online' ? 'Online' : 'จองล่วงหน้า'}
                  </Badge>
                </div>
                <p className="text-helper mt-1">
                  สร้างเมื่อ {formatThaiDate(booking.created_at)}
                </p>
              </div>
            </div>

            <Separator className="my-3" />

            {/* Guest info inline */}
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                <span className="text-body font-medium">{booking.guest_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                <span className="text-body">{booking.guest_phone}</span>
              </div>
              {booking.customer_name && (
                <div className="flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-body text-muted-foreground">ผู้ชำระเงิน: {booking.customer_name}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Room Assignment Status + Check-in CTA ────────────────── */}
      {bd.pending.length > 0 && bd.allAssigned && (
        <Button
          className="w-full"
          onClick={() => navigate(ROUTES.bookings.groupCheckIn(id))}
        >
          <LogIn className="w-4 h-4 mr-1.5" />
          เช็คอิน ({bd.pending.length} ห้อง)
        </Button>
      )}

      {bd.totalActive > 0 && !bd.allAssigned && (
        <Card>
          <CardContent className="px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body font-semibold">กำหนดห้อง</p>
                <p className="text-helper mt-0.5">
                  {bd.assignedCount} / {bd.totalActive} ห้อง
                </p>
              </div>
              <Badge variant="amber">
                เหลือ {bd.unassigned.length} ห้อง
              </Badge>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 radius-badge bg-secondary overflow-hidden">
              <div
                className="h-full radius-badge bg-primary transition-all"
                style={{ width: `${(bd.assignedCount / bd.totalActive) * 100}%` }}
              />
            </div>

            {bd.pending.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => navigate(ROUTES.bookings.groupCheckIn(id))}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                กำหนดห้อง + เช็คอิน ({bd.pending.length} ห้อง)
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── 4. Available Rooms (only when rooms still need assigning) ── */}
      {hasPending && !bd.allAssigned && (
        <Card>
          <CardHeader className="px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-body">ห้องว่าง</CardTitle>
              <div className="flex radius-button border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAvailMode('today')}
                  className={cn(
                    'px-2.5 py-1 text-caption transition-colors',
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
                    'px-2.5 py-1 text-caption transition-colors',
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

          <CardContent className="px-4 pt-0 pb-3 space-y-3">
            {availLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : noRoomsAvailable ? (
              <div className="py-4 text-center">
                <p className="text-helper">
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
                              className="flex items-center justify-between radius-button border border-border bg-card px-3 py-2"
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


// ─── StayCardOperational ──────────────────────────────────────────────────────

function StayCardOperational({
  bookingId,
  stay,
}: {
  bookingId: string
  stay: RoomStayResponse
}) {
  const [cancelOpen, setCancelOpen]       = useState(false)
  const [extendOpen, setExtendOpen]       = useState(false)
  const [checkoutOpen, setCheckoutOpen]   = useState(false)
  const [transferOpen, setTransferOpen]   = useState(false)
  const [newCheckOut, setNewCheckOut]     = useState('')

  const isMobile = useIsMobile()
  const cancel   = useCancelStay(bookingId)
  const extend   = useExtendStay(bookingId)
  const checkout = useCheckoutRooms(bookingId)
  const transfer = useTransferRoom(bookingId)

  // Fetch available rooms for transfer (all types, same dates)
  const transferQuery = useAvailabilityGrouped(
    stay.check_in.slice(0, 10),
    stay.check_out.slice(0, 10),
    transferOpen,
  )
  const transferRoomGroups = useMemo(() => {
    if (!transferQuery.data) return []
    return transferQuery.data.room_types
      .map((t) => ({
        typeId: t.room_type_id,
        typeName: t.room_type_name,
        pricePerNight: t.price_per_night,
        isSameType: t.room_type_id === stay.room_type_id,
        rooms: t.rooms.filter((r) => r.available && r.room_id !== stay.room_id),
      }))
      .filter((g) => g.rooms.length > 0)
  }, [transferQuery.data, stay.room_type_id, stay.room_id])

  const nights       = calcNights(stay.check_in, stay.check_out)
  const checkInDate  = formatThaiDate(stay.check_in)
  const checkOutDate = formatThaiDate(stay.check_out)

  const isActive         = stay.status === 'RESERVED' || stay.status === 'ASSIGNED'
  const isCheckedIn      = stay.status === 'CHECKED_IN'
  const canExtend        = isActive || isCheckedIn
  const canTransfer      = (isCheckedIn || stay.status === 'ASSIGNED') && Boolean(stay.room_id)
  const showTodayBadge   = isActive && isCheckInToday(stay.check_in)
  const showOverdueBadge = isActive && isCheckInOverdue(stay.check_in)

  // Minimum date for extend is the day after current check-out
  const currentCheckOutISO = stay.check_out.slice(0, 10)

  return (
    <Card className={cn(showOverdueBadge && 'border-destructive/40')}>
      <CardContent className="px-4 py-3 space-y-3">

        {/* ── Header row ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {stay.room_number && (
              <span className="text-room-number">{stay.room_number}</span>
            )}
            <div>
              <p className="text-body font-medium">{stay.room_type_name}</p>
              <p className={cn(
                'text-helper',
                showOverdueBadge ? 'text-destructive' : '',
              )}>
                {fmtShortISO(stay.check_in)} → {fmtShortISO(stay.check_out)} · {nights} คืน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
            {showOverdueBadge && <Badge variant="red">เกินกำหนด</Badge>}
            {showTodayBadge && !showOverdueBadge && <Badge variant="amber">วันนี้</Badge>}
            <Badge variant={stayStatusVariant(stay.status)}>
              {getStatusLabel(stay.status)}
            </Badge>
          </div>
        </div>

        {/* ── Transfer origin indicator ────────────────────────────────────── */}
        {stay.transfer_from_stay_id && (
          <p className="text-micro text-info flex items-center gap-1">
            <ArrowRightLeft className="w-3 h-3" />
            ย้ายมาจากห้องอื่น
          </p>
        )}

        {/* ── Action buttons ──────────────────────────────────────────────── */}
        {(isActive || canExtend) && (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {isCheckedIn && (
              <Button
                variant="default"
                size="sm"
                disabled={checkout.isPending}
                onClick={() => setCheckoutOpen(true)}
              >
                {checkout.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4 mr-1.5" />
                )}
                เช็คเอาท์
              </Button>
            )}
            {canTransfer && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTransferOpen(true)}
              >
                <ArrowRightLeft className="w-4 h-4 mr-1.5" />
                ย้ายห้อง
              </Button>
            )}
            {canExtend && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => { setNewCheckOut(''); setExtendOpen(true) }}
              >
                <CalendarClock className="w-4 h-4 mr-1.5" />
                ขยายเวลา
              </Button>
            )}
            {isActive && (
              <Button
                variant="ghost"
                size="sm"
                disabled={cancel.isPending}
                className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                onClick={() => setCancelOpen(true)}
              >
                {cancel.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <X className="w-4 h-4 mr-1.5" />
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

      {/* ── Extend stay — shared body ────────────────────────────────────── */}
      {(() => {
        const canConfirm = Boolean(newCheckOut && newCheckOut > currentCheckOutISO && !extend.isPending)
        const handleExtendConfirm = () => {
          if (!canConfirm) return
          extend.mutate(
            { stayId: stay.id, payload: { new_check_out: newCheckOut } },
            {
              onSuccess: () => { setExtendOpen(false); toast.success('ขยายวันเช็คเอาท์สำเร็จ') },
              onError: (err) => { toast.error((err as Error).message || 'เกิดข้อผิดพลาด กรุณาลองใหม่') },
            },
          )
        }

        const extendBody = (
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-body text-muted-foreground">
                เช็คอิน: {formatThaiDate(stay.check_in)} → เช็คเอาท์: {checkOutDate}
              </p>
              <p className="text-helper">({nights} คืน)</p>
            </div>
            <div>
              <label className="text-caption block mb-1.5">เพิ่มจำนวนคืน</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 5, 7].map((n) => {
                  const target = format(addDays(parseISO(currentCheckOutISO), n), 'yyyy-MM-dd')
                  const isSelected = newCheckOut === target
                  return (
                    <Button
                      key={n}
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      className="tabular-nums"
                      onClick={() => setNewCheckOut(target)}
                    >
                      +{n}
                    </Button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="text-caption block mb-1.5">หรือเลือกวันที่</label>
              <Input
                type="date"
                min={currentCheckOutISO}
                value={newCheckOut}
                onChange={(e) => setNewCheckOut(e.target.value)}
              />
            </div>
            {newCheckOut && newCheckOut > currentCheckOutISO && (() => {
              const extraNights = differenceInDays(parseISO(newCheckOut), parseISO(currentCheckOutISO))
              const totalNights = nights + extraNights
              return (
                <div className="radius-card border border-border bg-card space-card">
                  <p className="text-body">
                    เช็คเอาท์ใหม่: <span className="font-semibold">{formatThaiDate(newCheckOut)}</span>
                  </p>
                  <p className="text-helper mt-0.5">
                    เพิ่ม {extraNights} คืน → รวม {totalNights} คืน
                  </p>
                </div>
              )
            })()}
          </div>
        )

        const extendActions = (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={extend.isPending} onClick={() => setExtendOpen(false)}>
              ยกเลิก
            </Button>
            <Button className="flex-1" disabled={!canConfirm} onClick={handleExtendConfirm}>
              {extend.isPending ? 'กำลังบันทึก…' : 'ยืนยัน'}
            </Button>
          </div>
        )

        return isMobile ? (
          <Sheet open={extendOpen} onOpenChange={setExtendOpen}>
            <SheetContent side="bottom" className="rounded-t-2xl px-5 pt-5 pb-6">
              <SheetHeader className="pb-3 text-left">
                <SheetTitle>ขยายวันเช็คเอาท์</SheetTitle>
                <SheetDescription className="sr-only">เลือกวันเช็คเอาท์ใหม่</SheetDescription>
              </SheetHeader>
              {extendBody}
              <div className="pt-4">{extendActions}</div>
            </SheetContent>
          </Sheet>
        ) : (
          <AlertDialog open={extendOpen} onOpenChange={setExtendOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>ขยายวันเช็คเอาท์</AlertDialogTitle>
                <AlertDialogDescription className="sr-only">เลือกวันเช็คเอาท์ใหม่</AlertDialogDescription>
              </AlertDialogHeader>
              {extendBody}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={extend.isPending}>ยกเลิก</AlertDialogCancel>
                <AlertDialogAction disabled={!canConfirm} onClick={handleExtendConfirm}>
                  {extend.isPending ? 'กำลังบันทึก…' : 'ยืนยัน'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )
      })()}

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

      {/* ── Transfer room ─────────────────────────────────────────────────── */}
      {(() => {
        const transferDesc = isCheckedIn
          ? `ย้ายจากห้อง ${stay.room_number} (${stay.room_type_name}) — ระบบจะเช็คเอาท์ห้องเดิมอัตโนมัติ`
          : `เปลี่ยนจากห้อง ${stay.room_number} (${stay.room_type_name})`

        const transferBody = (
          <div className="space-y-4">
            {transferQuery.isLoading ? (
              <div className="flex items-center gap-2 py-4 justify-center text-helper">
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังโหลด...
              </div>
            ) : transferRoomGroups.length === 0 ? (
              <p className="text-helper py-4 text-center">ไม่มีห้องว่าง</p>
            ) : (
              transferRoomGroups
                .sort((a, b) => (a.isSameType ? -1 : b.isSameType ? 1 : 0))
                .map((group) => {
                  const sameTypePrice = transferRoomGroups.find((g) => g.isSameType)?.pricePerNight ?? 0
                  const diff = group.pricePerNight - sameTypePrice
                  return (
                    <div key={group.typeId}>
                      <div className="flex items-baseline justify-between mb-1.5">
                        <p className="text-label text-foreground">
                          {group.typeName}
                          {group.isSameType && (
                            <span className="text-helper font-normal ml-1">(ประเภทเดียวกัน)</span>
                          )}
                        </p>
                        {!group.isSameType && (
                          <span className={cn(
                            'text-micro font-medium',
                            diff > 0 ? 'text-warning' : diff < 0 ? 'text-success' : 'text-muted-foreground',
                          )}>
                            {formatTHB(group.pricePerNight)}/คืน
                            {diff !== 0 && ` (${diff > 0 ? '+' : ''}${formatTHB(diff)})`}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {group.rooms.map((room) => (
                          <Button
                            key={room.room_id}
                            variant={group.isSameType ? 'outline' : 'ghost'}
                            size="sm"
                            disabled={transfer.isPending}
                            className={cn(!group.isSameType && 'border border-border-soft')}
                            onClick={() => {
                              transfer.mutate(
                                { stayId: stay.id, roomId: room.room_id },
                                {
                                  onSuccess: () => {
                                    setTransferOpen(false)
                                    toast.success(`ย้ายไปห้อง ${room.room_number} สำเร็จ`)
                                  },
                                  onError: (err) => {
                                    toast.error((err as Error).message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
                                  },
                                },
                              )
                            }}
                          >
                            {transfer.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              room.room_number
                            )}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )
                })
            )}

            {transferRoomGroups.some((g) => !g.isSameType) && (
              <p className="text-micro text-muted-foreground/70 border-t border-border pt-2">
                * ราคาต่อคืนจะยังเป็นราคาเดิม สามารถแก้ไขภายหลังได้
              </p>
            )}
          </div>
        )

        return isMobile ? (
          <Sheet open={transferOpen} onOpenChange={setTransferOpen}>
            <SheetContent side="bottom" className="rounded-t-2xl px-5 pt-5 pb-6 max-h-[85vh] flex flex-col">
              <SheetHeader className="pb-3 text-left shrink-0">
                <SheetTitle>ย้ายห้อง</SheetTitle>
                <SheetDescription className="text-body text-muted-foreground">{transferDesc}</SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto">{transferBody}</div>
              <div className="pt-4 shrink-0">
                <Button variant="outline" className="w-full" disabled={transfer.isPending} onClick={() => setTransferOpen(false)}>
                  ยกเลิก
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <AlertDialog open={transferOpen} onOpenChange={setTransferOpen}>
            <AlertDialogContent className="max-h-[80vh] flex flex-col">
              <AlertDialogHeader>
                <AlertDialogTitle>ย้ายห้อง</AlertDialogTitle>
                <AlertDialogDescription>{transferDesc}</AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex-1 overflow-y-auto">{transferBody}</div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={transfer.isPending}>ยกเลิก</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )
      })()}
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
      <CardHeader className="px-4 py-3">
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
      <CardContent className="px-4 pt-0 pb-3">
        {booking.invoices && booking.invoices.length > 0 ? (
          <div className="space-y-2">
            {booking.invoices.map((inv: InvoiceResponseShort) => (
              <Link
                key={inv.id}
                to={`/receipts/${inv.id}`}
                className="flex items-center justify-between radius-button border border-border bg-card px-3 py-2.5 hover:bg-accent/60 transition-colors"
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
                  <p className="text-helper">{desc}</p>
                </RadioCardItem>
              ))}
            </RadioCardGroup>

            {/* Stay selection for mode=stay */}
            {billingMode === 'stay' && (
              <div className="pl-2 space-y-1.5 pt-1">
                <p className="text-helper font-medium mb-1">เลือกห้อง:</p>
                {stays.map((stay) => (
                  <CheckboxCard
                    key={stay.id}
                    checked={selectedStayIds.includes(stay.id)}
                    onCheckedChange={() => toggleStayId(stay.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-body">
                        {stay.room_number ? `ห้อง ${stay.room_number}` : stay.room_type_name}
                      </span>
                      <span className="text-helper">
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
                  <p className="text-helper font-medium mb-1">เลือกห้อง:</p>
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
                      <p className="text-helper font-medium mb-1">เลือกวันที่:</p>
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

// ─── Event config (icon + color per action) ─────────────────────────────────

type EventConfig = { label: string; icon: typeof Clock; color: string }

const EVENT_CONFIG: Record<string, EventConfig> = {
  BOOKING_CREATED:  { label: 'สร้างการจอง',         icon: FileText,       color: 'text-primary' },
  PAYMENT_RECEIVED: { label: 'รับชำระเงิน',         icon: CreditCard,     color: 'text-success' },
  PAYMENT_REFUNDED: { label: 'คืนเงิน',             icon: CreditCard,     color: 'text-warning' },
  ROOM_ASSIGNED:    { label: 'มอบหมายห้อง',         icon: DoorOpen,       color: 'text-primary' },
  AUTO_ASSIGNED:    { label: 'มอบหมายอัตโนมัติ',   icon: Wand2,          color: 'text-primary' },
  CHECKED_IN:       { label: 'เช็คอิน',             icon: LogIn,          color: 'text-success' },
  CHECKED_OUT:      { label: 'เช็คเอาท์',           icon: LogOut,         color: 'text-muted-foreground' },
  STAY_CANCELLED:   { label: 'ยกเลิกห้อง',         icon: Ban,            color: 'text-destructive' },
  STAY_EXTENDED:    { label: 'ขยายเวลา',            icon: Timer,          color: 'text-info' },
  STAY_MOVED:       { label: 'ย้ายห้อง',            icon: Repeat,         color: 'text-info' },
  ROOM_TRANSFERRED: { label: 'ย้ายห้อง',            icon: ArrowRightLeft, color: 'text-info' },
  INVOICE_ISSUED:   { label: 'ออกใบเสร็จ',          icon: Receipt,        color: 'text-foreground' },
}

const DEFAULT_EVENT: EventConfig = { label: '', icon: Clock, color: 'text-muted-foreground' }

/** Replace ISO dates (YYYY-MM-DD) in event detail text with short Thai format */
function formatEventDetail(detail: string): string {
  return detail.replace(/\d{4}-\d{2}-\d{2}/g, (match) => {
    try { return fmtShortISO(match) } catch { return match }
  })
}

// ─── EventTimeline ───────────────────────────────────────────────────────────

function EventTimeline({ events }: { events: BookingEventResponse[] }) {
  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-helper font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4" />
          ประวัติกิจกรรม
          <span className="text-micro font-normal text-muted-foreground/70 ml-auto">{events.length} รายการ</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-3">
        <div className="space-y-0">
          {events.map((ev, i) => {
            const cfg = EVENT_CONFIG[ev.action] ?? DEFAULT_EVENT
            const Icon = cfg.icon
            return (
              <div key={ev.id} className="flex gap-3">
                {/* Timeline line + icon */}
                <div className="flex flex-col items-center">
                  <div className={cn('mt-1 shrink-0', cfg.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {i < events.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>
                {/* Content */}
                <div className="pb-4 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="text-body font-medium">
                      {cfg.label || ev.action}
                    </p>
                    <span className="text-micro text-muted-foreground/70">
                      {formatThaiDate(ev.created_at)}
                    </span>
                  </div>
                  <p className="text-helper mt-0.5">{formatEventDetail(ev.detail)}</p>
                  {ev.actor && (
                    <p className="text-micro text-muted-foreground/50 mt-0.5">
                      โดย {ev.actor}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
