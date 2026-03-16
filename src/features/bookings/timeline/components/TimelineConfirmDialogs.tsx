import { Keyboard } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/shared/ui/alert-dialog'
import type { TimelineBooking } from '../../types'

// ─── Keyboard Help Dialog ────────────────────────────────────────────────────

export function KeyboardHelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            คีย์ลัด Timeline
          </DialogTitle>
          <DialogDescription>ใช้คีย์ลัดเพื่อจัดการ booking บน timeline ได้เร็วขึ้น</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="space-y-2">
            <p className="text-label text-muted-foreground">การเลือก</p>
            <div className="flex justify-between"><span>เปิดรายละเอียด</span><kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">Enter</kbd></div>
            <div className="flex justify-between"><span>เมนูคลิกขวา</span><kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">Shift + F10</kbd></div>
          </div>
          <div className="border-t border-border-soft" />
          <div className="space-y-2">
            <p className="text-label text-muted-foreground">ย้าย Booking</p>
            <div className="flex justify-between"><span>ย้ายซ้าย/ขวา (±1 วัน)</span><kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">← →</kbd></div>
            <div className="flex justify-between"><span>ย้ายห้อง (ขึ้น/ลง)</span><kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">↑ ↓</kbd></div>
          </div>
          <div className="border-t border-border-soft" />
          <div className="space-y-2">
            <p className="text-label text-muted-foreground">ปรับระยะเวลา</p>
            <div className="flex justify-between"><span>ขยาย check-out +1 วัน</span><kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">Shift + →</kbd></div>
            <div className="flex justify-between"><span>ลด check-out -1 วัน</span><kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">Shift + ←</kbd></div>
          </div>
          <div className="border-t border-border-soft" />
          <p className="text-helper text-center">กด <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">?</kbd> เพื่อเปิด/ปิดหน้าต่างนี้</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Cancel Confirmation ─────────────────────────────────────────────────────

export function CancelConfirmDialog({
  target,
  onClose,
  onConfirm,
}: {
  target: TimelineBooking | null
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ยืนยันการยกเลิก</AlertDialogTitle>
          <AlertDialogDescription>
            ต้องการยกเลิกการจองของ <strong>{target?.guest_name}</strong>{' '}
            ({target?.check_in} → {target?.check_out}) ใช่หรือไม่?
            การดำเนินการนี้ไม่สามารถย้อนกลับได้
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            ยืนยัน ยกเลิกการจอง
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── Check-in Confirmation ───────────────────────────────────────────────────

export function CheckInConfirmDialog({
  target,
  onClose,
  onConfirm,
}: {
  target: { booking: TimelineBooking; roomId: string } | null
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ยืนยันเช็คอิน</AlertDialogTitle>
          <AlertDialogDescription>
            เช็คอิน {target?.booking.guest_name} ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            เช็คอิน
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── Check-out Confirmation ──────────────────────────────────────────────────

export function CheckOutConfirmDialog({
  target,
  onClose,
  onConfirm,
}: {
  target: TimelineBooking | null
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ยืนยันเช็คเอาท์</AlertDialogTitle>
          <AlertDialogDescription>
            เช็คเอาท์ {target?.guest_name} ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            เช็คเอาท์
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
