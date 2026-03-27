import { useState, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, todayISO } from '@/shared/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/shared/ui/alert-dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/shared/ui/sheet'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { formatTHB } from '@/shared/utils'
import { useAvailabilityGrouped, useTransferRoom } from '../../hooks'
import { mapRoomGroups, addDaysToISO } from '../../shared/utils/bookingStatusHelpers'
import type { RoomStayResponse } from '../../types'

interface TransferRoomSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  stay: RoomStayResponse
}

export function TransferRoomSheet({ open, onOpenChange, bookingId, stay }: TransferRoomSheetProps) {
  const [transferDate, setTransferDate] = useState(todayISO)
  const [returnDate, setReturnDate] = useState('')

  const isMobile = useIsMobile()
  const transfer = useTransferRoom(bookingId)
  const isCheckedIn = stay.status === 'CHECKED_IN'

  const transferAvailFrom = isCheckedIn ? transferDate : stay.check_in.slice(0, 10)
  const transferAvailTo = returnDate || stay.check_out.slice(0, 10)
  const transferQuery = useAvailabilityGrouped(
    transferAvailFrom,
    transferAvailTo,
    open,
  )
  const transferRoomGroups = useMemo(() => {
    if (!transferQuery.data) return []
    return mapRoomGroups(transferQuery.data, stay.room_type_id, stay.room_id)
  }, [transferQuery.data, stay.room_type_id, stay.room_id])

  function handleOpen(nextOpen: boolean) {
    if (nextOpen) { setTransferDate(todayISO()); setReturnDate('') }
    onOpenChange(nextOpen)
  }

  const transferDesc = isCheckedIn
    ? `ย้ายจากห้อง ${stay.room_number} (${stay.room_type_name}) — ระบบจะเช็คเอาท์ห้องเดิมอัตโนมัติ`
    : `เปลี่ยนจากห้อง ${stay.room_number} (${stay.room_type_name})`

  const transferBody = (
    <div className="space-y-4">
      {isCheckedIn && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1.5">วันที่ย้ายห้อง</label>
            <Input
              type="date"
              min={todayISO()}
              max={addDaysToISO(stay.check_out, -1)}
              value={transferDate}
              onChange={(e) => { setTransferDate(e.target.value); setReturnDate('') }}
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5">
              วันที่กลับห้องเดิม <span className="font-normal text-muted-foreground">(ไม่บังคับ)</span>
            </label>
            <Input
              type="date"
              min={transferDate ? addDaysToISO(transferDate, 1) : ''}
              max={addDaysToISO(stay.check_out, -1)}
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
            />
            <p className="text-micro-sm text-muted-foreground mt-1">
              {returnDate
                ? `ย้ายชั่วคราว: ห้องใหม่ ${transferDate} → ${returnDate} แล้วกลับห้อง ${stay.room_number}`
                : 'ระบุเพื่อย้ายชั่วคราวแล้วกลับห้องเดิมอัตโนมัติ'}
            </p>
          </div>
        </div>
      )}
      {transferQuery.isLoading ? (
        <div className="flex items-center gap-2 py-4 justify-center text-helper">
          <Loader2 className="w-4 h-4 animate-spin" />
          กำลังโหลด...
        </div>
      ) : transferRoomGroups.length === 0 ? (
        <p className="text-helper py-4 text-center">ไม่มีห้องว่าง</p>
      ) : (
        transferRoomGroups
          .slice().sort((a, b) => (a.isSameType ? -1 : b.isSameType ? 1 : 0))
          .map((group) => {
            const sameTypePrice = transferRoomGroups.find((g) => g.isSameType)?.pricePerNight ?? 0
            const diff = group.pricePerNight - sameTypePrice
            return (
              <div key={group.typeId}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <p className="text-label text-foreground">
                    {group.typeName}
                    {group.isSameType && (
                      <span className="text-helper font-normal ml-1">(ประเภทเดียวกัน)</span>
                    )}
                  </p>
                  {!group.isSameType && (
                    <span className={cn(
                      'text-micro font-medium',
                      diff > 0 ? 'text-warning' : diff < 0 ? 'text-success' : 'text-muted-foreground',
                    )}>
                      {formatTHB(group.pricePerNight)}/คืน
                      {diff !== 0 && ` (${diff > 0 ? '+' : ''}${formatTHB(diff)})`}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {group.rooms.map((room) => (
                    <Button
                      key={room.room_id}
                      variant={group.isSameType ? 'outline' : 'ghost'}
                      size="sm"
                      disabled={transfer.isPending}
                      className={cn(!group.isSameType && 'border border-border-soft')}
                      onClick={() => {
                        transfer.mutate(
                          { stayId: stay.id, roomId: room.room_id, transferDate: isCheckedIn ? transferDate : undefined, returnDate: isCheckedIn && returnDate ? returnDate : undefined },
                          {
                            onSuccess: () => {
                              onOpenChange(false)
                              toast.success(`ย้ายไปห้อง ${room.room_number} สำเร็จ`)
                            },
                            onError: (err) => {
                              toast.error((err as Error).message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
                            },
                          },
                        )
                      }}
                    >
                      {transfer.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        room.room_number
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            )
          })
      )}

      {transferRoomGroups.some((g) => !g.isSameType) && (
        <p className="text-micro text-muted-foreground/70 border-t border-border pt-2">
          * ราคาต่อคืนจะยังเป็นราคาเดิม สามารถแก้ไขภายหลังได้
        </p>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-5 pt-5 pb-6 sheet-mobile flex flex-col">
          <SheetHeader className="pb-3 text-left shrink-0">
            <SheetTitle>ย้ายห้อง</SheetTitle>
            <SheetDescription className="text-body text-muted-foreground">{transferDesc}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">{transferBody}</div>
          <div className="pt-4 shrink-0">
            <Button variant="outline" className="w-full" disabled={transfer.isPending} onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpen}>
      <AlertDialogContent className="max-h-[80vh] flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle>ย้ายห้อง</AlertDialogTitle>
          <AlertDialogDescription>{transferDesc}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex-1 overflow-y-auto">{transferBody}</div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={transfer.isPending}>ยกเลิก</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
