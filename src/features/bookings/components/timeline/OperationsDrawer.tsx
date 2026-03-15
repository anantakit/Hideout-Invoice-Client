import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { differenceInDays, format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import {
  X,
  DoorOpen,
  CheckCircle2,
  CircleAlert,
  ChevronRight,
  LogOut,
  Banknote,
  FileText,
  Loader2,
  Plus,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/shared/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Separator } from '@/shared/ui/separator'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/shared/ui/alert-dialog'
import { ConfirmActionCard } from '@/shared/ui/confirm-action-card'
import { type TimelineBooking, type TimelineRoom, type UnassignedStay, getStatusLabel } from '../../types'
import { useBooking, useCreateBooking, useAvailabilityGrouped, useCheckoutRooms } from '../../hooks'
import { InlineCheckIn } from '../InlineCheckIn'
import { DesktopOperationsPanel } from './DesktopOperationsPanel'

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
  /** Quick check-out action from drawer. */
  onQuickCheckOut?: (booking: TimelineBooking) => void
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

// ─── Checkout All Button ──────────────────────────────────────────────────────

function CheckoutAllButton({
  guestName,
  stays,
  checkoutMutation,
}: {
  guestName: string
  stays: { id: string; room_number?: string }[]
  checkoutMutation: ReturnType<typeof useCheckoutRooms>
}) {
  const [open, setOpen] = useState(false)
  const roomLabel = stays.map((s) => s.room_number ?? '?').join(', ')

  return (
    <>
      <Button
        className="w-full gap-1.5"
        variant="ghost"
        disabled={checkoutMutation.isPending}
        onClick={() => setOpen(true)}
      >
        {checkoutMutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <LogOut className="w-4 h-4" />
        )}
        เช็คเอาท์ทั้งหมด ({stays.length} ห้อง)
      </Button>

      <AlertDialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันเช็คเอาท์ทั้งหมด</AlertDialogTitle>
            <AlertDialogDescription>
              เช็คเอาท์ {guestName} ห้อง {roomLabel} ({stays.length} ห้อง) พร้อมกัน ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              checkoutMutation.mutate(stays.map((s) => s.id), {
                onSuccess: () => toast.success(`เช็คเอาท์ ${stays.length} ห้องสำเร็จ`),
                onError: (err: Error) => toast.error(err.message || 'เกิดข้อผิดพลาด'),
              })
              setOpen(false)
            }}>
              เช็คเอาท์ทั้งหมด
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ─── Booking Detail Content ────────────────────────────────────────────────────

