import { useEffect, useRef } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { Banknote, KeyRound, CreditCard, Clock } from 'lucide-react'
import { cn, formatCompactNumber } from '@/shared/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/form'
import { Input } from '@/shared/ui/input'
import { ToggleGroup } from '@/shared/ui/ToggleGroup'
import { KEY_DEPOSIT_PER_ROOM } from '../../constants'
import type { CreateBookingFormValues } from '../utils/createBookingSchema'
import { useTotalAmount } from './BookingSummary'

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

// ─── PaymentModeSelector ──────────────────────────────────────────────────────

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

// ─── Composed Section ─────────────────────────────────────────────────────────

interface BookingPaymentSectionProps {
  paymentMode: string
}

export function BookingPaymentSection({ paymentMode }: BookingPaymentSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">การชำระเงิน</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <PaymentModeSelector />
        {paymentMode !== 'reserve' && <PaymentFields />}
      </CardContent>
    </Card>
  )
}
