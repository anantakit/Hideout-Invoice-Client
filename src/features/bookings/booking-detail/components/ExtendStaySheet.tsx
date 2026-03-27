import { useState, useMemo } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import { Timer } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/shared/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/shared/ui/alert-dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/shared/ui/sheet'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { formatThaiDate, formatTHB } from '@/shared/utils'
import { useExtendStay } from '../../hooks'
import {
  mapRoomGroups,
  addDaysToISO,
  calcNights,
} from '../utils/bookingStatusHelpers'
import type { RoomStayResponse, ExtendStayConflictData } from '../../types'

interface ExtendStaySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  stay: RoomStayResponse
}

export function ExtendStaySheet({ open, onOpenChange, bookingId, stay }: ExtendStaySheetProps) {
  const [newCheckOut, setNewCheckOut] = useState('')
  const [conflictData, setConflictData] = useState<ExtendStayConflictData | null>(null)
  const [selectedTransferRoomId, setSelectedTransferRoomId] = useState<string | null>(null)

  const isMobile = useIsMobile()
  const extend = useExtendStay(bookingId)

  const nights = calcNights(stay.check_in, stay.check_out)
  const checkOutDate = formatThaiDate(stay.check_out)
  const currentCheckOutISO = stay.check_out.slice(0, 10)

  const conflictRoomGroups = useMemo(() => {
    if (!conflictData) return []
    return mapRoomGroups(conflictData, stay.room_type_id)
  }, [conflictData, stay.room_type_id])

  const hasConflict = conflictData !== null
  const canConfirmDate = Boolean(newCheckOut && newCheckOut > currentCheckOutISO && !extend.isPending)
  const canConfirmTransfer = hasConflict && Boolean(selectedTransferRoomId) && !extend.isPending

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) { setConflictData(null); setSelectedTransferRoomId(null); setNewCheckOut('') }
    onOpenChange(nextOpen)
  }

  function handleExtendSubmitDate() {
    if (!canConfirmDate) return
    extend.mutate(
      { stayId: stay.id, payload: { new_check_out: newCheckOut } },
      {
        onSuccess: (result) => {
          if (result.type === 'success') {
            handleClose(false)
            toast.success('ขยายวันเช็คเอาท์สำเร็จ')
          } else {
            setConflictData(result.conflict)
            setSelectedTransferRoomId(null)
          }
        },
        onError: (err) => { toast.error((err as Error).message || 'เกิดข้อผิดพลาด กรุณาลองใหม่') },
      },
    )
  }

  function handleExtendWithTransfer() {
    if (!canConfirmTransfer || !selectedTransferRoomId) return
    extend.mutate(
      { stayId: stay.id, payload: { new_check_out: newCheckOut, transfer_room_id: selectedTransferRoomId } },
      {
        onSuccess: (result) => {
          if (result.type === 'success') {
            handleClose(false)
            toast.success('ขยายเวลาและย้ายห้องสำเร็จ')
          } else {
            toast.error('ห้องที่เลือกไม่ว่างแล้ว กรุณาเลือกห้องอื่น')
            setConflictData(result.conflict)
            setSelectedTransferRoomId(null)
          }
        },
        onError: (err) => { toast.error((err as Error).message || 'เกิดข้อผิดพลาด กรุณาลองใหม่') },
      },
    )
  }

  // ── Date picker section ──────────────────────────────────────────────
  const datePickerBody = (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-body text-muted-foreground">
          เช็คอิน: {formatThaiDate(stay.check_in)} → เช็คเอาท์: {checkOutDate}
        </p>
        <p className="text-helper">({nights} คืน)</p>
      </div>
      <div>
        <label className="text-caption block mb-1.5">เพิ่มจำนวนคืน</label>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 5, 7].map((n) => {
            const target = addDaysToISO(currentCheckOutISO, n)
            const isSelected = newCheckOut === target
            return (
              <Button
                key={n}
                type="button"
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                className="tabular-nums"
                onClick={() => { setNewCheckOut(target); setConflictData(null); setSelectedTransferRoomId(null) }}
              >
                +{n}
              </Button>
            )
          })}
        </div>
      </div>
      <div>
        <label className="text-caption block mb-1.5">หรือเลือกวันที่</label>
        <Input
          type="date"
          min={currentCheckOutISO}
          value={newCheckOut}
          onChange={(e) => { setNewCheckOut(e.target.value); setConflictData(null); setSelectedTransferRoomId(null) }}
        />
      </div>
      {newCheckOut && newCheckOut > currentCheckOutISO && !hasConflict && (() => {
        const extraNights = differenceInDays(parseISO(newCheckOut), parseISO(currentCheckOutISO))
        const totalNights = nights + extraNights
        return (
          <div className="radius-card border border-border bg-card space-card">
            <p className="text-body">
              เช็คเอาท์ใหม่: <span className="font-semibold">{formatThaiDate(newCheckOut)}</span>
            </p>
            <p className="text-helper mt-0.5">
              เพิ่ม {extraNights} คืน → รวม {totalNights} คืน
            </p>
          </div>
        )
      })()}
    </div>
  )

  // ── Conflict room picker section ─────────────────────────────────────
  const conflictBody = hasConflict && (
    <div className="space-y-3">
      <div className="radius-card border border-warning/30 bg-warning/5 space-card">
        <p className="text-body font-medium text-warning">
          <Timer className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          ห้อง {stay.room_number} ว่างถึง {formatThaiDate(conflictData.available_until)} เท่านั้น
        </p>
        <p className="text-helper mt-1">
          เลือกห้องสำหรับช่วง {formatThaiDate(conflictData.available_until)} → {formatThaiDate(newCheckOut)}
        </p>
      </div>

      {conflictRoomGroups.length === 0 ? (
        <p className="text-helper py-4 text-center">ไม่มีห้องว่างในช่วงเวลาที่ต้องการ</p>
      ) : (
        conflictRoomGroups
          .slice().sort((a, b) => (a.isSameType ? -1 : b.isSameType ? 1 : 0))
          .map((group) => {
            const sameTypePrice = conflictRoomGroups.find((g) => g.isSameType)?.pricePerNight ?? 0
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
                      variant={selectedTransferRoomId === room.room_id ? 'default' : 'outline'}
                      size="sm"
                      disabled={extend.isPending}
                      onClick={() => setSelectedTransferRoomId(room.room_id)}
                    >
                      {room.room_number}
                    </Button>
                  ))}
                </div>
              </div>
            )
          })
      )}
    </div>
  )

  const extendBody = (
    <div className="space-y-4">
      {datePickerBody}
      {conflictBody}
    </div>
  )

  // ── Mobile: bottom sheet ─────────────────────────────────────────────
  const mobileActions = hasConflict ? (
    <div className="flex gap-2">
      <Button variant="outline" className="flex-1" disabled={extend.isPending} onClick={() => handleClose(false)}>
        ยกเลิก
      </Button>
      <Button className="flex-1" disabled={!canConfirmTransfer} onClick={handleExtendWithTransfer}>
        {extend.isPending ? 'กำลังบันทึก…' : 'ยืนยันย้ายห้อง'}
      </Button>
    </div>
  ) : (
    <div className="flex gap-2">
      <Button variant="outline" className="flex-1" disabled={extend.isPending} onClick={() => handleClose(false)}>
        ยกเลิก
      </Button>
      <Button className="flex-1" disabled={!canConfirmDate} onClick={handleExtendSubmitDate}>
        {extend.isPending ? 'กำลังตรวจสอบ…' : 'ยืนยัน'}
      </Button>
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="bottom" className="rounded-t-2xl px-5 pt-5 pb-6 sheet-mobile flex flex-col">
          <SheetHeader className="pb-3 text-left shrink-0">
            <SheetTitle>{hasConflict ? 'เลือกห้องสำหรับช่วงที่เหลือ' : 'ขยายวันเช็คเอาท์'}</SheetTitle>
            <SheetDescription className="sr-only">เลือกวันเช็คเอาท์ใหม่</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">{extendBody}</div>
          <div className="pt-4 shrink-0">{mobileActions}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className={cn(hasConflict && 'max-h-[80vh] flex flex-col')}>
        <AlertDialogHeader>
          <AlertDialogTitle>{hasConflict ? 'เลือกห้องสำหรับช่วงที่เหลือ' : 'ขยายวันเช็คเอาท์'}</AlertDialogTitle>
          <AlertDialogDescription className="sr-only">เลือกวันเช็คเอาท์ใหม่</AlertDialogDescription>
        </AlertDialogHeader>
        <div className={cn(hasConflict && 'flex-1 overflow-y-auto')}>{extendBody}</div>
        <div className="flex justify-end gap-2 pt-2">
          {hasConflict ? (
            <>
              <Button variant="outline" disabled={extend.isPending} onClick={() => handleClose(false)}>
                ยกเลิก
              </Button>
              <Button disabled={!canConfirmTransfer} onClick={handleExtendWithTransfer}>
                {extend.isPending ? 'กำลังบันทึก…' : 'ยืนยันย้ายห้อง'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" disabled={extend.isPending} onClick={() => handleClose(false)}>
                ยกเลิก
              </Button>
              <Button disabled={!canConfirmDate} onClick={handleExtendSubmitDate}>
                {extend.isPending ? 'กำลังตรวจสอบ…' : 'ยืนยัน'}
              </Button>
            </>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
