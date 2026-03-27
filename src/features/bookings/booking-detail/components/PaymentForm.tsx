import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { Button } from '../../../../shared/ui/button'
import { Input } from '../../../../shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../shared/ui/select'
import type { PaymentFormValues } from '../hooks/usePaymentPanel'

// ── Schema ───────────────────────────────────────────────────────────────────

export const paymentSchema = z.object({
  amount: z
    .string()
    .min(1, 'กรุณาระบุจำนวนเงิน')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'จำนวนเงินต้องมากกว่า 0')
    .refine((v) => { const n = Number(v); return Number.isFinite(n) && Math.round(n * 100) === n * 100 }, 'ระบุได้ไม่เกิน 2 ตำแหน่งทศนิยม'),
  method: z.enum(['CASH', 'TRANSFER'], { required_error: 'กรุณาเลือกวิธีชำระเงิน' }),
  note: z.string().max(255).optional(),
})

// ── Component ────────────────────────────────────────────────────────────────

export function PaymentForm({
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
