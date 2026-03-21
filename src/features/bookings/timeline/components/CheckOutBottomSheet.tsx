import React, { useState, useMemo, useCallback } from 'react'
import { Loader2, CheckCircle2, LogOut, Phone, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/shared/ui/sheet'
import { Button } from '@/shared/ui/button'
import { ConfirmActionCard } from '@/shared/ui/confirm-action-card'
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
import { useBooking, useCheckoutRooms } from '../../hooks'
import type { RoomStayResponse } from '../../types'
import { cn, fmtShortISO, formatTHBCurrency, formatCompactNumber } from '@/shared/utils'
import { useNavigate } from 'react-router-dom'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CheckOutBottomSheetProps {
  bookingId: string | null
  onClose: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

const CheckOutBottomSheet = React.memo(function CheckOutBottomSheet({
  bookingId,
  onClose,
}: CheckOutBottomSheetProps) {
  const navigate = useNavigate()
  const isOpen = bookingId !== null
  const safeId = bookingId ?? ''

  const { data: booking, isLoading } = useBooking(safeId)
  const checkoutMutation = useCheckoutRooms(safeId)
  const [busyStayId, setBusyStayId] = useState<string | null>(null)
  const [checkingOutAll, setCheckingOutAll] = useState(false)
  const [confirmCheckOutAll, setConfirmCheckOutAll] = useState(false)

  // ── Categorize stays ────────────────────────────────────────────────────
  const { pendingStays, doneStays, totalActive } = useMemo(() => {
    if (!booking) return { pendingStays: [] as RoomStayResponse[], doneStays: [] as RoomStayResponse[], totalActive: 0 }

    const active = booking.room_stays.filter((s) => s.status !== 'CANCELLED')
    // Only show stays that are checked-in (pending checkout) or checked-out (done)
    const pending = active.filter((s) => s.status === 'CHECKED_IN')
    const done = active.filter((s) => s.status === 'CHECKED_OUT')

    return { pendingStays: pending, doneStays: done, totalActive: active.length }
  }, [booking])

  const progressPct = totalActive > 0 ? (doneStays.length / totalActive) * 100 : 0

  // ── Date logic ────────────────────────────────────────────────────────────
  const firstStay = booking?.room_stays?.find((s) => s.status !== 'CANCELLED')
  const ciDate = firstStay?.check_in?.slice(0, 10) ?? ''
  const coDate = firstStay?.check_out?.slice(0, 10) ?? ''
  const nights = ciDate && coDate
    ? Math.round((new Date(coDate).getTime() - new Date(ciDate).getTime()) / 86400000)
    : 0

  // ── Balance ────────────────────────────────────────────────────────────────
  const balance = booking ? booking.balance_amount : 0
  const hasBalance = balance > 0

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleCheckOutOne = useCallback(async (stayId: string) => {
    setBusyStayId(stayId)
    try {
      await checkoutMutation.mutateAsync([stayId])
      toast.success('เช็คเอาท์สำเร็จ')
    } catch (err) {
      toast.error((err as Error).message || 'เกิดข้อผิดพลาด')
    } finally {
      setBusyStayId(null)
    }
  }, [checkoutMutation])

  const handleCheckOutAll = useCallback(async () => {
    if (pendingStays.length === 0) return
    setCheckingOutAll(true)
    try {
      const stayIds = pendingStays.map((s) => s.id)
      await checkoutMutation.mutateAsync(stayIds)
      toast.success('เช็คเอาท์ทั้งหมดสำเร็จ')
    } catch (err) {
      toast.error((err as Error).message || 'เกิดข้อผิดพลาด')
    } finally {
      setCheckingOutAll(false)
    }
  }, [pendingStays, checkoutMutation])

  const isBusy = checkoutMutation.isPending

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-0 flex flex-col sheet-mobile">
        {/* ═══════ Header ═══════ */}
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <SheetTitle className="text-base font-semibold tracking-tight text-left">
            {booking?.guest_name ?? '...'}
          </SheetTitle>
          <SheetDescription asChild>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-body text-muted-foreground">
                {ciDate && coDate && (
                  <span>{fmtShortISO(ciDate)} → {fmtShortISO(coDate)} ({nights} คืน)</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {booking?.guest_phone && (
                  <a
                    href={`tel:${booking.guest_phone}`}
                    className="flex items-center gap-1.5 text-body text-primary active:opacity-70"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {booking.guest_phone}
                  </a>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 h-auto p-0 text-body text-muted-foreground hover:text-foreground"
                  onClick={() => { onClose(); navigate(`/bookings/${safeId}`) }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  รายละเอียด
                </Button>
              </div>
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 pt-0 pb-8 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* ═══════════════════════════════════════════════════════
                  Progress + checkout all
                  ═══════════════════════════════════════════════════════ */}
              <div className="space-y-2">
                {/* Row 1: Progress bar + count */}
                <div className="flex items-center gap-2.5">
                  <div className="flex-1 h-1.5 radius-badge bg-muted overflow-hidden">
                    <div
                      className="h-full radius-badge bg-success transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="text-helper tabular-nums shrink-0">
                    {doneStays.length}/{totalActive}
                  </span>
                </div>

                {/* Row 2: Balance + checkout all */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {hasBalance ? (
                      <span className="text-xs font-medium text-destructive">ค้าง {formatTHBCurrency(balance)}</span>
                    ) : (
                      <span className="text-xs font-medium text-success">ชำระครบแล้ว</span>
                    )}
                    {booking?.deposit_status === 'COLLECTED' && (booking?.key_deposit_amount ?? 0) > 0 && (
                      <span className="text-xs font-medium text-amber-500">คืนประกัน {formatCompactNumber(booking!.key_deposit_amount)}</span>
                    )}
                  </div>
                  {pendingStays.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs h-auto py-1 px-2 text-primary hover:text-primary/80 shrink-0"
                      disabled={isBusy}
                      onClick={() => setConfirmCheckOutAll(true)}
                    >
                      {checkingOutAll ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <LogOut size={12} />
                      )}
                      เช็คเอาท์ทั้งหมด
                    </Button>
                  )}
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════
                  Pending stays — tappable row for checkout
                  ═══════════════════════════════════════════════════════ */}
              {pendingStays.length > 0 && (
                <div className="space-y-1.5">
                  {pendingStays.map((stay) => (
                    <ConfirmActionCard
                      key={stay.id}
                      disabled={isBusy}
                      loading={busyStayId === stay.id && checkoutMutation.isPending}
                      loader={<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                      icon={<LogOut className="w-4 h-4 text-warning" />}
                      confirmTitle="ยืนยันเช็คเอาท์"
                      confirmDescription={`เช็คเอาท์ ${booking?.guest_name} ห้อง ${stay.room_number} ?`}
                      confirmLabel="เช็คเอาท์"
                      onConfirm={() => handleCheckOutOne(stay.id)}
                      className="flex-1"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-body font-bold tabular-nums">ห้อง {stay.room_number}</span>
                        <span className="text-helper">{stay.room_type_name}</span>
                      </div>
                    </ConfirmActionCard>
                  ))}
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════
                  Done stays — checked out
                  ═══════════════════════════════════════════════════════ */}
              {doneStays.length > 0 && (
                <div className="space-y-1.5">
                  {doneStays.map((stay) => (
                    <div
                      key={stay.id}
                      className={cn(
                        'flex items-center justify-between radius-card border px-3 py-2.5',
                        'border-success/20 bg-success/5 opacity-75',
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                        <span className="text-body font-bold tabular-nums">ห้อง {stay.room_number}</span>
                        <span className="text-helper text-success/80">เช็คเอาท์แล้ว</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* All done */}
              {pendingStays.length === 0 && doneStays.length > 0 && (
                <div className="text-center py-6">
                  <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="text-body text-muted-foreground">เช็คเอาท์ครบทุกห้องแล้ว</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Batch checkout confirmation */}
        <AlertDialog open={confirmCheckOutAll} onOpenChange={(open) => !open && setConfirmCheckOutAll(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ยืนยันเช็คเอาท์ทั้งหมด</AlertDialogTitle>
              <AlertDialogDescription>
                เช็คเอาท์ {booking?.guest_name} ทั้งหมด {pendingStays.length} ห้อง ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                handleCheckOutAll()
                setConfirmCheckOutAll(false)
              }}>
                เช็คเอาท์ทั้งหมด
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  )
})

export default CheckOutBottomSheet
