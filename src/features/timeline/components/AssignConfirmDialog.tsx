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

// ── Props ────────────────────────────────────────────────────────────────────

export interface AssignConfirmDialogProps {
  open: boolean
  count: number
  onConfirm: () => void
  onClose: () => void
}

// ── Component ────────────────────────────────────────────────────────────────

export function AssignConfirmDialog({ open, count, onConfirm, onClose }: AssignConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ยืนยันเช็คอิน</AlertDialogTitle>
          <AlertDialogDescription>
            เช็คอินทั้งหมด {count} ห้อง ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction onClick={() => { onConfirm(); onClose() }}>
            เช็คอินทั้งหมด
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
