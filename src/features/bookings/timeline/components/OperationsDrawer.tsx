import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { differenceInDays, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import {
  X,
  DoorOpen,
  CheckCircle2,
  CircleAlert,
  ChevronRight,
  LogOut,
  Banknote,
  KeyRound,
  CreditCard,
  Clock,
  FileText,
  Loader2,
  Plus,
  ChevronDown,
  CalendarDays,
  User,
  Footprints,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react'
import { cn, fmtThaiDate, fmtShortISO, formatTHBCurrency, todayISO, formatCompactNumber } from '@/shared/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { CardButton } from '@/shared/ui/card-button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/shared/ui/alert-dialog'
import { ConfirmActionCard } from '@/shared/ui/confirm-action-card'
import { type TimelineBooking, type TimelineRoom, type UnassignedStay, getStatusLabel } from '../../types'
import { useBooking, useCreateBooking, useAvailabilityGrouped, useCheckoutRooms } from '../../hooks'
import { InlineCheckIn } from '../../shared/components/InlineCheckIn'
import { ChargedPriceMulti } from '../../shared/components/ChargedPriceInput'
import { DesktopOperationsPanel } from './DesktopOperationsPanel'
import { KEY_DEPOSIT_PER_ROOM } from '../../constants'

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

// ─── Helpers ───────────────────────────────────────────────────────────────────

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
        variant="ghost"
        size="sm"
        className="gap-1 text-xs h-auto py-1 px-2 text-primary hover:text-primary/80"
        disabled={checkoutMutation.isPending}
        onClick={() => setOpen(true)}
      >
        {checkoutMutation.isPending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <LogOut size={12} />
        )}
        เช็คเอาท์ทั้งหมด
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

  // Always fetch full booking for deposit info, check-in & checkout actions
  const canCheckOut = status === 'CHECKED_IN' || status === 'PARTIALLY_CHECKED_IN'
  const { data: fullBooking } = useBooking(booking.booking_id)
  const keyDeposit = fullBooking?.key_deposit_amount ?? 0

  const todayDate = todayISO()
  const pendingStays = useMemo(() => {
    if (!fullBooking) return []
    return fullBooking.room_stays.filter(
      (s) =>
        (s.status === 'RESERVED' || s.status === 'ASSIGNED') &&
        s.check_in.slice(0, 10) <= todayDate,
    )
  }, [fullBooking, todayDate])

  // Per-stay checkout — only show stays whose scheduled checkout is today or past
  const checkedInStays = useMemo(() => {
    if (!fullBooking) return []
    return fullBooking.room_stays.filter(
      (s) => s.status === 'CHECKED_IN' && s.check_out.slice(0, 10) <= todayDate,
    )
  }, [fullBooking, todayDate])

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
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-3 border-b border-border-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base font-semibold text-foreground truncate">
              {booking.guest_name}
            </span>
            <Badge variant={statusVariant(booking.status)} className="shrink-0">
              {getStatusLabel(booking.status)}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 shrink-0" aria-label="ปิด">
            <X size={16} />
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <CalendarDays size={12} className="shrink-0" />
          {fmtThaiDate(booking.check_in)} → {fmtThaiDate(booking.check_out)}
          <span>· {nights} คืน</span>
          {booking.source && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto">
              {booking.source === 'walk_in' ? 'วอล์คอิน' : 'จองล่วงหน้า'}
            </Badge>
          )}
        </div>
      </div>

      {/* ── Scrollable content ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* Section 1: Rooms */}
        {roomNumbers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <DoorOpen size={14} />
                {roomNumbers.length > 1 ? `${roomNumbers.length} ห้อง` : 'ห้องพัก'}
              </p>
              {fullBooking?.deposit_status === 'PENDING' ? (
                <span className="text-xs text-warning flex items-center gap-1">
                  <ShieldAlert size={12} />
                  เก็บ {formatCompactNumber(keyDeposit)}
                </span>
              ) : fullBooking?.deposit_status === 'COLLECTED' ? (
                <span className="text-xs text-success flex items-center gap-1">
                  <ShieldCheck size={12} />
                  เก็บแล้ว {formatCompactNumber(keyDeposit)}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {roomNumbers.map((rn) => (
                <div key={rn} className="radius-card border border-border bg-card px-3 py-1.5 text-sm font-bold tabular-nums text-center min-w-12">
                  {rn}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Balance — prominent when outstanding */}
        <div className={cn(
          'rounded-lg p-3 flex items-center justify-between',
          hasBalance
            ? 'bg-warning/10 border border-warning/30'
            : 'bg-muted/50',
        )}>
          <span className="text-sm text-muted-foreground">ยอดค้างชำระ</span>
          {hasBalance ? (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-warning">
              <CircleAlert size={14} />
              {formatTHBCurrency(Number(booking.balance_amount))}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm font-medium text-success">
              <CheckCircle2 size={14} />
              ชำระแล้ว
            </span>
          )}
        </div>

        {/* Inline check-in */}
        {pendingStays.length > 0 && (
          <InlineCheckIn bookingId={booking.booking_id} pendingStays={pendingStays} compact keyDepositAmount={keyDeposit} depositStatus={fullBooking?.deposit_status} />
        )}

        {/* Checkout section — matches InlineCheckIn compact layout */}
        {canCheckOut && checkedInStays.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <LogOut className="w-3.5 h-3.5" />
                เช็คเอาท์{checkedInStays.length > 1 ? ` ${checkedInStays.length} ห้อง` : ''}
              </p>
              {checkedInStays.length > 1 && (
                <CheckoutAllButton
                  guestName={booking.guest_name}
                  stays={checkedInStays}
                  checkoutMutation={checkoutMutation}
                />
              )}
            </div>
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
                <p className="text-micro-sm text-muted-foreground mt-0.5">
                  {fmtShortISO(stay.check_in)} → {fmtShortISO(stay.check_out)} · {differenceInDays(parseISO(stay.check_out), parseISO(stay.check_in))} คืน
                </p>
              </ConfirmActionCard>
            ))}
          </div>
        )}
      </div>

      {/* ── Sticky footer ──────────────────────────────────────────── */}
      <div className="shrink-0 p-3 border-t border-border-soft space-y-2">
        {/* Primary CTA: payment if balance, receipt if terminal */}
        {hasBalance && !isTerminal && (
          <Button className="w-full gap-1.5" onClick={handleOpenDetail}>
            <Banknote size={16} />
            รับชำระเงิน
          </Button>
        )}
        {isTerminal && (
          <Button className="w-full gap-1.5" onClick={handleOpenDetail}>
            <FileText size={16} />
            ดูใบเสร็จ
          </Button>
        )}
        {/* Detail — primary when no other CTA above, outline otherwise */}
        <Button
          className="w-full gap-1.5"
          variant={hasBalance || isTerminal ? 'outline' : 'default'}
          onClick={handleOpenDetail}
        >
          เปิดรายละเอียด
          <ChevronRight size={14} />
        </Button>
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
  chargedPrice?: number
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
  const todayDate = todayISO()
  const isToday = prefill.checkIn === todayDate

  const [source, setSource] = useState<'advance' | 'walk_in'>(isToday ? 'walk_in' : 'advance')
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [paymentMode, setPaymentMode] = useState<'full' | 'full_deposit' | 'partial' | 'reserve'>('full')
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
    () => selectedRooms.reduce((sum, r) => sum + nights * (r.chargedPrice ?? r.pricePerNight), 0),
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

  const updateChargedPrice = (roomId: string, price: number | undefined) => {
    setSelectedRooms((prev) =>
      prev.map((r) => r.roomId === roomId ? { ...r, chargedPrice: price } : r),
    )
  }

  const depositAmount = KEY_DEPOSIT_PER_ROOM * selectedRooms.length

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

    const depositStatus = paymentMode === 'full_deposit' ? 'COLLECTED' : 'PENDING'

    const payment =
      paymentMode !== 'reserve' && paymentAmount
        ? { amount: Number(paymentAmount), method: paymentMethod }
        : undefined

    createBooking.mutate(
      {
        source,
        guest_name: guestName.trim(),
        guest_phone: guestPhone.trim(),
        key_deposit_amount: depositAmount,
        deposit_status: depositStatus,
        stays: selectedRooms.map((r) => ({
          room_type_id: r.roomTypeId,
          room_id: r.roomId,
          check_in: prefill.checkIn,
          check_out: prefill.checkOut,
          ...(r.chargedPrice != null ? { charged_price: r.chargedPrice } : {}),
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

  const handlePaymentModeChange = (mode: 'full' | 'full_deposit' | 'partial' | 'reserve') => {
    setPaymentMode(mode)
    if (mode === 'full') setPaymentAmount(totalAmount.toString())
    else if (mode === 'full_deposit') setPaymentAmount((totalAmount + depositAmount).toString())
    else if (mode === 'reserve') setPaymentAmount('')
    // partial: let user type
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-3 border-b border-border-soft">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-foreground flex items-center gap-1.5">
            <Plus size={16} />
            สร้างการจอง
            {selectedRooms.length > 1 && (
              <Badge variant="blue" className="text-xs px-1.5 py-0">
                {selectedRooms.length} ห้อง
              </Badge>
            )}
          </span>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 shrink-0" aria-label="ปิด">
            <X size={16} />
          </Button>
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
          <CalendarDays size={12} className="shrink-0" />
          {fmtThaiDate(prefill.checkIn)} → {fmtThaiDate(prefill.checkOut)} · {nights} คืน
        </div>
      </div>

      {/* ── Scrollable content ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* Section 1: Room & Source */}
        <div className="rounded-lg bg-muted/50 p-3 space-y-3">
          {/* Room chips */}
          <div className="space-y-2">
            <p className="text-micro-sm font-semibold uppercase tracking-wider text-muted-foreground">ห้องพัก</p>
            <div className="flex flex-wrap gap-1.5">
              {selectedRooms.map((room) => (
                <Button
                  key={room.roomId}
                  variant="ghost"
                  onClick={() => toggleRoom(room)}
                  className={cn(
                    'h-auto gap-1.5 rounded-md border px-2.5 py-1.5 text-sm',
                    'border-primary/30 bg-primary/10 text-foreground',
                    selectedRooms.length > 1 && 'hover:border-destructive/50 hover:bg-destructive/10',
                  )}
                >
                  <span className="font-semibold tabular-nums">{room.roomNumber}</span>
                  <span className="text-muted-foreground text-xs">{room.roomTypeName}</span>
                  {room.pricePerNight > 0 && (
                    <span className="text-muted-foreground/60 text-xs">{formatTHBCurrency(room.pricePerNight)}</span>
                  )}
                  {selectedRooms.length > 1 && (
                    <X size={12} className="text-muted-foreground/50" />
                  )}
                </Button>
              ))}
            </div>

            {/* Add room toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRoomPicker((v) => !v)}
              className="gap-1 h-auto p-0 text-xs text-primary hover:text-primary/80"
            >
              <Plus size={12} />
              เพิ่มห้อง
              <ChevronDown size={12} className={cn('transition-transform', showRoomPicker && 'rotate-180')} />
            </Button>

            {/* Room picker grid */}
            {showRoomPicker && (
              <div className="rounded-md border border-border-soft bg-background/60 p-2.5 space-y-2.5 max-h-44 overflow-y-auto">
                {availData?.room_types.map((rt) => {
                  const availableRooms = rt.rooms.filter((r) => r.available)
                  if (availableRooms.length === 0) return null
                  return (
                    <div key={rt.room_type_id} className="space-y-1.5">
                      <p className="text-micro-sm font-medium text-muted-foreground uppercase tracking-wider">
                        {rt.room_type_name} · {formatTHBCurrency(rt.price_per_night)}/คืน
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {availableRooms.map((room) => {
                          const isSelected = selectedRoomIds.has(room.room_id)
                          return (
                            <Button
                              key={room.room_id}
                              variant={isSelected ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => toggleRoom({
                                roomId: room.room_id,
                                roomNumber: room.room_number,
                                roomTypeId: rt.room_type_id,
                                roomTypeName: rt.room_type_name,
                                pricePerNight: rt.price_per_night,
                              })}
                              className={cn(
                                'min-w-10 h-7 px-2 text-xs font-medium tabular-nums',
                                isSelected
                                  ? 'bg-primary/20 text-primary hover:bg-primary/30'
                                  : 'text-muted-foreground',
                              )}
                            >
                              {room.room_number}
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                {!availData && (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="icon-sm animate-spin text-muted-foreground" />
                  </div>
                )}
                {availData && availData.room_types.every((rt) => rt.rooms.filter((r) => r.available).length === 0) && (
                  <p className="text-xs text-muted-foreground text-center py-1.5">ไม่มีห้องว่าง</p>
                )}
              </div>
            )}
          </div>

          {/* Charged price (optional discount) */}
          <ChargedPriceMulti
            entries={selectedRooms.map((r) => ({
              key: r.roomId,
              label: r.roomNumber,
              rackPrice: r.pricePerNight,
              chargedPrice: r.chargedPrice,
            }))}
            onChange={(key, value) => updateChargedPrice(key, value)}
            onClearAll={() => {
              setSelectedRooms((prev) => prev.map((r) => ({ ...r, chargedPrice: undefined })))
            }}
          />

          {/* Source toggle — compact inline pills */}
          <div className="space-y-2">
            <p className="text-micro-sm font-semibold uppercase tracking-wider text-muted-foreground">ประเภท</p>
            <div className="flex gap-2">
              {([
                { value: 'advance' as const, label: 'จองล่วงหน้า', Icon: CalendarDays },
                { value: 'walk_in' as const, label: 'วอล์คอิน', Icon: Footprints },
              ] as const).map((opt) => (
                <Button
                  key={opt.value}
                  variant="ghost"
                  onClick={() => setSource(opt.value)}
                  className={cn(
                    'h-auto gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium',
                    source === opt.value
                      ? 'border-primary/40 bg-primary/15 text-primary'
                      : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground',
                  )}
                >
                  <opt.Icon size={14} />
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: Guest info */}
        <div className="rounded-lg bg-muted/50 p-3 space-y-2">
          <p className="text-micro-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <User size={12} />
            ผู้เข้าพัก
          </p>
          <div className="grid grid-cols-5 gap-2">
            <div className="col-span-3">
              <Label htmlFor="drawer-guest-name" className="text-xs text-muted-foreground">ชื่อ</Label>
              <Input
                id="drawer-guest-name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="สมชาย ใจดี"
                className="mt-0.5 h-9 text-sm"
                autoFocus
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="drawer-guest-phone" className="text-xs text-muted-foreground">เบอร์โทร</Label>
              <Input
                id="drawer-guest-phone"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                maxLength={10}
                placeholder="0812345678"
                className="mt-0.5 h-9 text-sm"
              />
            </div>
          </div>
          {guestPhone.length > 0 && guestPhone.length !== 10 && (
            <p className="text-xs text-destructive">เบอร์โทรศัพท์ต้องมี 10 หลัก</p>
          )}
        </div>

        {/* Section 3: Payment */}
        <div className="rounded-lg bg-muted/50 p-3 space-y-2.5">
          <p className="text-micro-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Banknote size={12} />
            การชำระเงิน
          </p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: 'full' as const, label: 'ค่าห้อง', desc: 'เต็มจำนวน', Icon: Banknote },
              { value: 'full_deposit' as const, label: 'ค่าห้อง + ประกัน', desc: 'รวมเงินประกัน', Icon: KeyRound },
              { value: 'partial' as const, label: 'บางส่วน', desc: 'กรอกจำนวนเอง', Icon: CreditCard },
              { value: 'reserve' as const, label: 'ภายหลัง', desc: 'ยังไม่ชำระ', Icon: Clock },
            ]).map((opt) => (
              <CardButton
                key={opt.value}
                variant="ghost"
                padding="default"
                onClick={() => handlePaymentModeChange(opt.value)}
                className={cn(
                  'flex-row gap-2 rounded-lg border',
                  paymentMode === opt.value
                    ? 'border-primary/40 bg-primary/10 text-primary ring-1 ring-primary/20'
                    : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground',
                )}
              >
                <opt.Icon size={16} className="shrink-0 opacity-70" />
                <div className="min-w-0">
                  <span className="text-sm font-semibold block leading-tight">{opt.label}</span>
                  <span className="text-xs leading-tight block opacity-60">{opt.desc}</span>
                </div>
              </CardButton>
            ))}
          </div>

          {paymentMode !== 'reserve' && (
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div>
                <Label htmlFor="drawer-pay-amount" className="text-xs text-muted-foreground">ยอดชำระ (฿)</Label>
                <Input
                  id="drawer-pay-amount"
                  type="number"
                  min={0}
                  step={0.01}
                  readOnly={paymentMode === 'full' || paymentMode === 'full_deposit'}
                  className={cn(
                    'mt-0.5 h-9 text-sm tabular-nums',
                    (paymentMode === 'full' || paymentMode === 'full_deposit') && 'bg-muted cursor-default',
                  )}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={totalAmount > 0 ? formatCompactNumber(totalAmount) : '0'}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">วิธีชำระ</Label>
                <div className="flex gap-1.5 mt-0.5">
                  {(['CASH', 'TRANSFER'] as const).map((m) => (
                    <Button
                      key={m}
                      variant="outline"
                      onClick={() => setPaymentMethod(m)}
                      className={cn(
                        'flex-1 h-9 text-sm font-medium',
                        paymentMethod === m
                          ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15'
                          : 'text-muted-foreground',
                      )}
                    >
                      {m === 'CASH' ? 'เงินสด' : 'โอนเงิน'}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary card */}
        {totalAmount > 0 && (
          <div className="rounded-lg border border-border-soft bg-card p-3 pl-3.5 border-l-2 border-l-primary/50 space-y-1.5 text-sm">
            {selectedRooms.length > 1 && selectedRooms.map((r) => {
              const ep = r.chargedPrice ?? r.pricePerNight
              const discounted = r.chargedPrice != null && r.chargedPrice < r.pricePerNight
              return (
                <div key={r.roomId} className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    ห้อง {r.roomNumber} ({nights} คืน)
                    {discounted && (
                      <span className="ml-1">
                        <span className="line-through">{formatTHBCurrency(r.pricePerNight)}</span>
                        {' → '}
                        <span className="text-primary">{formatTHBCurrency(ep)}</span>
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums">{formatTHBCurrency(nights * ep)}</span>
                </div>
              )
            })}
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                ค่าห้อง{selectedRooms.length > 1 ? ` (${selectedRooms.length} ห้อง)` : ''}
              </span>
              <span className="font-semibold tabular-nums">{formatTHBCurrency(totalAmount)}</span>
            </div>
            {paymentMode === 'full_deposit' && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>ประกันกุญแจ ({selectedRooms.length} × ฿{KEY_DEPOSIT_PER_ROOM})</span>
                <span className="tabular-nums">{formatTHBCurrency(depositAmount)}</span>
              </div>
            )}
            {paymentMode !== 'full_deposit' && depositAmount > 0 && (
              <div className="flex justify-between text-xs text-amber-500">
                <span>เก็บประกันหน้าเคาน์เตอร์</span>
                <span className="tabular-nums">{' ' + formatTHBCurrency(depositAmount)}</span>
              </div>
            )}
            {paymentMode !== 'reserve' && paymentAmount && (
              <>
                <div className="border-t border-border-soft my-1" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ชำระ</span>
                  <span className="font-medium text-success tabular-nums">{formatTHBCurrency(Number(paymentAmount))}</span>
                </div>
                {totalAmount - Number(paymentAmount) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">คงเหลือ</span>
                    <span className="font-semibold text-warning tabular-nums">
                      {formatTHBCurrency(totalAmount - Number(paymentAmount))}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Sticky footer ──────────────────────────────────────────── */}
      <div className="shrink-0 p-3 border-t border-border-soft">
        <Button
          className="w-full gap-1.5"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {createBooking.isPending && <Loader2 className="icon-sm animate-spin" />}
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
            onDirectCheckOut={onDirectCheckOut}
          />
        )}
      </div>
    </div>
  )
})
