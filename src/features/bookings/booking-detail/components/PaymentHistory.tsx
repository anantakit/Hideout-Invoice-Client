import { Banknote, CreditCard, Pencil, KeyRound } from 'lucide-react'
import { cn } from '@/shared/utils'
import { formatTHB, formatThaiDate } from '../../../../shared/utils'
import { Button } from '../../../../shared/ui/button'
import type { PaymentResponse } from '../../types'
import type { PaymentFormValues } from '../hooks/usePaymentPanel'
import { PaymentForm } from './PaymentForm'

// ── Room Payment History ─────────────────────────────────────────────────────

export function RoomPaymentHistory({
  payments,
  editingPaymentId,
  isUpdatePending,
  onStartEdit,
  onStartPick,
  onCancelEdit,
  onEditSubmit,
}: {
  payments: PaymentResponse[]
  editingPaymentId: string | null
  isUpdatePending: boolean
  onStartEdit: (payment: PaymentResponse) => void
  onStartPick: () => void
  onCancelEdit: () => void
  onEditSubmit: (paymentId: string, original: PaymentResponse, values: PaymentFormValues) => void
}) {
  if (payments.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-helper font-medium">ประวัติการชำระ</p>
        {!editingPaymentId && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground -mr-2 h-7 px-2"
            onClick={() => {
              if (payments.length === 1) {
                onStartEdit(payments[0])
              } else {
                onStartPick()
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
            onClick={onCancelEdit}
          >
            ยกเลิก
          </Button>
        )}
      </div>
      {editingPaymentId === 'pick' && (
        <p className="text-xs text-muted-foreground">เลือกรายการที่ต้องการแก้ไข</p>
      )}
      <div className="space-y-1">
        {payments.map((p) =>
          editingPaymentId === p.id ? (
            <PaymentForm
              key={p.id}
              title="แก้ไขการชำระเงิน"
              defaultValues={{
                amount: String(p.amount),
                method: p.method,
                note: p.note ?? '',
              }}
              isPending={isUpdatePending}
              onSubmit={(v) => onEditSubmit(p.id, p, v)}
              onCancel={onCancelEdit}
            />
          ) : (
            <PaymentRow
              key={p.id}
              payment={p}
              isPickMode={editingPaymentId === 'pick'}
              onPick={() => onStartEdit(p)}
            />
          ),
        )}
      </div>
    </div>
  )
}

// ── Deposit Payment History ──────────────────────────────────────────────────

export function DepositPaymentHistory({ payments }: { payments: PaymentResponse[] }) {
  if (payments.length === 0) return null

  return (
    <div className="space-y-1">
      {payments.map((p) => (
        <div key={p.id} className="flex items-center justify-between text-sm py-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <KeyRound className="w-3.5 h-3.5 shrink-0" />
            <span>ประกัน</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{formatTHB(p.amount)}</span>
            <span className="text-helper">{formatThaiDate(p.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Payment Row ──────────────────────────────────────────────────────────────

function PaymentRow({
  payment: p,
  isPickMode,
  onPick,
}: {
  payment: PaymentResponse
  isPickMode: boolean
  onPick: () => void
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between text-sm py-1.5 -mx-1 px-1 rounded',
        isPickMode && 'cursor-pointer hover:bg-accent/60 transition-colors',
      )}
      onClick={isPickMode ? onPick : undefined}
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
        <span className="text-helper">{formatThaiDate(p.created_at)}</span>
      </div>
    </div>
  )
}
