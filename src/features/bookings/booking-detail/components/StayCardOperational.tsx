import { useState, useMemo } from 'react'
import { differenceInDays, isBefore, startOfDay, parseISO } from 'date-fns'
import { CheckCircle2, X, Loader2, CalendarClock, ArrowRightLeft, LogOut, Timer } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, fmtShortISO, todayISO } from '@/shared/utils'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Input } from '@/shared/ui/input'
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/shared/ui/sheet'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { formatThaiDate, formatTHB } from '@/shared/utils'
import { useCancelStay, useExtendStay, useCheckoutRooms, useAvailabilityGrouped, useTransferRoom } from '../../hooks'
import { EarlyCheckoutDialog } from './EarlyCheckoutDialog'
import {
  stayStatusVariant,
  mapRoomGroups,
  addDaysToISO,
  calcNights,
  isCheckInToday,
  isCheckInOverdue,
} from '../utils/bookingStatusHelpers'
import type { RoomStayResponse, BookingResponse, ExtendStayConflictData } from '../../types'
import { getStatusLabel } from '../../types'

export function StayCardOperational({
  bookingId,
  stay,
  booking,
}: {
  bookingId: string
  stay: RoomStayResponse
  booking?: BookingResponse
}) {
  const [cancelOpen, setCancelOpen]       = useState(false)
  const [extendOpen, setExtendOpen]       = useState(false)
  const [checkoutOpen, setCheckoutOpen]   = useState(false)
  const [transferOpen, setTransferOpen]   = useState(false)
  const [transferDate, setTransferDate]  = useState(todayISO)
  const [returnDate, setReturnDate]      = useState('')
  const [earlyCheckoutOpen, setEarlyCheckoutOpen] = useState(false)
  const [newCheckOut, setNewCheckOut]     = useState('')
  const [conflictData, setConflictData]   = useState<ExtendStayConflictData | null>(null)
  const [selectedTransferRoomId, setSelectedTransferRoomId] = useState<string | null>(null)

  const isMobile = useIsMobile()
  const cancel   = useCancelStay(bookingId)
  const extend   = useExtendStay(bookingId)
  const checkout = useCheckoutRooms(bookingId)
  const transfer = useTransferRoom(bookingId)

  // Fetch available rooms for transfer
  const transferAvailFrom = stay.status === 'CHECKED_IN' ? transferDate : stay.check_in.slice(0, 10)
  const transferAvailTo   = returnDate || stay.check_out.slice(0, 10)
  const transferQuery = useAvailabilityGrouped(
    transferAvailFrom,
    transferAvailTo,
    transferOpen,
  )
  const transferRoomGroups = useMemo(() => {
    if (!transferQuery.data) return []
    return mapRoomGroups(transferQuery.data, stay.room_type_id, stay.room_id)
  }, [transferQuery.data, stay.room_type_id, stay.room_id])

  const nights       = calcNights(stay.check_in, stay.check_out)
  const checkInDate  = formatThaiDate(stay.check_in)
  const checkOutDate = formatThaiDate(stay.check_out)

  const isActive         = stay.status === 'RESERVED' || stay.status === 'ASSIGNED'
  const isCheckedIn      = stay.status === 'CHECKED_IN'
  const canExtend        = isActive || isCheckedIn
  const canTransfer      = (isCheckedIn || stay.status === 'ASSIGNED') && Boolean(stay.room_id)
  const canEarlyCheckout = isCheckedIn && isBefore(startOfDay(new Date()), startOfDay(parseISO(stay.check_out)))
  const showTodayBadge   = isActive && isCheckInToday(stay.check_in)
  const showOverdueBadge = isActive && isCheckInOverdue(stay.check_in)

  // Conflict room groups for extend-with-transfer
  const conflictRoomGroups = useMemo(() => {
    if (!conflictData) return []
    return mapRoomGroups(conflictData, stay.room_type_id)
  }, [conflictData, stay.room_type_id])

  const currentCheckOutISO = stay.check_out.slice(0, 10)

  return (
    <Card className={cn(showOverdueBadge && 'border-destructive/40')}>
      <CardContent className="px-4 py-3 space-y-3">

        {/* ── Header row ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {stay.room_number && (
              <span className="text-room-number">{stay.room_number}</span>
            )}
            <div>
              <p className="text-body font-medium">{stay.room_type_name}</p>
              <p className={cn(
                'text-helper',
                showOverdueBadge ? 'text-destructive' : '',
              )}>
                {fmtShortISO(stay.check_in)} → {fmtShortISO(stay.check_out)} · {nights} คืน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
            {showOverdueBadge && <Badge variant="red">เกินกำหนด</Badge>}
            {showTodayBadge && !showOverdueBadge && <Badge variant="amber">วันนี้</Badge>}
            <Badge variant={stayStatusVariant(stay.status)}>
              {getStatusLabel(stay.status)}
            </Badge>
          </div>
        </div>

        {/* ── Transfer origin indicator ────────────────────────────────────── */}
        {stay.transfer_from_stay_id && (
          <p className="text-micro text-info flex items-center gap-1">
            <ArrowRightLeft className="w-3 h-3" />
            ย้ายมาจากห้องอื่น
          </p>
        )}

        {/* ── Early checkout indicator ──────────────────────────────────── */}
        {stay.status === 'CHECKED_OUT' && stay.checked_out_at && (() => {
          const actualCheckOut = stay.checked_out_at!.slice(0, 10)
          const originalCheckOut = stay.check_out.slice(0, 10)
          if (actualCheckOut >= originalCheckOut) return null
          const origNights = calcNights(stay.check_in, originalCheckOut)
          const actualNights = calcNights(stay.check_in, actualCheckOut)
          return (
            <div className="rounded-lg border border-success/30 bg-success/5 p-2.5">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-success mt-0.5" />
                <div className="min-w-0">
                  <p className="text-micro font-semibold text-success">
                    เช็คเอาท์ก่อนกำหนด
                  </p>
                  <p className="text-micro text-muted-foreground mt-0.5">
                    <span className="line-through">{formatThaiDate(originalCheckOut)}</span>
                    {' → '}
                    <span className="font-semibold text-foreground">{formatThaiDate(actualCheckOut)}</span>
                    {' '}(ลดจาก {origNights} เหลือ {actualNights} คืน)
                  </p>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── Action buttons ──────────────────────────────────────────────── */}
        {(isActive || canExtend) && (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {isCheckedIn && (
              <Button
                variant="default"
                size="sm"
                disabled={checkout.isPending}
                onClick={() => canEarlyCheckout ? setEarlyCheckoutOpen(true) : setCheckoutOpen(true)}
              >
                {checkout.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4 mr-1.5" />
                )}
                เช็คเอาท์
              </Button>
            )}
            {canTransfer && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setTransferDate(todayISO()); setReturnDate(''); setTransferOpen(true) }}
              >
                <ArrowRightLeft className="w-4 h-4 mr-1.5" />
                ย้ายห้อง
              </Button>
            )}
            {canExtend && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => { setNewCheckOut(''); setExtendOpen(true) }}
              >
                <CalendarClock className="w-4 h-4 mr-1.5" />
                ขยายเวลา
              </Button>
            )}
            {isActive && (
              <Button
                variant="ghost"
                size="sm"
                disabled={cancel.isPending}
                className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                onClick={() => setCancelOpen(true)}
              >
                {cancel.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <X className="w-4 h-4 mr-1.5" />
                )}
                ยกเลิก
              </Button>
            )}
          </div>
        )}

      </CardContent>

      {/* ── Cancel confirmation ─────────────────────────────────────────────── */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
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
                    setCancelOpen(false)
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

      {/* ── Extend stay — 2-step: pick date → pick room if conflict ──── */}
      {(() => {
        const hasConflict = conflictData !== null
        const canConfirmDate = Boolean(newCheckOut && newCheckOut > currentCheckOutISO && !extend.isPending)
        const canConfirmTransfer = hasConflict && Boolean(selectedTransferRoomId) && !extend.isPending

        const handleExtendSubmitDate = () => {
          if (!canConfirmDate) return
          extend.mutate(
            { stayId: stay.id, payload: { new_check_out: newCheckOut } },
            {
              onSuccess: (result) => {
                if (result.type === 'success') {
                  setExtendOpen(false)
                  setConflictData(null)
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

        const handleExtendWithTransfer = () => {
          if (!canConfirmTransfer || !selectedTransferRoomId) return
          extend.mutate(
            { stayId: stay.id, payload: { new_check_out: newCheckOut, transfer_room_id: selectedTransferRoomId } },
            {
              onSuccess: (result) => {
                if (result.type === 'success') {
                  setExtendOpen(false)
                  setConflictData(null)
                  setSelectedTransferRoomId(null)
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

        const handleExtendClose = (open: boolean) => {
          if (!open) { setConflictData(null); setSelectedTransferRoomId(null) }
          setExtendOpen(open)
        }

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

        const extendActions = hasConflict ? (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={extend.isPending} onClick={() => handleExtendClose(false)}>
              ยกเลิก
            </Button>
            <Button className="flex-1" disabled={!canConfirmTransfer} onClick={handleExtendWithTransfer}>
              {extend.isPending ? 'กำลังบันทึก…' : 'ยืนยันย้ายห้อง'}
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={extend.isPending} onClick={() => setExtendOpen(false)}>
              ยกเลิก
            </Button>
            <Button className="flex-1" disabled={!canConfirmDate} onClick={handleExtendSubmitDate}>
              {extend.isPending ? 'กำลังตรวจสอบ…' : 'ยืนยัน'}
            </Button>
          </div>
        )

        return isMobile ? (
          <Sheet open={extendOpen} onOpenChange={handleExtendClose}>
            <SheetContent side="bottom" className="rounded-t-2xl px-5 pt-5 pb-6 sheet-mobile flex flex-col">
              <SheetHeader className="pb-3 text-left shrink-0">
                <SheetTitle>{hasConflict ? 'เลือกห้องสำหรับช่วงที่เหลือ' : 'ขยายวันเช็คเอาท์'}</SheetTitle>
                <SheetDescription className="sr-only">เลือกวันเช็คเอาท์ใหม่</SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto">{extendBody}</div>
              <div className="pt-4 shrink-0">{extendActions}</div>
            </SheetContent>
          </Sheet>
        ) : (
          <AlertDialog open={extendOpen} onOpenChange={handleExtendClose}>
            <AlertDialogContent className={cn(hasConflict && 'max-h-[80vh] flex flex-col')}>
              <AlertDialogHeader>
                <AlertDialogTitle>{hasConflict ? 'เลือกห้องสำหรับช่วงที่เหลือ' : 'ขยายวันเช็คเอาท์'}</AlertDialogTitle>
                <AlertDialogDescription className="sr-only">เลือกวันเช็คเอาท์ใหม่</AlertDialogDescription>
              </AlertDialogHeader>
              <div className={cn(hasConflict && 'flex-1 overflow-y-auto')}>{extendBody}</div>
              <div className="flex justify-end gap-2 pt-2">
                {hasConflict ? (
                  <>
                    <Button variant="outline" disabled={extend.isPending} onClick={() => handleExtendClose(false)}>
                      ยกเลิก
                    </Button>
                    <Button disabled={!canConfirmTransfer} onClick={handleExtendWithTransfer}>
                      {extend.isPending ? 'กำลังบันทึก…' : 'ยืนยันย้ายห้อง'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" disabled={extend.isPending} onClick={() => handleExtendClose(false)}>
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
      })()}

      {/* ── Checkout confirmation ─────────────────────────────────────────── */}
      <AlertDialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
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
                    setCheckoutOpen(false)
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

      {/* ── Early checkout confirmation ─────────────────────────────────────── */}
      <EarlyCheckoutDialog
        open={earlyCheckoutOpen}
        onOpenChange={setEarlyCheckoutOpen}
        bookingId={bookingId}
        stay={stay}
        booking={booking}
      />

      {/* ── Transfer room ─────────────────────────────────────────────────── */}
      {(() => {
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
                                    setTransferOpen(false)
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

        return isMobile ? (
          <Sheet open={transferOpen} onOpenChange={setTransferOpen}>
            <SheetContent side="bottom" className="rounded-t-2xl px-5 pt-5 pb-6 sheet-mobile flex flex-col">
              <SheetHeader className="pb-3 text-left shrink-0">
                <SheetTitle>ย้ายห้อง</SheetTitle>
                <SheetDescription className="text-body text-muted-foreground">{transferDesc}</SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto">{transferBody}</div>
              <div className="pt-4 shrink-0">
                <Button variant="outline" className="w-full" disabled={transfer.isPending} onClick={() => setTransferOpen(false)}>
                  ยกเลิก
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <AlertDialog open={transferOpen} onOpenChange={setTransferOpen}>
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
      })()}
    </Card>
  )
}
