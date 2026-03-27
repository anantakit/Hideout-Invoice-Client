import { Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog'

export function DeleteReceiptDialog({
  invoiceNumber,
  onConfirm,
  isPending,
}: {
  invoiceNumber: string
  onConfirm: () => void
  isPending?: boolean
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-150"
          aria-label="ลบ"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ลบใบเสร็จ?</AlertDialogTitle>
          <AlertDialogDescription>
            ลบใบเสร็จ {invoiceNumber}? การกระทำนี้ไม่สามารถย้อนกลับได้
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={onConfirm}>{isPending ? 'กำลังลบ…' : 'ลบ'}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
