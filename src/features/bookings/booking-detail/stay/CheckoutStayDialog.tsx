import toast from 'react-hot-toast'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/shared/ui/alert-dialog'
import { useCheckoutRooms } from '../../hooks'
import type { RoomStayResponse } from '../../types'

interface CheckoutStayDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  stay: RoomStayResponse
}

export function CheckoutStayDialog({ open, onOpenChange, bookingId, stay }: CheckoutStayDialogProps) {
  const checkout = useCheckoutRooms(bookingId)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ยืนยันเช็คเอาท์</AlertDialogTitle>
          <AlertDialogDescription>
            ต้องการเช็คเอาท์ห้อง {stay.room_number ?? stay.room_type_name} ใช่หรือไม่?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={checkout.isPending}>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            disabled={checkout.isPending}
            onClick={() => {
              checkout.mutate([stay.id], {
                onSuccess: () => {
                  onOpenChange(false)
                  toast.success('เช็คเอาท์สำเร็จ')
                },
                onError: (err) => {
                  toast.error((err as Error).message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
                },
              })
            }}
          >
            {checkout.isPending ? 'กำลังดำเนินการ…' : 'ยืนยันเช็คเอาท์'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
