import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Banknote, CreditCard, Plus, X, ShieldCheck, ShieldAlert, ShieldOff, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/shared/utils'
import { formatTHB, formatThaiDate, getErrorMessage, formatCompactNumber } from '../../../../shared/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../shared/ui/card'
import { Button } from '../../../../shared/ui/button'
import { Input } from '../../../../shared/ui/input'
import { Separator } from '../../../../shared/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../shared/ui/select'
import { useCreatePayment, useUpdateBooking, useUpdatePayment } from '../../hooks'
import type { BookingResponse, PaymentResponse } from '../../types'

// ─── Schema ────────────────────────────────────────────────────────────────────

const paymentSchema = z.object({
  amount: z
    .string()
    .min(1, 'กรุณาระบุจำนวนเงิน')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'จำนวนเงินต้องมากกว่า 0')
    .refine((v) => { const n = Number(v); return Number.isFinite(n) && Math.round(n * 100) === n * 100 }, 'ระบุได้ไม่เกิน 2 ตำแหน่งทศนิยม'),
  method: z.enum(['CASH', 'TRANSFER'], { required_error: 'กรุณาเลือกวิธีชำระเงิน' }),
  note: z.string().max(255).optional(),
})

type PaymentFormValues = z.infer<typeof paymentSchema>

// ─── Shared inline form ────────────────────────────────────────────────────────

function PaymentForm({
  title,
  defaultValues,
  isPending,
  onSubmit,
  onCancel,
  balancePlaceholder,
}: {
  title: string
  defaultValues: PaymentFormValues
  isPending: boolean
  onSubmit: (values: PaymentFormValues) => void
  onCancel: () => void
  balancePlaceholder?: string
}) {
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues,
  })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <p className="text-body font-medium">{title}</p>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-caption block mb-1">จำนวนเงิน (บาท)</label>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            placeholder={balancePlaceholder ?? '0.00'}
            {...form.register('amount')}
          />
          {form.formState.errors.amount && (
            <p className="text-xs text-destructive mt-1">{form.formState.errors.amount.message}</p>
          )}
        </div>
        <div>
          <label className="text-caption block mb-1">วิธีชำระเงิน</label>
          <Select
            onValueChange={(v) => form.setValue('method', v as 'CASH' | 'TRANSFER')}
            defaultValue={form.getValues('method')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CASH">เงินสด</SelectItem>
              <SelectItem value="TRANSFER">โอนเงิน</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.method && (
            <p className="text-xs text-destructive mt-1">{form.formState.errors.method.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="text-caption block mb-1">หมายเหตุ (ไม่บังคับ)</label>
        <Input placeholder="เช่น เลขที่อ้างอิงการโอน" {...form.register('note')} />
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onCancel}>
          ยกเลิก
        </Button>
        <Button type="submit" size="sm" className="flex-1" disabled={isPending}>
          {isPending ? 'กำลังบันทึก…' : 'บันทึก'}
        </Button>
      </div>
    </form>
  )
}

// ─── PaymentPanel ──────────────────────────────────────────────────────────────

