import { useState, useCallback, useEffect, useRef, Fragment } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useFormContext, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, Loader2, Banknote, KeyRound, CreditCard, Clock, Check, X } from 'lucide-react'
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
import { ToggleGroup } from '@/shared/ui/ToggleGroup'
import SearchableComboBox from '@/shared/ui/SearchableComboBox'
import { useCreateBooking } from '../hooks'
import { KEY_DEPOSIT_PER_ROOM } from '../constants'
import { createBookingSchema } from '../create-booking/utils/createBookingSchema'
import type { CreateBookingFormValues } from '../create-booking/utils/createBookingSchema'
import { expandGroupedStays } from '../create-booking/utils/expandGroupedStays'
import { RoomTypeBookingBuilder } from '../create-booking/components/RoomTypeBookingBuilder'
import { BookingSummary, useTotalAmount } from '../create-booking/components/BookingSummary'
import { ROUTES } from '@/app/routes'
import { customersApi } from '../../customers/api'
import CustomerModal from '../../customers/components/CustomerModal'
import type { Customer } from '../../customers/types'

const SOURCE_OPTIONS = [
  { value: 'advance' as const, label: 'จองล่วงหน้า', desc: 'จองห้องพักล่วงหน้า' },
  { value: 'walk_in' as const, label: 'วอล์คอิน',     desc: 'เช็คอินทันที' },
]

function formatPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '')
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 10)}`
}

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
    mode: 'onChange',
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
      toast.success(`เพิ่มลูกค้า "${customer.name}" สำเร็จ`)
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
    const depositAmount = KEY_DEPOSIT_PER_ROOM * totalRooms
    const depositStatus = values.payment_mode === 'full_deposit' ? 'COLLECTED' : 'PENDING'

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
        deposit_status: depositStatus,
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
            onClick={() => navigate('/bookings')}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            กลับ
          </Button>
          <h1 className="text-h1 text-xl sm:text-2xl">สร้างการจอง</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            จองห้องพักล่วงหน้า หรือเช็คอินทันทีสำหรับผู้เข้าพักที่เดินเข้ามา
          </p>
        </div>

        {/* Progress — sticky so it stays visible while scrolling */}
        <div className="sticky top-0 z-10 -mx-4 px-4 py-2.5 bg-background backdrop-blur-sm">
          <div className="flex items-center gap-1 max-w-2xl mx-auto">
            {[
              { label: 'ผู้เข้าพัก', done: hasGuest },
              { label: 'ห้องพัก', done: hasValidItems },
              { label: 'ชำระเงิน', done: hasPayment },
            ].map((step, i, arr) => (
              <Fragment key={step.label}>
                {i > 0 && (
                  <div className={cn('h-px flex-1', arr[i - 1].done ? 'bg-primary/50' : 'bg-border')} />
                )}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold transition-colors motion-reduce:transition-none',
                    step.done
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border text-muted-foreground',
                  )}>
                    {step.done ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  <span className={cn(
                    'text-xs',
                    step.done ? 'text-foreground font-medium' : 'text-muted-foreground',
                  )}>
                    {step.label}
                  </span>
                </div>
              </Fragment>
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-5" noValidate>

            {/* ── 1. Source toggle (lightweight — no wrapping card) ────── */}
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <ToggleGroup
                    options={SOURCE_OPTIONS}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormItem>
              )}
            />

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
                          inputMode="tel"
                          maxLength={12}
                          placeholder="081-234-5678"
                          value={formatPhoneDisplay(field.value)}
                          onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
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
                    <div className="flex items-start justify-between">
                      <div className="text-xs text-muted-foreground space-y-0.5 pl-1">
                        <p className="font-semibold text-foreground">{selectedCustomer.name}</p>
                        {selectedCustomer.phone && <p>โทร: {selectedCustomer.phone}</p>}
                        {selectedCustomer.tax_id && <p>เลขผู้เสียภาษี: {selectedCustomer.tax_id}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(null)
                          form.setValue('customer_id', undefined)
                        }}
                        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="ยกเลิกเลือกผู้ชำระเงิน"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
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
            <div className="pt-4 pb-6">
              <Button type="submit" disabled={!canSubmit} className="w-full touch-target md:w-auto md:min-w-36 md:float-right">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin motion-reduce:animate-none" />}
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

const PAYMENT_MODE_OPTIONS = [
  { value: 'full' as const,         label: 'ค่าห้อง',              desc: 'ชำระเต็มจำนวน',        Icon: Banknote },
  { value: 'full_deposit' as const, label: 'ค่าห้อง + ประกันกุญแจ', desc: 'ชำระเต็ม + เงินประกัน', Icon: KeyRound },
  { value: 'partial' as const,      label: 'ชำระบางส่วน',           desc: 'กรอกจำนวนเอง',         Icon: CreditCard },
  { value: 'reserve' as const,      label: 'ชำระภายหลัง',           desc: 'ไม่ชำระตอนจอง',         Icon: Clock },
]

const PAYMENT_METHOD_OPTIONS = [
  { value: 'CASH' as const,     label: 'เงินสด' },
  { value: 'TRANSFER' as const, label: 'โอนเงิน' },
]

function PaymentModeSelector() {
  const form = useFormContext<CreateBookingFormValues>()
  const totalAmount = useTotalAmount()
  const items = useWatch({ control: form.control, name: 'items' })
  const paymentMode = useWatch({ control: form.control, name: 'payment_mode' })
  const prevModeRef = useRef(paymentMode)

  const totalRooms = items.reduce((s, i) => s + Math.max(1, i.quantity ?? 1), 0)
  const depositAmount = KEY_DEPOSIT_PER_ROOM * totalRooms

  // Auto-fill payment_amount when mode changes (doesn't overwrite user input in partial mode)
  useEffect(() => {
    const modeChanged = prevModeRef.current !== paymentMode
    prevModeRef.current = paymentMode

    if (paymentMode === 'full') {
      form.setValue('payment_amount', totalAmount > 0 ? totalAmount : undefined)
    } else if (paymentMode === 'full_deposit') {
      const total = totalAmount + depositAmount
      form.setValue('payment_amount', total > 0 ? total : undefined)
    } else if (paymentMode === 'partial') {
      if (modeChanged) {
        form.setValue('payment_amount', undefined)
      }
    } else {
      form.setValue('payment_amount', undefined)
    }
  }, [paymentMode, totalAmount, depositAmount, form])

  return (
    <FormField
      control={form.control}
      name="payment_mode"
      render={({ field }) => (
        <FormItem>
          <ToggleGroup
            options={PAYMENT_MODE_OPTIONS}
            value={field.value}
            onChange={field.onChange}
            responsiveColumns
            className="grid-cols-1 sm:grid-cols-2"
          />
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <ToggleGroup
                options={PAYMENT_METHOD_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                compact
              />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  )
}
