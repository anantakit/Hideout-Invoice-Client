import { CheckCircle2, Banknote } from 'lucide-react'
import { cn, formatCompactNumber } from '@/shared/utils'
import { computeDeposit } from '../../shared/depositUtils'

interface CollectSource {
  key_deposit_amount?: number
  deposit_paid?: number
  deposit_status?: string
  balance_amount?: number
}

/**
 * Shows a single-line collection summary for check-in cards.
 *
 * Combines room balance + deposit remaining into one "เก็บ X" figure
 * with a breakdown so staff knows exactly what to collect.
 *
 * - เก็บ 700 (ค่าห้อง 500 + ประกัน 200)
 * - เก็บ 200 (ประกัน)
 * - เก็บ 500 (ค่าห้อง)
 * - จ่ายครบ
 */
export function CollectSummary({
  booking,
  className,
}: {
  booking: CollectSource
  className?: string
}) {
  const d = computeDeposit(booking)

  if (d.totalToCollect <= 0) {
    return (
      <div className={cn('flex items-center gap-1.5 text-xs font-medium text-success', className)}>
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>จ่ายครบ</span>
      </div>
    )
  }

  // Build breakdown parts
  const parts: string[] = []
  if (d.roomBalance > 0) parts.push(`ค่าห้อง ${formatCompactNumber(d.roomBalance)}`)
  if (d.remaining > 0) parts.push(`ประกัน ${formatCompactNumber(d.remaining)}`)
  const breakdown = parts.length > 1 ? ` (${parts.join(' + ')})` : ''

  return (
    <div className={cn('flex items-center gap-1.5 text-xs font-medium text-warning', className)}>
      <Banknote className="w-3.5 h-3.5 shrink-0" />
      <span>เก็บ {formatCompactNumber(d.totalToCollect)}{breakdown}</span>
    </div>
  )
}
