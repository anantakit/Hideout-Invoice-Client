import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { differenceInDays, isToday, isBefore, startOfDay, parseISO, addDays } from 'date-fns'
import { ArrowLeft, CheckCircle2, X, Loader2, Phone, User, CalendarClock, Receipt, FileText, Clock, ArrowRightLeft, CreditCard, DoorOpen, LogIn, LogOut, Ban, Timer, Wand2, Repeat, Pencil } from 'lucide-react'
import { Skeleton } from '@/shared/ui/skeleton'
import toast from 'react-hot-toast'
import { cn, fmtShortISO, todayISO } from '@/shared/utils'
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
import ErrorPage from '@/shared/components/ErrorPage'
import { useBooking, useCancelStay, useExtendStay, useCheckoutRooms, useAvailabilityGrouped, useTransferRoom, useUpdateBooking } from '../hooks'
import { InlineCheckIn } from '../components/InlineCheckIn'
import { EarlyCheckoutDialog } from '../components/EarlyCheckoutDialog'
import SearchableComboBox from '@/shared/ui/SearchableComboBox'
import { customersApi } from '../../customers/api'
import type { Customer } from '../../customers/types'
import { PaymentPanel } from '../components/PaymentPanel'
import { type RoomStayResponse, type BookingEventResponse, type BookingResponse, type InvoiceResponseShort, type ExtendStayConflictData, getStatusLabel } from '../types'

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


// ─── Room group mapper (shared by transfer + extend-conflict) ─────────────────

interface RoomGroupSource {
  room_types: Array<{
    room_type_id: string
    room_type_name: string
    price_per_night: number
    rooms: Array<{ room_id: string; room_number: string; available: boolean }>
  }>
}

