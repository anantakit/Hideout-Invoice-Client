import { differenceInDays, parseISO, format, addDays } from 'date-fns'
import { Loader2, Timer, CheckCircle2 } from 'lucide-react'
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
import { formatThaiDate, formatTHB } from '@/shared/utils'
import { useEarlyCheckout } from '../hooks'
import type { RoomStayResponse, BookingResponse } from '../types'

interface EarlyCheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  stay: RoomStayResponse
  booking?: BookingResponse
}

export function EarlyCheckoutDialog({ open, onOpenChange, bookingId, stay, booking }: EarlyCheckoutDialogProps) {
  const earlyCheckout = useEarlyCheckout(bookingId)
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  // Night calculations
  const originalNights = differenceInDays(parseISO(stay.check_out), parseISO(stay.check_in))
  const usedNights = differenceInDays(parseISO(tomorrowStr), parseISO(stay.check_in))
  const savedNights = originalNights - usedNights

  // Pricing — estimate from booking total if available
  const hasMultipleStays = booking && booking.room_stays.filter(s => s.status !== 'CANCELLED').length > 1
  const pricePerNight = originalNights > 0 && booking && !hasMultipleStays
    ? (booking.total_amount - booking.discount_amount) / originalNights
    : null
  const newTotal = pricePerNight !== null ? pricePerNight * usedNights : null
  const priceSaved = pricePerNight !== null && booking ? (booking.total_amount - booking.discount_amount) - newTotal! : null

  const handleConfirm = () => {
    earlyCheckout.mutate(
      { stayId: stay.id, payload: { checkout_date: tomorrowStr } },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast.success('เช็คเอาท์ก่อนกำหนดสำเร็จ')
        },
        onError: (err) => {
          toast.error((err as Error).message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
        },
      },
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5" />
            เช็คเอาท์ก่อนกำหนด
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                ห้อง {stay.room_number ?? stay.room_type_name} จะถูกเช็คเอาท์พรุ่งนี้แทนวันที่กำหนดเดิม
              </p>

              {/* Summary card */}
              <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2 text-body">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">เช็คอิน</span>
                  <span>{formatThaiDate(stay.check_in)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">เช็คเอาท์เดิม</span>
                  <span className="line-through text-muted-foreground">{formatThaiDate(stay.check_out)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">เช็คเอาท์ใหม่</span>
                  <span className="font-semibold text-primary">{formatThaiDate(tomorrowStr)} (พรุ่งนี้)</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">จำนวนคืนเดิม</span>
                  <span>{originalNights} คืน</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">พักจริง</span>
                  <span className="font-semibold">{usedNights} คืน</span>
                </div>
                {savedNights > 0 && (
                  <div className="flex justify-between text-success">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      ลดลง
                    </span>
                    <span className="font-semibold">{savedNights} คืน</span>
                  </div>
                )}

                {/* Pricing section */}
                {pricePerNight !== null && newTotal !== null && priceSaved !== null && priceSaved > 0 && (
                  <>
                    <div className="h-px bg-border" />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ยอดรวมเดิม</span>
                      <span>{formatTHB(booking!.total_amount - booking!.discount_amount)}</span>
                    </div>
                    <div className="flex justify-between text-destructive">
                      <span>ลด</span>
                      <span>-{formatTHB(priceSaved)}</span>
                    </div>
                    <div className="flex justify-between text-primary font-semibold">
                      <span>ยอดรวมใหม่ (ประมาณ)</span>
                      <span>{formatTHB(newTotal)}</span>
                    </div>
                  </>
                )}
              </div>

              <p className="text-helper text-muted-foreground">
                ยอดรวมจะถูกคำนวณใหม่ตามจำนวนคืนที่พักจริง ห้องจะว่างพร้อมรับแขกใหม่ตั้งแต่พรุ่งนี้
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={earlyCheckout.isPending}>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            disabled={earlyCheckout.isPending}
            onClick={handleConfirm}
          >
            {earlyCheckout.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                กำลังดำเนินการ…
              </>
            ) : (
              'ยืนยันเช็คเอาท์ก่อนกำหนด'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
