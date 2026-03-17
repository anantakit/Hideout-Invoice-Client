import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useFormContext, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, Loader2, Banknote, KeyRound, CreditCard, Clock } from 'lucide-react'
import { cn, todayISO, addDaysISO, formatCompactNumber } from '@/shared/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
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
import SearchableComboBox from '@/shared/ui/SearchableComboBox'
import { useCreateBooking } from '../hooks'
import { createBookingSchema } from '../create-booking/utils/createBookingSchema'
import type { CreateBookingFormValues } from '../create-booking/utils/createBookingSchema'
import { expandGroupedStays } from '../create-booking/utils/expandGroupedStays'
import { RoomTypeBookingBuilder } from '../create-booking/components/RoomTypeBookingBuilder'
import { BookingSummary, useTotalAmount } from '../create-booking/components/BookingSummary'
import { ROUTES } from '@/app/routes'
import { customersApi } from '../../customers/api'
import CustomerModal from '../../customers/components/CustomerModal'
import type { Customer } from '../../customers/types'

const KEY_DEPOSIT_PER_ROOM = 200

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CreateBookingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const createBooking = useCreateBooking()
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)

  // Allow pre-filling from URL: /bookings/new?check_in=...&check_out=...&room_type_id=...&room_id=...
  const urlCheckIn    = searchParams.get('check_in')     || todayISO()
  const urlCheckOut   = searchParams.get('check_out')    || addDaysISO(1)
  const urlRoomTypeId = searchParams.get('room_type_id') || ''
  const urlRoomId     = searchParams.get('room_id')      || ''

  const form = useForm<CreateBookingFormValues>({
    resolver: zodResolver(createBookingSchema),
    mode: 'onBlur',
    defaultValues: {
      source: 'advance',
      guest_name: '',
      guest_phone: '',
      customer_id: undefined,
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
      payment_mode: 'full',
      payment_amount: undefined,
      payment_method: 'CASH',
      key_deposit_amount: undefined,
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

  const handleCustomerCreated = useCallback(
    (customer: Customer) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setSelectedCustomer(customer)
      form.setValue('customer_id', customer.id)
      setCustomerModalOpen(false)
    },
    [queryClient, form],
  )

  const submitLabel =
    source === 'walk_in'
      ? paymentMode === 'reserve'
        ? 'เช็คอิน (ค้างชำระ)'
        : 'เช็คอิน & ชำระเงิน'
      : 'ยืนยันการจอง'

  const onSubmit = form.handleSubmit((values) => {
    // Expand grouped items into individual stay payloads.
    const stays = expandGroupedStays(values.items)

    const totalRooms = values.items.reduce((s, i) => s + Math.max(1, i.quantity ?? 1), 0)
    const depositAmount = values.payment_mode === 'full_deposit'
      ? (values.key_deposit_amount ?? KEY_DEPOSIT_PER_ROOM * totalRooms)
      : 0

    const payment =
      values.payment_mode !== 'reserve' && values.payment_amount
        ? { amount: values.payment_amount, method: values.payment_method }
        : undefined

    createBooking.mutate(
      {
        source: values.source,
        guest_name: values.guest_name,
        guest_phone: values.guest_phone,
        customer_id: values.customer_id || undefined,
        key_deposit_amount: depositAmount,
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
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-10 space-y-5">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 text-muted-foreground mb-1"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            กลับ
          </Button>
          <h1 className="text-h1 text-xl sm:text-2xl">สร้างการจอง</h1>
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
                            { value: 'advance', label: 'จองล่วงหน้า', desc: 'จองห้องพักล่วงหน้า' },
                            { value: 'walk_in', label: 'วอล์คอิน',     desc: 'เช็คอินทันที' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => field.onChange(opt.value)}
                            className={cn(
                              'flex flex-col items-center gap-0.5 radius-card border px-3 py-3 text-center transition-colors',
                              field.value === opt.value
                                ? 'border-primary bg-primary/15 text-primary'
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
                        <Input
                          {...field}
                          inputMode="numeric"
                          maxLength={10}
                          placeholder="0812345678"
                          onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* ── Customer link (optional) ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">ผู้ชำระเงิน (ไม่บังคับ)</label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setCustomerModalOpen(true)}>
                      + สร้างลูกค้า
                    </Button>
                  </div>
                  <FormField
                    control={form.control}
                    name="customer_id"
                    render={({ field }) => (
                      <SearchableComboBox<Customer>
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        onSelectItem={(item) => setSelectedCustomer(item)}
                        fetchFunction={(params) => customersApi.list(params)}
                        valueKey="id"
                        labelKey="name"
                        displayValue={selectedCustomer?.name}
                        placeholder="ค้นหาลูกค้า..."
                        sheetTitle="เลือกผู้ชำระเงิน"
                      />
                    )}
                  />
                  {selectedCustomer && (
                    <div className="text-xs text-muted-foreground space-y-0.5 pl-1">
                      <p className="font-semibold text-foreground">{selectedCustomer.name}</p>
                      {selectedCustomer.phone && <p>โทร: {selectedCustomer.phone}</p>}
                      {selectedCustomer.tax_id && <p>เลขผู้เสียภาษี: {selectedCustomer.tax_id}</p>}
                    </div>
                  )}
                </div>
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
                <PaymentModeSelector />
                {paymentMode !== 'reserve' && <PaymentFields />}
              </CardContent>
            </Card>

            {/* ── 5. Summary ──────────────────────────────────────────── */}
            <BookingSummary />

            {/* Submit */}
            <div className="pt-2">
              <Button type="submit" disabled={!canSubmit} className="w-full md:w-auto md:min-w-36 md:float-right">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {submitLabel}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <CustomerModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onCreated={handleCustomerCreated}
      />
    </>
  )
}

// ─── PaymentModeSelector ──────────────────────────────────────────────────────

const PAYMENT_OPTIONS = [
  {
    value: 'full' as const,
    label: 'ค่าห้อง',
    desc: 'ชำระเต็มจำนวน',
    Icon: Banknote,
  },
  {
    value: 'full_deposit' as const,
    label: 'ค่าห้อง + ประกันกุญแจ',
    desc: 'ชำระเต็ม + เงินประกัน',
    Icon: KeyRound,
  },
  {
    value: 'partial' as const,
    label: 'ชำระบางส่วน',
    desc: 'กรอกจำนวนเอง',
    Icon: CreditCard,
  },
  {
    value: 'reserve' as const,
    label: 'ชำระภายหลัง',
    desc: 'ไม่ชำระตอนจอง',
    Icon: Clock,
  },
]

function PaymentModeSelector() {
  const form = useFormContext<CreateBookingFormValues>()
  const totalAmount = useTotalAmount()
  const items = useWatch({ control: form.control, name: 'items' })
  const paymentMode = useWatch({ control: form.control, name: 'payment_mode' })

  const totalRooms = items.reduce((s, i) => s + Math.max(1, i.quantity ?? 1), 0)
  const depositAmount = KEY_DEPOSIT_PER_ROOM * totalRooms

  // Auto-fill payment_amount when mode changes
  useEffect(() => {
    if (paymentMode === 'full') {
      form.setValue('payment_amount', totalAmount)
      form.setValue('key_deposit_amount', undefined)
    } else if (paymentMode === 'full_deposit') {
      form.setValue('payment_amount', totalAmount + depositAmount)
      form.setValue('key_deposit_amount', depositAmount)
    } else if (paymentMode === 'partial') {
      // Don't auto-fill for partial — let user type
      form.setValue('key_deposit_amount', undefined)
    } else {
      // reserve
      form.setValue('payment_amount', undefined)
      form.setValue('key_deposit_amount', undefined)
    }
  }, [paymentMode, totalAmount, depositAmount, form])

  return (
    <FormField
      control={form.control}
      name="payment_mode"
      render={({ field }) => (
        <FormItem>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => field.onChange(opt.value)}
                className={cn(
                  'flex items-center gap-2.5 radius-card border px-3 py-3 text-left transition-colors',
                  field.value === opt.value
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-muted-foreground hover:border-muted-foreground/50',
                )}
              >
                <opt.Icon className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-semibold block leading-tight">{opt.label}</span>
                  <span className="text-[10px] leading-tight block">{opt.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </FormItem>
      )}
    />
  )
}

// ─── PaymentFields ─────────────────────────────────────────────────────────────

/** Amount + method inputs, shown when payment_mode !== 'reserve'. */
function PaymentFields() {
  const form        = useFormContext<CreateBookingFormValues>()
  const paymentMode = useWatch({ control: form.control, name: 'payment_mode' })
  const totalAmount = useTotalAmount()
  const isReadOnly  = paymentMode === 'full' || paymentMode === 'full_deposit'

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
                readOnly={isReadOnly}
                className={cn(isReadOnly && 'bg-muted cursor-default')}
                placeholder={
                  paymentMode === 'partial' && totalAmount > 0
                    ? formatCompactNumber(totalAmount)
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
                        ? 'border-primary bg-primary/15 text-primary'
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
