import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  AlertDialog, AlertDialogContent,
  AlertDialogHeader, AlertDialogFooter, AlertDialogTitle,
  AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/shared/ui/alert-dialog'
import { ConfirmActionCard } from '@/shared/ui/confirm-action-card'
import { formatCompactNumber } from '@/shared/utils'
import type { CheckoutBooking, CheckoutStay } from '../utils/operationTypes'
import { DepositReturnBadge } from '../../shared/components/DepositBadge'

// ─── Single-Room Check-Out Card ──────────────────────────────────────────────

export function SingleRoomCheckOutCard({
  co,
  stay,
  canCheckOut,
  onCheckOut,
}: {
  co: CheckoutBooking
  stay: CheckoutStay
  canCheckOut: boolean
  onCheckOut: () => void
}) {
  const hasBalance = co.balance > 0

  return (
    <ConfirmActionCard
      disabled={!canCheckOut}
      confirmTitle="ยืนยันเช็คเอาท์"
      confirmDescription={`เช็คเอาท์ ${co.guestName} ห้อง ${stay.roomNumber} ?`}
      confirmLabel="เช็คเอาท์"
      onConfirm={onCheckOut}
      className="space-card"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-body font-semibold truncate">{co.guestName}</span>
        <span className="text-helper shrink-0">1 ห้อง · {co.nights} คืน</span>
      </div>
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-helper">ห้อง {stay.roomNumber}</span>
        {canCheckOut && <LogOut className="w-4 h-4 text-warning shrink-0" />}
      </div>
      {hasBalance && (
        <p className="text-helper text-destructive font-medium mt-0.5">
          ค้าง ฿{formatCompactNumber(co.balance)}
        </p>
      )}
      <DepositReturnBadge booking={{ key_deposit_amount: co.keyDepositAmount, deposit_paid: co.depositPaid, deposit_status: co.depositStatus }} className="text-helper font-medium mt-0.5" />
    </ConfirmActionCard>
  )
}

// ─── Multi-Room Check-Out Row ────────────────────────────────────────────────

export function MultiRoomCheckOutRow({
  stay,
  guestName,
  canCheckOut,
  onCheckOut,
}: {
  stay: CheckoutStay
  guestName: string
  canCheckOut: boolean
  onCheckOut: () => void
}) {
  return (
    <ConfirmActionCard
      disabled={!canCheckOut}
      icon={<LogOut className="w-4 h-4 text-warning" />}
      confirmTitle="ยืนยันเช็คเอาท์"
      confirmDescription={`เช็คเอาท์ ${guestName} ห้อง ${stay.roomNumber} ?`}
      confirmLabel="เช็คเอาท์"
      onConfirm={onCheckOut}
      className="radius-button px-3 py-2.5"
    >
      <span className="text-body font-bold tabular-nums">ห้อง {stay.roomNumber}</span>
    </ConfirmActionCard>
  )
}

// ─── Check-Out All Button ────────────────────────────────────────────────────

export function CheckOutAllButton({
  guestName,
  pendingStays,
  onCheckOutAll,
}: {
  guestName: string
  pendingStays: CheckoutStay[]
  onCheckOutAll: () => void
}) {
  const [open, setOpen] = useState(false)
  const roomLabel = pendingStays.map((s) => s.roomNumber).join(', ')

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 text-xs h-auto py-1 px-2 text-primary hover:text-primary/80"
        onClick={() => setOpen(true)}
      >
        <LogOut size={12} />
        เช็คเอาท์ทั้งหมด
      </Button>

      <AlertDialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันเช็คเอาท์ทั้งหมด</AlertDialogTitle>
            <AlertDialogDescription>
              เช็คเอาท์ {guestName} ห้อง {roomLabel} ({pendingStays.length} ห้อง) พร้อมกัน ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              onCheckOutAll()
              setOpen(false)
            }}>
              เช็คเอาท์ทั้งหมด
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