function BookingDetailContent({
  selected,
  onClose,
  onOpenDetail,
}: {
  selected: SelectedBookingContext
  onClose: () => void
  onOpenDetail?: (booking: TimelineBooking) => void
}) {
  const navigate = useNavigate()
  const { booking, roomNumbers } = selected
  const hasBalance = Number(booking.balance_amount) > 0
  const nights = differenceInDays(parseISO(booking.check_out), parseISO(booking.check_in))
  const status = booking.status

  // Fetch full booking data for inline check-in & per-stay checkout
  const canCheckIn = status === 'RESERVED' || status === 'ASSIGNED' || status === 'CONFIRMED'
  const canCheckOut = status === 'CHECKED_IN' || status === 'PARTIALLY_CHECKED_IN'
  const needsFullBooking = canCheckIn || canCheckOut
  const { data: fullBooking } = useBooking(needsFullBooking ? booking.booking_id : '')

  const todayDate = format(new Date(), 'yyyy-MM-dd')
  const pendingStays = useMemo(() => {
    if (!fullBooking) return []
    return fullBooking.room_stays.filter(
      (s) =>
        (s.status === 'RESERVED' || s.status === 'ASSIGNED') &&
        s.check_in.slice(0, 10) <= todayDate,
    )
  }, [fullBooking, todayDate])

  // Per-stay checkout
  const checkedInStays = useMemo(() => {
    if (!fullBooking) return []
    return fullBooking.room_stays.filter((s) => s.status === 'CHECKED_IN')
  }, [fullBooking])

  const checkoutMutation = useCheckoutRooms(booking.booking_id)

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
                {booking.source === 'walk_in' ? 'วอล์คอิน' : 'จองล่วงหน้า'}
              </span>
            </div>
          </>
        )}

        {/* Inline check-in */}
        {pendingStays.length > 0 && (
          <>
            <Separator />
            <InlineCheckIn bookingId={booking.booking_id} pendingStays={pendingStays} compact />
          </>
        )}

        {/* Actions — inline after content */}
        <Separator />
        <div className="space-y-2 pt-1">
          {canCheckOut && checkedInStays.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <LogOut className="w-3.5 h-3.5" />
                เช็คเอาท์ {checkedInStays.length > 1 ? `${checkedInStays.length} ห้อง` : ''}
              </p>
              {checkedInStays.map((stay) => (
                <ConfirmActionCard
                  key={stay.id}
                  disabled={checkoutMutation.isPending}
                  loading={checkoutMutation.isPending}
                  loader={<Loader2 size={14} className="animate-spin text-muted-foreground" />}
                  icon={<LogOut size={14} className="text-warning" />}
                  confirmTitle="ยืนยันเช็คเอาท์"
                  confirmDescription={`เช็คเอาท์ ${booking.guest_name} ห้อง ${stay.room_number} ?`}
                  confirmLabel="เช็คเอาท์"
                  onConfirm={() => {
                    checkoutMutation.mutate([stay.id], {
                      onSuccess: () => toast.success(`เช็คเอาท์ ห้อง ${stay.room_number} สำเร็จ`),
                      onError: (err: Error) => toast.error(err.message || 'เกิดข้อผิดพลาด'),
                    })
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">ห้อง {stay.room_number}</span>
                    <span className="text-xs text-muted-foreground">{stay.room_type_name}</span>
                  </div>
                </ConfirmActionCard>
              ))}
              {checkedInStays.length > 1 && (
                <CheckoutAllButton
                  guestName={booking.guest_name}
                  stays={checkedInStays}
                  checkoutMutation={checkoutMutation}
                />
              )}
            </div>
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

          {/* Open detail page */}
          <Button
            className="w-full gap-1.5"
            variant="outline"
            onClick={handleOpenDetail}
          >
            เปิดรายละเอียด
            <ChevronRight size={14} />
          </Button>

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
    </div>
  )
}

// ─── Create Booking Content (supports group booking) ─────────────────────────

interface SelectedRoom {
  roomId: string
  roomNumber: string
  roomTypeId: string
  roomTypeName: string
  pricePerNight: number
}

function CreateBookingContent({
  prefill,
  onClose,
  onBookingCreated,
}: {
  prefill: CreateBookingPrefill
  onClose: () => void
  onBookingCreated?: (bookingId: string) => void
}) {
  const todayDate = format(new Date(), 'yyyy-MM-dd')
  const isToday = prefill.checkIn === todayDate

  const [source, setSource] = useState<'advance' | 'walk_in'>(isToday ? 'walk_in' : 'advance')
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [paymentMode, setPaymentMode] = useState<'reserve' | 'partial' | 'full'>('reserve')
  const [paymentAmount, setPaymentAmount] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('CASH')
  const [showRoomPicker, setShowRoomPicker] = useState(false)

  // Selected rooms — starts with the drawn room
  const [selectedRooms, setSelectedRooms] = useState<SelectedRoom[]>([{
    roomId: prefill.roomId,
    roomNumber: prefill.roomNumber,
    roomTypeId: prefill.roomTypeId,
    roomTypeName: prefill.roomTypeName,
    pricePerNight: prefill.pricePerNight,
  }])

  const selectedRoomIds = useMemo(() => new Set(selectedRooms.map((r) => r.roomId)), [selectedRooms])

  // Fetch available rooms for the same date range
  const { data: availData } = useAvailabilityGrouped(prefill.checkIn, prefill.checkOut, showRoomPicker)

  const createBooking = useCreateBooking()

  const nights = differenceInDays(parseISO(prefill.checkOut), parseISO(prefill.checkIn))
  const totalAmount = useMemo(
    () => selectedRooms.reduce((sum, r) => sum + nights * r.pricePerNight, 0),
    [selectedRooms, nights],
  )

  const toggleRoom = (room: SelectedRoom) => {
    setSelectedRooms((prev) => {
      const exists = prev.some((r) => r.roomId === room.roomId)
      if (exists) {
        // Don't allow removing the last room
        if (prev.length <= 1) return prev
        return prev.filter((r) => r.roomId !== room.roomId)
      }
      return [...prev, room]
    })
  }

  const hasGuest = guestName.trim().length > 0 && guestPhone.trim().length === 10
  const hasPayment = paymentMode === 'reserve' || (paymentAmount !== '' && Number(paymentAmount) > 0)
  const canSubmit = hasGuest && hasPayment && !createBooking.isPending

  const roomLabel = selectedRooms.map((r) => r.roomNumber).join(', ')
  const submitLabel =
    source === 'walk_in'
      ? paymentMode === 'reserve' ? 'เช็คอิน (ค้างชำระ)' : 'เช็คอิน & ชำระเงิน'
      : 'ยืนยันการจอง'

  const handleSubmit = () => {
    if (!canSubmit) return

    const payment =
      paymentMode !== 'reserve' && paymentAmount
        ? { amount: Number(paymentAmount), method: paymentMethod }
        : undefined

    createBooking.mutate(
      {
        source,
        guest_name: guestName.trim(),
        guest_phone: guestPhone.trim(),
        stays: selectedRooms.map((r) => ({
          room_type_id: r.roomTypeId,
          room_id: r.roomId,
          check_in: prefill.checkIn,
          check_out: prefill.checkOut,
        })),
        payment,
      },
      {
        onSuccess: (booking) => {
          toast.success(
            source === 'walk_in'
              ? `เช็คอิน ห้อง ${roomLabel} สำเร็จ`
              : `สร้างการจอง ห้อง ${roomLabel} สำเร็จ`,
          )
          onBookingCreated?.(booking.id)
        },
        onError: (err: Error) => {
          toast.error(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
        },
      },
    )
  }

  // Update payment amount when switching to 'full' if total changed
  const handlePaymentModeChange = (mode: 'reserve' | 'partial' | 'full') => {
    setPaymentMode(mode)
    if (mode === 'full') setPaymentAmount(totalAmount.toString())
    else if (mode === 'reserve') setPaymentAmount('')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-border-soft">
        <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Plus size={14} />
          สร้างการจอง
          {selectedRooms.length > 1 && (
            <Badge variant="blue" className="text-[10px] px-1.5 py-0">
              {selectedRooms.length} ห้อง
            </Badge>
          )}
        </span>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 shrink-0" aria-label="ปิด">
          <X size={14} />
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Date range info */}
        <div className="text-xs text-muted-foreground">
          {fmtThaiDate(prefill.checkIn)} → {fmtThaiDate(prefill.checkOut)} · {nights} คืน
        </div>

        {/* Selected rooms chips */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">ห้องพัก</Label>
          <div className="flex flex-wrap gap-1.5">
            {selectedRooms.map((room) => (
              <button
                key={room.roomId}
                type="button"
                onClick={() => toggleRoom(room)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors',
                  'border-primary/30 bg-primary/10 text-foreground',
                  selectedRooms.length > 1 && 'hover:border-destructive/50 hover:bg-destructive/10',
                )}
              >
                <span>{room.roomNumber}</span>
                <span className="text-muted-foreground">{room.roomTypeName}</span>
                {room.pricePerNight > 0 && (
                  <span className="text-muted-foreground/70">{formatTHB(room.pricePerNight)}</span>
                )}
                {selectedRooms.length > 1 && (
                  <X size={10} className="ml-0.5 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>

          {/* Add room toggle */}
          <button
            type="button"
            onClick={() => setShowRoomPicker((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <Plus size={12} />
            เพิ่มห้อง
            <ChevronDown size={12} className={cn('transition-transform', showRoomPicker && 'rotate-180')} />
          </button>

          {/* Room picker grid */}
          {showRoomPicker && (
            <div className="rounded-lg border border-border-soft bg-sidebar/50 p-3 space-y-3 max-h-48 overflow-y-auto">
              {availData?.room_types.map((rt) => {
                const availableRooms = rt.rooms.filter((r) => r.available)
                if (availableRooms.length === 0) return null
                return (
                  <div key={rt.room_type_id} className="space-y-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      {rt.room_type_name} · {formatTHB(rt.price_per_night)}/คืน
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {availableRooms.map((room) => {
                        const isSelected = selectedRoomIds.has(room.room_id)
                        return (
                          <button
                            key={room.room_id}
                            type="button"
                            onClick={() => toggleRoom({
                              roomId: room.room_id,
                              roomNumber: room.room_number,
                              roomTypeId: rt.room_type_id,
                              roomTypeName: rt.room_type_name,
                              pricePerNight: rt.price_per_night,
                            })}
                            className={cn(
                              'min-w-[40px] rounded border px-2 py-1 text-xs font-medium tabular-nums transition-colors cursor-pointer',
                              isSelected
                                ? 'border-primary bg-primary/20 text-primary'
                                : 'border-border text-muted-foreground hover:border-muted-foreground/50',
                            )}
                          >
                            {room.room_number}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {!availData && (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {availData && availData.room_types.every((rt) => rt.rooms.filter((r) => r.available).length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-2">ไม่มีห้องว่าง</p>
              )}
            </div>
          )}
        </div>

        {/* Source toggle */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">ประเภท</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {([
              { value: 'advance' as const, label: 'จองล่วงหน้า' },
              { value: 'walk_in' as const, label: 'วอล์คอิน' },
            ]).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSource(opt.value)}
                className={cn(
                  'rounded-md border px-2 py-2 text-xs font-medium transition-colors cursor-pointer',
                  source === opt.value
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-muted-foreground hover:border-muted-foreground/50',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Guest info */}
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground">ผู้เข้าพัก</Label>
          <div className="space-y-2">
            <div>
              <Label htmlFor="drawer-guest-name" className="text-xs font-medium">ชื่อ</Label>
              <Input
                id="drawer-guest-name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="เช่น สมชาย ใจดี"
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="drawer-guest-phone" className="text-xs font-medium">เบอร์โทร</Label>
              <Input
                id="drawer-guest-phone"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                maxLength={10}
                placeholder="0812345678"
                className="mt-1"
              />
              {guestPhone.length > 0 && guestPhone.length !== 10 && (
                <p className="text-[10px] text-destructive mt-0.5">เบอร์โทรศัพท์ต้องมี 10 หลัก</p>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Payment section */}
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground">การชำระเงิน</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { value: 'reserve' as const, label: 'จองก่อน' },
              { value: 'partial' as const, label: 'บางส่วน' },
              { value: 'full' as const,    label: 'เต็มจำนวน' },
            ]).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handlePaymentModeChange(opt.value)}
                className={cn(
                  'rounded-md border px-2 py-2 text-xs font-medium transition-colors cursor-pointer',
                  paymentMode === opt.value
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-muted-foreground hover:border-muted-foreground/50',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {paymentMode !== 'reserve' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="drawer-pay-amount" className="text-xs font-medium">ยอดชำระ (฿)</Label>
                <Input
                  id="drawer-pay-amount"
                  type="number"
                  min={0}
                  step={0.01}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={totalAmount > 0 ? totalAmount.toLocaleString() : 'เช่น 1500'}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">วิธีชำระ</Label>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  {(['CASH', 'TRANSFER'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={cn(
                        'rounded-md border px-2 py-2 text-xs font-medium transition-colors cursor-pointer',
                        paymentMethod === m
                          ? 'border-primary bg-primary/15 text-primary'
                          : 'border-border text-muted-foreground hover:border-muted-foreground/50',
                      )}
                    >
                      {m === 'CASH' ? 'เงินสด' : 'โอนเงิน'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        {totalAmount > 0 && (
          <>
            <Separator />
            <div className="rounded-lg bg-sidebar/50 p-3 space-y-1.5 text-sm">
              {selectedRooms.length > 1 && selectedRooms.map((r) => (
                <div key={r.roomId} className="flex justify-between text-xs text-muted-foreground">
                  <span>ห้อง {r.roomNumber} ({nights} คืน)</span>
                  <span>{formatTHB(nights * r.pricePerNight)}</span>
                </div>
              ))}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  ยอดรวม {selectedRooms.length > 1 ? `(${selectedRooms.length} ห้อง)` : ''}
                </span>
                <span className="font-semibold">{formatTHB(totalAmount)}</span>
              </div>
              {paymentMode !== 'reserve' && paymentAmount && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ชำระ</span>
                    <span className="font-medium text-success">{formatTHB(Number(paymentAmount))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">คงเหลือ</span>
                    <span className={cn(
                      'font-semibold',
                      totalAmount - Number(paymentAmount) > 0 ? 'text-warning' : 'text-success',
                    )}>
                      {formatTHB(Math.max(0, totalAmount - Number(paymentAmount)))}
                    </span>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Submit */}
        <Button
          className="w-full gap-1.5"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {createBooking.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitLabel}
        </Button>
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
  onQuickCheckOut,
}: {
  rooms: TimelineRoom[]
  todayStr: string
  roomTypeNameMap: Record<string, string>
  unassignedStays: UnassignedStay[]
  onClose: () => void
  onQuickCheckOut?: (booking: TimelineBooking) => void
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
          onQuickCheckOut={onQuickCheckOut}
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
  onQuickCheckOut,
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
        'shrink-0 h-full border-l border-border-soft bg-card overflow-hidden transition-[width] duration-220 ease-[cubic-bezier(0.4,0,0.2,1)]',
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
          <CreateBookingContent
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
            onQuickCheckOut={onQuickCheckOut}
          />
        )}
      </div>
    </div>
  )
})
