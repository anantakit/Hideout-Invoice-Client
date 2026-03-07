import { format, addDays } from 'date-fns'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useFormContext, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { BottomBar } from '@/shared/ui/BottomBar'
import { Button } from '@/shared/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/form'
import { Input } from '@/shared/ui/input'
import { useCreateBooking } from '../hooks'
import { createBookingSchema } from '../createBookingSchema'
import type { CreateBookingFormValues } from '../createBookingSchema'
import { expandGroupedStays } from '../expandGroupedStays'
import { RoomTypeBookingBuilder } from '../components/RoomTypeBookingBuilder'
import { BookingSummary, useTotalAmount } from '../components/BookingSummary'
import { ROUTES } from '@/app/routes'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd')
}
function tomorrowStr(): string {
  return format(addDays(new Date(), 1), 'yyyy-MM-dd')
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CreateBookingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const createBooking = useCreateBooking()

  // Allow pre-filling from URL: /bookings/new?check_in=...&check_out=...&room_type_id=...&room_id=...
  const urlCheckIn    = searchParams.get('check_in')     || todayStr()
  const urlCheckOut   = searchParams.get('check_out')    || tomorrowStr()
  const urlRoomTypeId = searchParams.get('room_type_id') || ''
  const urlRoomId     = searchParams.get('room_id')      || ''

  const form = useForm<CreateBookingFormValues>({
    resolver: zodResolver(createBookingSchema),
    mode: 'onBlur',
    defaultValues: {
      source: 'staff',
      guest_name: '',
      guest_phone: '',
      same_dates: false,
      items: [
        {
          room_type_id: urlRoomTypeId,
          quantity: 1,
          check_in: urlCheckIn,
          check_out: urlCheckOut,
          assigned_room_ids: urlRoomId ? [urlRoomId] : [],
        },
      ],
      payment_mode: 'reserve',
      payment_amount: undefined,
      payment_method: 'CASH',
    },
  })

  const source      = useWatch({ control: form.control, name: 'source' })
  const paymentMode = useWatch({ control: form.control, name: 'payment_mode' })
  const guestName   = useWatch({ control: form.control, name: 'guest_name' })
  const guestPhone  = useWatch({ control: form.control, name: 'guest_phone' })
  const items       = useWatch({ control: form.control, name: 'items' })
  const paymentAmount = useWatch({ control: form.control, name: 'payment_amount' })
  const isSubmitting = createBooking.isPending

  // Disable submit until all required fields are filled
  const hasGuest = guestName.trim().length > 0 && guestPhone.trim().length > 0
  const hasValidItems = items.every(
    (item) => item.room_type_id && item.check_in && item.check_out && item.check_out > item.check_in,
  )
  const hasPayment = paymentMode === 'reserve' || (paymentAmount != null && paymentAmount > 0)
  const canSubmit = hasGuest && hasValidItems && hasPayment && !isSubmitting

  const submitLabel =
    source === 'walk_in'
      ? paymentMode === 'reserve'
        ? 'Check In (ค้างชำระ)'
        : 'Check In & ชำระเงิน'
      : 'ยืนยันการจอง'

  const onSubmit = form.handleSubmit((values) => {
    // Expand grouped items into individual stay payloads.
    const stays = expandGroupedStays(values.items)

    const payment =
      values.payment_mode !== 'reserve' && values.payment_amount
        ? { amount: values.payment_amount, method: values.payment_method }
        : undefined

    createBooking.mutate(
      {
        source: values.source,
        guest_name: values.guest_name,
        guest_phone: values.guest_phone,
        stays,
        payment,
      },
      {
        onSuccess: (booking) => {
          toast.success(
            values.source === 'walk_in'
              ? 'เช็คอินสำเร็จ'
              : `สร้างการจอง #${booking.id.slice(0, 8)} สำเร็จ`,
          )
          navigate(ROUTES.bookings.detail(booking.id))
        },
        onError: (error: Error) => {
          toast.error(error.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
        },
      },
    )
  })

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-32 md:pb-10 space-y-5">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">สร้างการจอง</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            จองห้องพักล่วงหน้า หรือเช็คอินทันทีสำหรับผู้เข้าพักที่เดินเข้ามา
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-5" noValidate>

            {/* ── 1. Source toggle ────────────────────────────────────── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">ประเภทการจอง</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <div className="grid grid-cols-2 gap-2">
                        {(
                          [
                            { value: 'staff',   label: 'จองล่วงหน้า', desc: 'รับจองผ่านพนักงาน' },
                            { value: 'walk_in', label: 'Walk-in',      desc: 'เช็คอินทันที' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => field.onChange(opt.value)}
                            className={cn(
                              'flex flex-col items-center gap-0.5 radius-card border px-3 py-3 text-center transition-colors',
                              field.value === opt.value
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border text-muted-foreground hover:border-muted-foreground/50',
                            )}
                          >
                            <span className="text-xs font-semibold">{opt.label}</span>
                            <span className="text-[10px] leading-tight">{opt.desc}</span>
                          </button>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* ── 2. Guest info ───────────────────────────────────────── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">ข้อมูลผู้เข้าพัก</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <FormField
                  control={form.control}
                  name="guest_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ชื่อผู้เข้าพัก</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="เช่น สมชาย ใจดี" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guest_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>เบอร์โทรศัพท์</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" placeholder="เช่น 081-234-5678" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* ── 3. Room bookings ─────────────────────────────────────── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">ห้องพัก</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <RoomTypeBookingBuilder />
              </CardContent>
            </Card>

            {/* ── 4. Payment ──────────────────────────────────────────── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">การชำระเงิน</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <FormField
                  control={form.control}
                  name="payment_mode"
                  render={({ field }) => (
                    <FormItem>
                      <div className="grid grid-cols-3 gap-2">
                        {(
                          [
                            { value: 'reserve', label: 'จองล่วงหน้า',   desc: 'ชำระภายหลัง' },
                            { value: 'partial', label: 'ชำระบางส่วน',   desc: 'มัดจำ / บางส่วน' },
                            { value: 'full',    label: 'ชำระเต็มจำนวน', desc: 'ชำระครบ' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => field.onChange(opt.value)}
                            className={cn(
                              'flex flex-col items-center gap-0.5 radius-card border px-2 py-3 text-center transition-colors',
                              field.value === opt.value
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border text-muted-foreground hover:border-muted-foreground/50',
                            )}
                          >
                            <span className="text-xs font-semibold">{opt.label}</span>
                            <span className="text-[10px] leading-tight">{opt.desc}</span>
                          </button>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />

                {paymentMode !== 'reserve' && <PaymentFields />}
              </CardContent>
            </Card>

            {/* ── 5. Summary ──────────────────────────────────────────── */}
            <BookingSummary />

            {/* Desktop submit */}
            <div className="hidden md:flex md:justify-end md:pt-2">
              <Button type="submit" disabled={!canSubmit} className="min-w-36">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {submitLabel}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* Mobile sticky bar */}
      <BottomBar>
        <Button
          type="button"
          disabled={!canSubmit}
          className="w-full"
          onClick={onSubmit}
        >
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {submitLabel}
        </Button>
      </BottomBar>
    </>
  )
}

