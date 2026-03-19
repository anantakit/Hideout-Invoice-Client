import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Banknote, CreditCard, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/shared/utils'
import { formatTHB, formatThaiDate } from '../../../../shared/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../shared/ui/card'
import { Button } from '../../../../shared/ui/button'
import { Input } from '../../../../shared/ui/input'
import { Separator } from '../../../../shared/ui/separator'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '../../../../shared/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../shared/ui/select'
import { useCreatePayment } from '../../hooks'
import type { BookingResponse } from '../../types'

// ─── Schema ────────────────────────────────────────────────────────────────────

const paymentSchema = z.object({
  amount: z
    .string()
    .min(1, 'กรุณาระบุจำนวนเงิน')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'จำนวนเงินต้องมากกว่า 0'),
  method: z.enum(['CASH', 'TRANSFER'], { required_error: 'กรุณาเลือกวิธีชำระเงิน' }),
  note: z.string().max(255).optional(),
})

type PaymentFormValues = z.infer<typeof paymentSchema>

// ─── PaymentPanel ──────────────────────────────────────────────────────────────

export function PaymentPanel({ booking }: { booking: BookingResponse }) {
  const [showForm, setShowForm] = useState(false)
  const createPayment = useCreatePayment(booking.id)

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: '', method: 'CASH', note: '' },
  })

  const isSettled = booking.status === 'CANCELLED' || booking.status === 'CHECKED_OUT'
  const hasBalance = booking.balance_amount > 0.005

  function onSubmit(values: PaymentFormValues) {
    createPayment.mutate(
      {
        amount: Number(values.amount),
        method: values.method,
        note: values.note || undefined,
        idempotency_key: crypto.randomUUID(),
      },
      {
        onSuccess: () => {
          toast.success('บันทึกการชำระเงินสำเร็จ')
          form.reset()
          setShowForm(false)
        },
        onError: (err) => {
          toast.error((err as Error).message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-helper font-semibold">การชำระเงิน</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-3 space-y-4">

        {/* ── Summary rows ────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <SummaryRow label="ค่าห้องรวม" value={formatTHB(booking.total_amount)} />
          {booking.discount_amount > 0 && (
            <SummaryRow
              label="ส่วนลด"
              value={`-${formatTHB(booking.discount_amount)}`}
              className="text-green-600"
            />
          )}
          <SummaryRow label="ชำระแล้ว" value={formatTHB(booking.paid_amount)} />
          <Separator />
          <SummaryRow
            label="ยอดค้างชำระ"
            value={formatTHB(Math.max(0, booking.balance_amount))}
            className={cn('font-semibold', hasBalance ? 'text-destructive' : 'text-green-600')}
          />
          {booking.key_deposit_amount > 0 && (
            <>
              <Separator />
              <SummaryRow
                label="ประกันกุญแจ"
                value={formatTHB(booking.key_deposit_amount)}
                className="text-amber-500"
              />
            </>
          )}
        </div>

        {/* ── Payment history ─────────────────────────────────────────────── */}
        {booking.payments.length > 0 && (
          <div className="space-y-2">
            <p className="text-helper font-medium">ประวัติการชำระ</p>
            <div className="space-y-1.5">
              {booking.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {p.method === 'CASH' ? (
                      <Banknote className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <CreditCard className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{p.method === 'CASH' ? 'เงินสด' : 'โอนเงิน'}</span>
                    {p.note && (
                      <span className="truncate max-w-[120px] text-xs">({p.note})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatTHB(p.amount)}</span>
                    <span className="text-helper">
                      {formatThaiDate(p.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Add payment form / button ────────────────────────────────────── */}
        {!isSettled && (
          <>
            {showForm ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-body font-medium">รับชำระเงิน</p>
                    <button
                      type="button"
                      onClick={() => { setShowForm(false); form.reset() }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>จำนวนเงิน (บาท)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder={hasBalance ? String(Math.max(0, booking.balance_amount).toFixed(2)) : '0.00'}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>วิธีชำระเงิน</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CASH">เงินสด</SelectItem>
                            <SelectItem value="TRANSFER">โอนเงิน</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>หมายเหตุ (ไม่บังคับ)</FormLabel>
                        <FormControl>
                          <Input placeholder="เช่น เลขที่อ้างอิงการโอน" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => { setShowForm(false); form.reset() }}
                    >
                      ยกเลิก
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      className="flex-1"
                      disabled={createPayment.isPending}
                    >
                      {createPayment.isPending ? 'กำลังบันทึก…' : 'บันทึก'}
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowForm(true)}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                รับชำระเงิน
              </Button>
            )}
          </>
        )}

      </CardContent>
    </Card>
  )
}

// ─── Helper ────────────────────────────────────────────────────────────────────

function SummaryRow({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-medium tabular-nums', className)}>{value}</span>
    </div>
  )
}