export function PaymentPanel({ booking }: { booking: BookingResponse }) {
  const [showForm, setShowForm] = useState(false)
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const createPayment = useCreatePayment(booking.id)
  const updatePayment = useUpdatePayment(booking.id)
  const updateBooking = useUpdateBooking(booking.id)

  const isSettled = booking.status === 'CANCELLED' || booking.status === 'CHECKED_OUT'
  const hasBalance = booking.balance_amount > 0.005
  const hasDeposit = booking.key_deposit_amount > 0

  function startEdit(payment: PaymentResponse) {
    setEditingPaymentId(payment.id)
  }

  function cancelEdit() {
    setEditingPaymentId(null)
  }

  function onEditSubmit(paymentId: string, original: PaymentResponse, values: PaymentFormValues) {
    const payload: Record<string, unknown> = {}
    const newAmount = Number(values.amount)
    if (newAmount !== original.amount) payload.amount = newAmount
    if (values.method !== original.method) payload.method = values.method
    const newNote = values.note ?? ''
    const oldNote = original.note ?? ''
    if (newNote !== oldNote) payload.note = newNote

    if (Object.keys(payload).length === 0) {
      cancelEdit()
      return
    }

    updatePayment.mutate(
      { paymentId, payload },
      {
        onSuccess: () => {
          toast.success('แก้ไขการชำระเงินสำเร็จ')
          cancelEdit()
        },
        onError: (err) => {
          toast.error(getErrorMessage(err))
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
          {booking.deposit_status !== 'NONE' && hasDeposit && (
            <>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                {booking.deposit_status === 'PENDING' ? (
                  <span className="flex items-center gap-1.5 text-amber-500">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    เก็บประกัน
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-green-600">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    เก็บแล้ว
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <span className={cn('font-semibold tabular-nums', booking.deposit_status === 'PENDING' ? 'text-amber-500' : 'text-green-600')}>
                    {formatCompactNumber(booking.key_deposit_amount ?? 0)}
                  </span>
                  {booking.deposit_status === 'PENDING' && (
                    <>
                      <button
                        type="button"
                        className="text-xs text-success hover:text-success/80 transition-colors cursor-pointer font-medium"
                        onClick={() => {
                          updateBooking.mutate(
                            { deposit_status: 'COLLECTED' },
                            { onSuccess: () => toast.success('บันทึกเก็บเงินประกันแล้ว') },
                          )
                        }}
                      >
                        เก็บแล้ว
                      </button>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                        onClick={() => {
                          updateBooking.mutate(
                            { deposit_status: 'NONE' },
                            { onSuccess: () => toast.success('ยกเว้นเงินประกันแล้ว') },
                          )
                        }}
                        aria-label="ยกเว้นเงินประกัน"
                      >
                        <ShieldOff className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {booking.deposit_status === 'COLLECTED' && isSettled && (
                <p className="text-xs text-amber-500 font-medium">คืนประกัน {formatCompactNumber(booking.key_deposit_amount ?? 0)}</p>
              )}
            </>
          )}
        </div>

        {/* ── Payment history ─────────────────────────────────────────────── */}
        {booking.payments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-helper font-medium">ประวัติการชำระ</p>
              {!editingPaymentId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground -mr-2 h-7 px-2"
                  onClick={() => {
                    if (booking.payments.length === 1) {
                      startEdit(booking.payments[0])
                    } else {
                      setEditingPaymentId('pick')
                    }
                  }}
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  แก้ไข
                </Button>
              )}
              {editingPaymentId === 'pick' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground -mr-2 h-7 px-2"
                  onClick={cancelEdit}
                >
                  ยกเลิก
                </Button>
              )}
            </div>
            {editingPaymentId === 'pick' && (
              <p className="text-xs text-muted-foreground">เลือกรายการที่ต้องการแก้ไข</p>
            )}
            <div className="space-y-1">
              {booking.payments.map((p) =>
                editingPaymentId === p.id ? (
                  <PaymentForm
                    key={p.id}
                    title="แก้ไขการชำระเงิน"
                    defaultValues={{
                      amount: String(p.amount),
                      method: p.method,
                      note: p.note ?? '',
                    }}
                    isPending={updatePayment.isPending}
                    onSubmit={(v) => onEditSubmit(p.id, p, v)}
                    onCancel={cancelEdit}
                  />
                ) : (
                  <div
                    key={p.id}
                    className={cn(
                      'flex items-center justify-between text-sm py-1.5 -mx-1 px-1 rounded',
                      editingPaymentId === 'pick' && 'cursor-pointer hover:bg-accent/60 transition-colors',
                    )}
                    onClick={editingPaymentId === 'pick' ? () => startEdit(p) : undefined}
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
                ),
              )}
            </div>
          </div>
        )}

        {/* ── Add payment form / button ────────────────────────────────────── */}
        {!isSettled && hasBalance && (
          <>
            {showForm ? (
              <PaymentForm
                title="รับชำระเงิน"
                defaultValues={{ amount: '', method: 'CASH', note: '' }}
                isPending={createPayment.isPending}
                balancePlaceholder={String(Math.max(0, booking.balance_amount).toFixed(2))}
                onSubmit={(values) => {
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
                        setShowForm(false)
                      },
                      onError: (err) => {
                        toast.error(getErrorMessage(err))
                      },
                    },
                  )
                }}
                onCancel={() => setShowForm(false)}
              />
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