// ─── PaymentFields ─────────────────────────────────────────────────────────────

/** Amount + method inputs, shown when payment_mode !== 'reserve'. */
function PaymentFields() {
  const form        = useFormContext<CreateBookingFormValues>()
  const paymentMode = useWatch({ control: form.control, name: 'payment_mode' })
  const totalAmount = useTotalAmount()

  return (
    <div className="grid grid-cols-2 gap-3">
      <FormField
        control={form.control}
        name="payment_amount"
        render={({ field }) => (
          <FormItem>
            <FormLabel>ยอดชำระ (฿)</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder={
                  paymentMode === 'full' && totalAmount > 0
                    ? totalAmount.toLocaleString()
                    : 'เช่น 1500'
                }
                value={field.value ?? ''}
                onChange={(e) =>
                  field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                }
              />
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="payment_method"
        render={({ field }) => (
          <FormItem>
            <FormLabel>วิธีชำระ</FormLabel>
            <FormControl>
              <div className="grid grid-cols-2 gap-2">
                {(['CASH', 'TRANSFER'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => field.onChange(m)}
                    className={cn(
                      'radius-button border px-2 py-2 text-xs font-medium transition-colors',
                      field.value === m
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:border-muted-foreground/50',
                    )}
                  >
                    {m === 'CASH' ? 'เงินสด' : 'โอนเงิน'}
                  </button>
                ))}
              </div>
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  )
}
