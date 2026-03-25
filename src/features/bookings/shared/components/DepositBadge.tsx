import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { cn, formatCompactNumber } from '@/shared/utils'
import { computeDeposit } from '../depositUtils'

interface DepositSource {
  key_deposit_amount?: number
  deposit_paid?: number
  deposit_status?: string
  balance_amount?: number
}

/**
 * Inline deposit status badge.
 *
 * PENDING  → "เก็บ X" (warning/amber)
 * COLLECTED → "เก็บแล้ว X" (success/green)
 * NONE     → renders nothing
 */
export function DepositBadge({
  booking,
  className,
}: {
  booking: DepositSource
  className?: string
}) {
  const d = computeDeposit(booking)

  if (d.status === 'NONE' || (d.expected === 0 && d.paid === 0)) return null

  if (d.status === 'PENDING') {
    return (
      <span className={cn('flex items-center gap-1.5 text-xs font-medium text-warning', className)}>
        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
        เก็บ {formatCompactNumber(d.remaining)}
      </span>
    )
  }

  // COLLECTED
  return (
    <span className={cn('flex items-center gap-1.5 text-xs font-medium text-success', className)}>
      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
      เก็บแล้ว {formatCompactNumber(d.paid)}
    </span>
  )
}

/**
 * Deposit return reminder for checkout.
 * Shows "คืนประกัน X" when deposit was collected and guest is checking out.
 * Respects deposit_returned override (null=full, 0=ไม่คืน, N=partial).
 */
export function DepositReturnBadge({
  booking,
  className,
}: {
  booking: DepositSource
  className?: string
}) {
  const d = computeDeposit(booking)
  if (d.status !== 'COLLECTED' || d.toReturn <= 0) return null

  return (
    <span className={cn('text-xs font-medium text-warning', className)}>
      คืนประกัน {formatCompactNumber(d.toReturn)}
    </span>
  )
}
