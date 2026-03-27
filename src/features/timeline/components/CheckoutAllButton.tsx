import { useState } from 'react'
import toast from 'react-hot-toast'
import { LogOut, Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/shared/ui/alert-dialog'
import type { useCheckoutRooms } from '@/features/bookings/hooks'

// ── Types ────────────────────────────────────────────────────────────────────

interface CheckoutAllButtonProps {
  guestName: string
  stays: { id: string; room_number?: string }[]
  checkoutMutation: ReturnType<typeof useCheckoutRooms>
}

// ── Component ────────────────────────────────────────────────────────────────

export function CheckoutAllButton({
  guestName,
  stays,
  checkoutMutation,
}: CheckoutAllButtonProps) {
  const [open, setOpen] = useState(false)
  const roomLabel = stays.map((s) => s.room_number ?? '?').join(', ')

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 text-xs h-auto py-1 px-2 text-primary hover:text-primary/80"
        disabled={checkoutMutation.isPending}
        onClick={() => setOpen(true)}
      >
        {checkoutMutation.isPending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <LogOut size={12} />
        )}
        เช็คเอาท์ทั้งหมด
      </Button>

      <AlertDialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันเช็คเอาท์ทั้งหมด</AlertDialogTitle>
            <AlertDialogDescription>
              เช็คเอาท์ {guestName} ห้อง {roomLabel} ({stays.length} ห้อง) พร้อมกัน ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              checkoutMutation.mutate(stays.map((s) => s.id), {
                onSuccess: () => toast.success(`เช็คเอาท์ ${stays.length} ห้องสำเร็จ`),
                onError: (err: Error) => toast.error(err.message || 'เกิดข้อผิดพลาด'),
              })
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
