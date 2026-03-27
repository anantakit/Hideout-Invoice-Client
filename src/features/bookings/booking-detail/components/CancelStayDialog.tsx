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
import { formatThaiDate } from '@/shared/utils'
import { useCancelStay } from '../../hooks'
import type { RoomStayResponse } from '../../types'

interface CancelStayDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  stay: RoomStayResponse
}

export function CancelStayDialog({ open, onOpenChange, bookingId, stay }: CancelStayDialogProps) {
  const cancel = useCancelStay(bookingId)

  const checkInDate = formatThaiDate(stay.check_in)
  const checkOutDate = formatThaiDate(stay.check_out)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ยืนยันการยกเลิก</AlertDialogTitle>
          <AlertDialogDescription>
            ต้องการยกเลิกห้อง {stay.room_type_name} ({checkInDate} – {checkOutDate}) ใช่หรือไม่?
            การยกเลิกไม่สามารถเลิกทำได้
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancel.isPending}>ไม่ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              cancel.mutate(stay.id, {
                onSuccess: () => {
                  onOpenChange(false)
                  toast.success('ยกเลิกรายการสำเร็จ')
                },
                onError: (err) => {
                  toast.error(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
                },
              })
            }}
          >
            ยืนยันยกเลิก
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