function mapRoomGroups(
  source: RoomGroupSource,
  stayRoomTypeId: string,
  excludeRoomId?: string,
) {
  return source.room_types
    .map((t) => ({
      typeId: t.room_type_id,
      typeName: t.room_type_name,
      pricePerNight: t.price_per_night,
      isSameType: t.room_type_id === stayRoomTypeId,
      rooms: t.rooms.filter((r) => r.available && r.room_id !== excludeRoomId),
    }))
    .filter((g) => g.rooms.length > 0)
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Add n days to an ISO date string → ISO string (no date-fns format()) */
function addDaysToISO(iso: string, n: number): string {
  const d = addDays(parseISO(iso), n)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

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

  // ── Edit mode ───────────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editDiscount, setEditDiscount] = useState('')
  const [editCustomerId, setEditCustomerId] = useState<string | undefined>(undefined)
  const [editCustomerLabel, setEditCustomerLabel] = useState<string | undefined>(undefined)
  const updateBooking = useUpdateBooking(id)

  // ── Derived booking data ──────────────────────────────────────────────────
  const bd = useMemo(() => {
    if (!booking) return null

    const active = booking.room_stays.filter((s) => s.status !== 'CANCELLED')
    const pending = active.filter((s) => s.status === 'RESERVED' || s.status === 'ASSIGNED')

    return {
      active,
      pending,
    }
  }, [booking])

  // ── Edit mode handlers ───────────────────────────────────────────────────
  function startEdit() {
    if (!booking) return
    setEditName(booking.guest_name)
    setEditPhone(booking.guest_phone)
    setEditDiscount(String(booking.discount_amount || 0))
    setEditCustomerId(booking.customer_id ?? undefined)
    setEditCustomerLabel(booking.customer_name ?? undefined)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
  }

  function saveEdit() {
    if (!booking) return
    const payload: Record<string, unknown> = {}
    if (editName !== booking.guest_name) payload.guest_name = editName
    if (editPhone !== booking.guest_phone) payload.guest_phone = editPhone
    const disc = parseFloat(editDiscount) || 0
    if (disc !== booking.discount_amount) payload.discount_amount = disc
    if (editCustomerId !== (booking.customer_id ?? undefined)) {
      if (editCustomerId) {
        payload.customer_id = editCustomerId
      } else {
        payload.clear_customer = true
      }
    }
    if (Object.keys(payload).length === 0) {
      setEditing(false)
      return
    }
    updateBooking.mutate(payload as Parameters<typeof updateBooking.mutate>[0], {
      onSuccess: () => {
        toast.success('บันทึกการแก้ไขเรียบร้อย')
        setEditing(false)
      },
      onError: (err) => {
        toast.error((err as Error).message || 'เกิดข้อผิดพลาด')
      },
    })
  }

  // ── Loading / Error ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
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

  // Pending stays eligible for check-in (check_in <= today)
  const todayStr = todayISO()
  const checkInPendingStays = bd
    ? bd.pending.filter((s) => s.check_in.slice(0, 10) <= todayStr)
    : []

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-10 space-y-6">

      {/* ── 1. Header ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
          onClick={() => navigate(-1)}
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
                    {booking.source === 'walk_in' ? 'วอล์คอิน' : booking.source === 'online' ? 'ออนไลน์' : 'จองล่วงหน้า'}
                  </Badge>
                  {booking.key_deposit_amount > 0 && (
                    <Badge variant="amber" className="text-micro">
                      ประกันกุญแจ: {formatTHB(booking.key_deposit_amount)}
                    </Badge>
                  )}
                </div>
                <p className="text-helper mt-1">
                  สร้างเมื่อ {formatThaiDate(booking.created_at)}
                </p>
              </div>
              {!editing && booking.status !== 'CHECKED_OUT' && booking.status !== 'CANCELLED' && (
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground shrink-0" onClick={startEdit}>
                  <Pencil className="w-3.5 h-3.5 mr-1" />
                  แก้ไข
                </Button>
              )}
            </div>

            <Separator className="my-3" />

            {editing ? (
              /* ── Edit mode ── */
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-caption block mb-1">ชื่อผู้เข้าพัก</label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="ชื่อ-สกุล"
                    />
                  </div>
                  <div>
                    <label className="text-caption block mb-1">เบอร์โทร</label>
                    <Input
                      value={editPhone}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 10)
                        setEditPhone(v)
                      }}
                      placeholder="0812345678"
                      inputMode="tel"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-caption block mb-1">ส่วนลด (฿)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editDiscount}
                    onChange={(e) => setEditDiscount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-caption block mb-1">ผู้ชำระเงิน</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <SearchableComboBox<Customer>
                        value={editCustomerId ?? ''}
                        onChange={(val) => setEditCustomerId(val || undefined)}
                        onSelectItem={(item) => setEditCustomerLabel(item?.name)}
                        fetchFunction={(params) => customersApi.list(params)}
                        valueKey="id"
                        labelKey="name"
                        displayValue={editCustomerLabel}
                        placeholder="ค้นหาลูกค้า..."
                        sheetTitle="เลือกผู้ชำระเงิน"
                      />
                    </div>
                    {editCustomerId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive/70 shrink-0"
                        onClick={() => { setEditCustomerId(undefined); setEditCustomerLabel(undefined) }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1" disabled={updateBooking.isPending} onClick={cancelEdit}>
                    ยกเลิก
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={!editName.trim() || !editPhone.trim() || updateBooking.isPending}
                    onClick={saveEdit}
                  >
                    {updateBooking.isPending ? 'กำลังบันทึก…' : 'บันทึก'}
                  </Button>
                </div>
              </div>
            ) : (
              /* ── View mode ── */
              <div className="space-y-2">
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-body font-medium">{booking.guest_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-body">{booking.guest_phone}</span>
                  </div>
                </div>
                {booking.customer_name && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-body text-muted-foreground">ผู้ชำระเงิน: {booking.customer_name}</span>
                  </div>
                )}
                {booking.discount_amount > 0 && (
                  <div className="flex items-center gap-2">
                    <Receipt className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-body text-muted-foreground">ส่วนลด: {formatTHB(booking.discount_amount)}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 2. Inline Check-In (conditional) ────────────────────────── */}
      {checkInPendingStays.length > 0 && (
        <InlineCheckIn bookingId={id} pendingStays={checkInPendingStays} />
      )}

      {/* ── 3. Room Stays ──────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-section">
          รายการห้องพัก
          <span className="ml-2 text-body font-normal text-muted-foreground">
            {booking.room_stays.length} ห้อง
          </span>
        </h2>
        {booking.room_stays.map((stay) => (
          <StayCardOperational key={stay.id} bookingId={booking.id} stay={stay} booking={booking} />
        ))}
      </div>

      {/* ── 6. Payment ─────────────────────────────────────────────────── */}
      <PaymentPanel booking={booking} />

      {/* ── 7. Receipts ────────────────────────────────────────────────── */}
      <ReceiptSection bookingId={id} booking={booking} stays={bd.active} />

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
  booking,
}: {
  bookingId: string
  stay: RoomStayResponse
  booking?: BookingResponse
}) {
  const [cancelOpen, setCancelOpen]       = useState(false)
  const [extendOpen, setExtendOpen]       = useState(false)
  const [checkoutOpen, setCheckoutOpen]   = useState(false)
  const [transferOpen, setTransferOpen]   = useState(false)
  const [transferDate, setTransferDate]  = useState(todayISO)
  const [returnDate, setReturnDate]      = useState('')
  const [earlyCheckoutOpen, setEarlyCheckoutOpen] = useState(false)
  const [newCheckOut, setNewCheckOut]     = useState('')
  const [conflictData, setConflictData]   = useState<ExtendStayConflictData | null>(null)
  const [selectedTransferRoomId, setSelectedTransferRoomId] = useState<string | null>(null)

  const isMobile = useIsMobile()
  const cancel   = useCancelStay(bookingId)
  const extend   = useExtendStay(bookingId)
  const checkout = useCheckoutRooms(bookingId)
  const transfer = useTransferRoom(bookingId)

  // Fetch available rooms for transfer — when returning to original room,
  // only check availability for the temporary period (transferDate → returnDate).
  const transferAvailFrom = stay.status === 'CHECKED_IN' ? transferDate : stay.check_in.slice(0, 10)
  const transferAvailTo   = returnDate || stay.check_out.slice(0, 10)
  const transferQuery = useAvailabilityGrouped(
    transferAvailFrom,
    transferAvailTo,
    transferOpen,
  )
  const transferRoomGroups = useMemo(() => {
    if (!transferQuery.data) return []
    return mapRoomGroups(transferQuery.data, stay.room_type_id, stay.room_id)
  }, [transferQuery.data, stay.room_type_id, stay.room_id])

  const nights       = calcNights(stay.check_in, stay.check_out)
  const checkInDate  = formatThaiDate(stay.check_in)
  const checkOutDate = formatThaiDate(stay.check_out)

  const isActive         = stay.status === 'RESERVED' || stay.status === 'ASSIGNED'
  const isCheckedIn      = stay.status === 'CHECKED_IN'
  const canExtend        = isActive || isCheckedIn
  const canTransfer      = (isCheckedIn || stay.status === 'ASSIGNED') && Boolean(stay.room_id)
  const canEarlyCheckout = isCheckedIn && isBefore(startOfDay(new Date()), startOfDay(parseISO(stay.check_out)))
  const showTodayBadge   = isActive && isCheckInToday(stay.check_in)
  const showOverdueBadge = isActive && isCheckInOverdue(stay.check_in)

  // Conflict room groups for extend-with-transfer
  const conflictRoomGroups = useMemo(() => {
    if (!conflictData) return []
    return mapRoomGroups(conflictData, stay.room_type_id)
  }, [conflictData, stay.room_type_id])

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

        {/* ── Early checkout indicator ──────────────────────────────────── */}
        {stay.status === 'CHECKED_OUT' && stay.checked_out_at && (() => {
          const actualCheckOut = stay.checked_out_at!.slice(0, 10)
          const originalCheckOut = stay.check_out.slice(0, 10)
          if (actualCheckOut >= originalCheckOut) return null
          const origNights = calcNights(stay.check_in, originalCheckOut)
          const actualNights = calcNights(stay.check_in, actualCheckOut)
          return (
            <div className="rounded-lg border border-success/30 bg-success/5 p-2.5">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-success mt-0.5" />
                <div className="min-w-0">
                  <p className="text-micro font-semibold text-success">
                    เช็คเอาท์ก่อนกำหนด
                  </p>
                  <p className="text-micro text-muted-foreground mt-0.5">
                    <span className="line-through">{formatThaiDate(originalCheckOut)}</span>
                    {' → '}
                    <span className="font-semibold text-foreground">{formatThaiDate(actualCheckOut)}</span>
                    {' '}(ลดจาก {origNights} เหลือ {actualNights} คืน)
                  </p>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── Action buttons ──────────────────────────────────────────────── */}
        {(isActive || canExtend) && (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {isCheckedIn && (
              <Button
                variant="default"
                size="sm"
                disabled={checkout.isPending}
                onClick={() => canEarlyCheckout ? setEarlyCheckoutOpen(true) : setCheckoutOpen(true)}
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
                onClick={() => { setTransferDate(todayISO()); setReturnDate(''); setTransferOpen(true) }}
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

      {/* ── Extend stay — 2-step: pick date → pick room if conflict ──── */}
      {(() => {
        const hasConflict = conflictData !== null
        const canConfirmDate = Boolean(newCheckOut && newCheckOut > currentCheckOutISO && !extend.isPending)
        const canConfirmTransfer = hasConflict && Boolean(selectedTransferRoomId) && !extend.isPending

        // Step 1: submit date only → success or conflict
        const handleExtendSubmitDate = () => {
          if (!canConfirmDate) return
          extend.mutate(
            { stayId: stay.id, payload: { new_check_out: newCheckOut } },
            {
              onSuccess: (result) => {
                if (result.type === 'success') {
                  setExtendOpen(false)
                  setConflictData(null)
                  toast.success('ขยายวันเช็คเอาท์สำเร็จ')
                } else {
                  // Show room picker for the overflow period
                  setConflictData(result.conflict)
                  setSelectedTransferRoomId(null)
                }
              },
              onError: (err) => { toast.error((err as Error).message || 'เกิดข้อผิดพลาด กรุณาลองใหม่') },
            },
          )
        }

        // Step 2: submit with transfer room
        const handleExtendWithTransfer = () => {
          if (!canConfirmTransfer || !selectedTransferRoomId) return
          extend.mutate(
            { stayId: stay.id, payload: { new_check_out: newCheckOut, transfer_room_id: selectedTransferRoomId } },
            {
              onSuccess: (result) => {
                if (result.type === 'success') {
                  setExtendOpen(false)
                  setConflictData(null)
                  setSelectedTransferRoomId(null)
                  toast.success('ขยายเวลาและย้ายห้องสำเร็จ')
                } else {
                  toast.error('ห้องที่เลือกไม่ว่างแล้ว กรุณาเลือกห้องอื่น')
                  setConflictData(result.conflict)
                  setSelectedTransferRoomId(null)
                }
              },
              onError: (err) => { toast.error((err as Error).message || 'เกิดข้อผิดพลาด กรุณาลองใหม่') },
            },
          )
        }

        const handleExtendClose = (open: boolean) => {
          if (!open) { setConflictData(null); setSelectedTransferRoomId(null) }
          setExtendOpen(open)
        }

        // ── Date picker step (step 1) ──
        const datePickerBody = (
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
                  const target = addDaysToISO(currentCheckOutISO, n)
                  const isSelected = newCheckOut === target
                  return (
                    <Button
                      key={n}
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      className="tabular-nums"
                      onClick={() => { setNewCheckOut(target); setConflictData(null); setSelectedTransferRoomId(null) }}
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
                onChange={(e) => { setNewCheckOut(e.target.value); setConflictData(null); setSelectedTransferRoomId(null) }}
              />
            </div>
            {newCheckOut && newCheckOut > currentCheckOutISO && !hasConflict && (() => {
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

        // ── Conflict / room picker step (step 2) ──
        const conflictBody = hasConflict && (
          <div className="space-y-3">
            <div className="radius-card border border-warning/30 bg-warning/5 space-card">
              <p className="text-body font-medium text-warning">
                <Timer className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                ห้อง {stay.room_number} ว่างถึง {formatThaiDate(conflictData.available_until)} เท่านั้น
              </p>
              <p className="text-helper mt-1">
                เลือกห้องสำหรับช่วง {formatThaiDate(conflictData.available_until)} → {formatThaiDate(newCheckOut)}
              </p>
            </div>

            {conflictRoomGroups.length === 0 ? (
              <p className="text-helper py-4 text-center">ไม่มีห้องว่างในช่วงเวลาที่ต้องการ</p>
            ) : (
              conflictRoomGroups
                .slice().sort((a, b) => (a.isSameType ? -1 : b.isSameType ? 1 : 0))
                .map((group) => {
                  const sameTypePrice = conflictRoomGroups.find((g) => g.isSameType)?.pricePerNight ?? 0
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
                            variant={selectedTransferRoomId === room.room_id ? 'default' : 'outline'}
                            size="sm"
                            disabled={extend.isPending}
                            onClick={() => setSelectedTransferRoomId(room.room_id)}
                          >
                            {room.room_number}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        )

        // ── Combined body ──
        const extendBody = (
          <div className="space-y-4">
            {datePickerBody}
            {conflictBody}
          </div>
        )

        // ── Actions depend on step ──
        const extendActions = hasConflict ? (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={extend.isPending} onClick={() => handleExtendClose(false)}>
              ยกเลิก
            </Button>
            <Button className="flex-1" disabled={!canConfirmTransfer} onClick={handleExtendWithTransfer}>
              {extend.isPending ? 'กำลังบันทึก…' : 'ยืนยันย้ายห้อง'}
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={extend.isPending} onClick={() => setExtendOpen(false)}>
              ยกเลิก
            </Button>
            <Button className="flex-1" disabled={!canConfirmDate} onClick={handleExtendSubmitDate}>
              {extend.isPending ? 'กำลังตรวจสอบ…' : 'ยืนยัน'}
            </Button>
          </div>
        )

        return isMobile ? (
          <Sheet open={extendOpen} onOpenChange={handleExtendClose}>
            <SheetContent side="bottom" className="rounded-t-2xl px-5 pt-5 pb-6 max-h-[85vh] flex flex-col">
              <SheetHeader className="pb-3 text-left shrink-0">
                <SheetTitle>{hasConflict ? 'เลือกห้องสำหรับช่วงที่เหลือ' : 'ขยายวันเช็คเอาท์'}</SheetTitle>
                <SheetDescription className="sr-only">เลือกวันเช็คเอาท์ใหม่</SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto">{extendBody}</div>
              <div className="pt-4 shrink-0">{extendActions}</div>
            </SheetContent>
          </Sheet>
        ) : (
          <AlertDialog open={extendOpen} onOpenChange={handleExtendClose}>
            <AlertDialogContent className={cn(hasConflict && 'max-h-[80vh] flex flex-col')}>
              <AlertDialogHeader>
                <AlertDialogTitle>{hasConflict ? 'เลือกห้องสำหรับช่วงที่เหลือ' : 'ขยายวันเช็คเอาท์'}</AlertDialogTitle>
                <AlertDialogDescription className="sr-only">เลือกวันเช็คเอาท์ใหม่</AlertDialogDescription>
              </AlertDialogHeader>
              <div className={cn(hasConflict && 'flex-1 overflow-y-auto')}>{extendBody}</div>
              <div className="flex justify-end gap-2 pt-2">
                {hasConflict ? (
                  <>
                    <Button variant="outline" disabled={extend.isPending} onClick={() => handleExtendClose(false)}>
                      ยกเลิก
                    </Button>
                    <Button disabled={!canConfirmTransfer} onClick={handleExtendWithTransfer}>
                      {extend.isPending ? 'กำลังบันทึก…' : 'ยืนยันย้ายห้อง'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" disabled={extend.isPending} onClick={() => handleExtendClose(false)}>
                      ยกเลิก
                    </Button>
                    <Button disabled={!canConfirmDate} onClick={handleExtendSubmitDate}>
                      {extend.isPending ? 'กำลังตรวจสอบ…' : 'ยืนยัน'}
                    </Button>
                  </>
                )}
              </div>
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

      {/* ── Early checkout confirmation ─────────────────────────────────────── */}
      <EarlyCheckoutDialog
        open={earlyCheckoutOpen}
        onOpenChange={setEarlyCheckoutOpen}
        bookingId={bookingId}
        stay={stay}
        booking={booking}
      />

      {/* ── Transfer room ─────────────────────────────────────────────────── */}
      {(() => {
        const transferDesc = isCheckedIn
          ? `ย้ายจากห้อง ${stay.room_number} (${stay.room_type_name}) — ระบบจะเช็คเอาท์ห้องเดิมอัตโนมัติ`
          : `เปลี่ยนจากห้อง ${stay.room_number} (${stay.room_type_name})`

        const transferBody = (
          <div className="space-y-4">
            {/* Date pickers — only for CHECKED_IN (split-stay transfer) */}
            {isCheckedIn && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium block mb-1.5">วันที่ย้ายห้อง</label>
                  <Input
                    type="date"
                    min={todayISO()}
                    max={addDaysToISO(stay.check_out, -1)}
                    value={transferDate}
                    onChange={(e) => { setTransferDate(e.target.value); setReturnDate('') }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5">
                    วันที่กลับห้องเดิม <span className="font-normal text-muted-foreground">(ไม่บังคับ)</span>
                  </label>
                  <Input
                    type="date"
                    min={transferDate ? addDaysToISO(transferDate, 1) : ''}
                    max={addDaysToISO(stay.check_out, -1)}
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {returnDate
                      ? `ย้ายชั่วคราว: ห้องใหม่ ${transferDate} → ${returnDate} แล้วกลับห้อง ${stay.room_number}`
                      : 'ระบุเพื่อย้ายชั่วคราวแล้วกลับห้องเดิมอัตโนมัติ'}
                  </p>
                </div>
              </div>
            )}
            {transferQuery.isLoading ? (
              <div className="flex items-center gap-2 py-4 justify-center text-helper">
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังโหลด...
              </div>
            ) : transferRoomGroups.length === 0 ? (
              <p className="text-helper py-4 text-center">ไม่มีห้องว่าง</p>
            ) : (
              transferRoomGroups
                .slice().sort((a, b) => (a.isSameType ? -1 : b.isSameType ? 1 : 0))
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
                                { stayId: stay.id, roomId: room.room_id, transferDate: isCheckedIn ? transferDate : undefined, returnDate: isCheckedIn && returnDate ? returnDate : undefined },
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
  stays,
}: {
  bookingId: string
  booking: BookingResponse
  stays: RoomStayResponse[]
}) {
  const navigate = useNavigate()
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
                        max={addDaysToISO(stay.check_out, -1)}
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
  BOOKING_MODIFIED: { label: 'แก้ไขข้อมูล',         icon: Pencil,         color: 'text-info' },
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
