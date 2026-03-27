import { Plus, ShieldCheck, ShieldOff } from 'lucide-react'
import { cn } from '@/shared/utils'
import { formatTHB, formatCompactNumber } from '../../../../shared/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../shared/ui/card'
import { Button } from '../../../../shared/ui/button'
import { Input } from '../../../../shared/ui/input'
import { Separator } from '../../../../shared/ui/separator'
import type { BookingResponse } from '../../types'
import { computeDeposit } from '../../shared/depositUtils'
import { filterPaymentsByType } from '../utils/paymentUtils'
import { usePaymentPanel } from '../hooks/usePaymentPanel'
import { PaymentForm } from './PaymentForm'
import { RoomPaymentHistory, DepositPaymentHistory } from './PaymentHistory'

// ── PaymentPanel ─────────────────────────────────────────────────────────────

export function PaymentPanel({ booking }: { booking: BookingResponse }) {
  const panel = usePaymentPanel(booking)

  const isSettled = booking.status === 'CANCELLED' || booking.status === 'CHECKED_OUT'
  const hasBalance = booking.balance_amount > 0.005
  const dep = computeDeposit(booking)
  const hasDeposit = dep.expected > 0

  const roomPayments = filterPaymentsByType(booking.payments, ['PAYMENT', 'REFUND'])
  const depositPayments = filterPaymentsByType(booking.payments, ['DEPOSIT', 'DEPOSIT_REFUND'])

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
              className="text-success"
            />
          )}
          <SummaryRow label="ชำระแล้ว" value={formatTHB(booking.paid_amount)} />
          <Separator />
          <SummaryRow
            label="ยอดค้างชำระ"
            value={formatTHB(Math.max(0, booking.balance_amount))}
            className={cn('font-semibold', hasBalance ? 'text-destructive' : 'text-success')}
          />
          {dep.status !== 'NONE' && hasDeposit && (
            <>
              <Separator />
              {dep.status === 'PENDING' && (
                <DepositPending dep={dep} onExempt={panel.exemptDeposit} />
              )}
              {dep.status === 'COLLECTED' && (
                <DepositCollected dep={dep} onUpdateReturn={panel.updateDepositReturn} />
              )}
            </>
          )}
        </div>

        {/* ── Payment history ─────────────────────────────────────────────── */}
        <RoomPaymentHistory
          payments={roomPayments}
          editingPaymentId={panel.editingPaymentId}
          isUpdatePending={panel.isUpdatePending}
          onStartEdit={panel.startEdit}
          onStartPick={panel.startPick}
          onCancelEdit={panel.cancelEdit}
          onEditSubmit={panel.onEditSubmit}
        />

        <DepositPaymentHistory payments={depositPayments} />

        {/* ── Add payment form / button ───────────────────────────────────── */}
        {!isSettled && hasBalance && (
          <>
            {panel.showForm ? (
              <PaymentForm
                title="รับชำระเงิน"
                defaultValues={{ amount: '', method: 'CASH', note: '' }}
                isPending={panel.isCreatePending}
                balancePlaceholder={String(Math.max(0, booking.balance_amount).toFixed(2))}
                onSubmit={panel.onCreateSubmit}
                onCancel={() => panel.setShowForm(false)}
              />
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => panel.setShowForm(true)}
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

// ── Helpers ──────────────────────────────────────────────────────────────────
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

function DepositPending({
  dep,
  onExempt,
}: {
  dep: { paid: number; expected: number }
  onExempt: () => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">ประกัน</span>
        <span className="font-semibold tabular-nums">
          {formatCompactNumber(dep.paid)} / {formatCompactNumber(dep.expected)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-warning transition-all"
          style={{ width: `${dep.expected > 0 ? Math.round((dep.paid / dep.expected) * 100) : 0}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">เก็บอัตโนมัติเมื่อเช็คอิน</span>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer flex items-center gap-1"
          onClick={onExempt}
        >
          <ShieldOff className="w-3 h-3" />
          ยกเว้น
        </button>
      </div>
    </div>
  )
}

function DepositCollected({
  dep,
  onUpdateReturn,
}: {
  dep: { paid: number; toReturn: number }
  onUpdateReturn: (val: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-success">
          <ShieldCheck className="w-3.5 h-3.5" />
          ประกันเก็บครบ
        </span>
        <span className="font-semibold tabular-nums text-success">
          {formatCompactNumber(dep.paid)}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">คืนประกัน</span>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="0"
            max={dep.paid}
            className="w-24 h-8 text-right text-sm tabular-nums"
            defaultValue={dep.toReturn}
            onBlur={(e) => {
              const val = Math.max(0, Math.min(dep.paid, parseInt(e.target.value) || 0))
              if (val !== dep.toReturn) {
                onUpdateReturn(val)
              }
            }}
          />
          <span className="text-xs text-muted-foreground">/ {formatCompactNumber(dep.paid)}</span>
        </div>
      </div>
    </div>
  )
}
