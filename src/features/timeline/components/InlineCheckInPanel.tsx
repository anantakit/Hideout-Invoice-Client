import { useState } from 'react'
import { LogIn, Loader2, CheckCircle2, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, fmtShortISO } from '@/shared/utils'
import { Button } from '@/shared/ui/button'
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,
  AlertDialogHeader, AlertDialogFooter, AlertDialogTitle,
  AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/shared/ui/alert-dialog'
import { ConfirmActionCard } from '@/shared/ui/confirm-action-card'
import { useAssignRooms, useCheckInRooms } from '@/features/bookings/hooks'
import { useCheckInPanelData } from '../hooks/useCheckInData'
import { UnassignedRoomPicker } from './UnassignedRoomPicker'

export function InlineCheckInPanel({ bookingId, onDone }: { bookingId: string; onDone: () => void }) {
  const {
    unassignedStays, assignedStays, checkedInStays, totalActive,
    ciDate, isCheckInDay, roomsByType, isLoading, availLoading,
  } = useCheckInPanelData(bookingId)

  const assignMutation = useAssignRooms(bookingId)
  const checkInMutation = useCheckInRooms(bookingId)
  const [busyStayId, setBusyStayId] = useState<string | null>(null)
  const [checkingInAll, setCheckingInAll] = useState(false)

  const isBusy = assignMutation.isPending || checkInMutation.isPending

  const handleAssign = async (roomTypeId: string, roomId: string, roomNumber: string) => {
    const stay = unassignedStays.find((s) => s.room_type_id === roomTypeId)
    if (!stay) return
    setBusyStayId(stay.id)
    try { await assignMutation.mutateAsync([{ room_stay_id: stay.id, room_id: roomId }]); toast.success(`กำหนดห้อง ${roomNumber} แล้ว`) }
    catch (err) { toast.error((err as Error).message || 'เกิดข้อผิดพลาด') }
    finally { setBusyStayId(null) }
  }

  const handleCheckInOne = async (stayId: string, roomId: string) => {
    setBusyStayId(stayId)
    try { await checkInMutation.mutateAsync([{ room_stay_id: stayId, room_id: roomId }]); toast.success('เช็คอินสำเร็จ'); if (assignedStays.length <= 1 && unassignedStays.length === 0) onDone() }
    catch (err) { toast.error((err as Error).message || 'เกิดข้อผิดพลาด') }
    finally { setBusyStayId(null) }
  }

  const handleCheckInAll = async () => {
    if (assignedStays.length === 0) return
    setCheckingInAll(true)
    try { await checkInMutation.mutateAsync(assignedStays.map((s) => ({ room_stay_id: s.id, room_id: s.room_id! }))); toast.success('เช็คอินทั้งหมดสำเร็จ'); if (unassignedStays.length === 0) onDone() }
    catch (err) { toast.error((err as Error).message || 'เกิดข้อผิดพลาด') }
    finally { setCheckingInAll(false) }
  }

  return (
    <div className="radius-card rounded-t-none border border-t-0 border-border bg-card space-card space-y-3">
      {isLoading ? (
        <div className="flex items-center justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {totalActive > 1 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-helper font-medium shrink-0">เช็คอิน {checkedInStays.length}/{totalActive} ห้อง</span>
                <div className="flex-1 max-w-24 h-1.5 radius-badge bg-muted overflow-hidden">
                  <div className={cn('h-full radius-badge transition-all duration-300', checkedInStays.length === totalActive ? 'bg-success' : 'bg-primary')} style={{ width: `${Math.round((checkedInStays.length / totalActive) * 100)}%` }} />
                </div>
              </div>
              {isCheckInDay && assignedStays.length > 1 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs h-auto py-1 px-2 text-primary hover:text-primary/80" disabled={isBusy}>
                      {checkingInAll ? <Loader2 size={12} className="animate-spin" /> : <LogIn size={12} />}เช็คอินทั้งหมด
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>ยืนยันเช็คอินทั้งหมด</AlertDialogTitle><AlertDialogDescription>เช็คอินห้อง {assignedStays.map((s) => s.room_number).join(', ')} ({assignedStays.length} ห้อง) พร้อมกัน</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>ยกเลิก</AlertDialogCancel><AlertDialogAction onClick={handleCheckInAll} className="bg-primary text-primary-foreground hover:bg-primary/90">เช็คอินทั้งหมด</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}

          {assignedStays.length > 0 && (
            <div className="space-y-1.5">
              {assignedStays.map((stay) => (
                <ConfirmActionCard key={stay.id} disabled={!isCheckInDay || isBusy} loading={busyStayId === stay.id && checkInMutation.isPending} loader={<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />} icon={isCheckInDay ? <LogIn className="w-4 h-4 text-primary" /> : undefined} confirmTitle="ยืนยันเช็คอิน" confirmDescription={`เช็คอิน ห้อง ${stay.room_number} ?`} confirmLabel="เช็คอิน" onConfirm={() => { if (stay.room_id) handleCheckInOne(stay.id, stay.room_id) }} className="radius-button px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-inline min-w-0">
                      <KeyRound className="w-3.5 h-3.5 text-primary shrink-0" /><span className="text-body font-bold tabular-nums">ห้อง {stay.room_number}</span><span className="text-helper">{stay.room_type_name}</span>
                    </div>
                    {!isCheckInDay && <span className="text-helper shrink-0">รอเช็คอิน</span>}
                  </div>
                </ConfirmActionCard>
              ))}
            </div>
          )}

          {checkedInStays.length > 0 && (
            <div className="space-y-1.5">
              {checkedInStays.map((stay) => (
                <div key={stay.id} className="flex items-center space-inline radius-button border border-success/20 bg-success/5 px-3 py-2.5 opacity-75">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" /><span className="text-body font-bold tabular-nums">ห้อง {stay.room_number}</span><span className="text-helper text-success/80">เข้าพักแล้ว</span>
                </div>
              ))}
            </div>
          )}

          <UnassignedRoomPicker unassignedStays={unassignedStays} roomsByType={roomsByType} availLoading={availLoading} isBusy={isBusy} busyStayId={busyStayId} onAssign={handleAssign} />

          {!isCheckInDay && assignedStays.length > 0 && <p className="text-helper text-center py-1">เช็คอินได้วันที่ {fmtShortISO(ciDate)}</p>}

          {totalActive > 0 && unassignedStays.length === 0 && assignedStays.length === 0 && (
            <div className="text-center py-2"><CheckCircle2 className="w-5 h-5 text-success mx-auto mb-1" /><p className="text-helper text-success">เช็คอินครบทุกห้องแล้ว</p></div>
          )}
        </>
      )}
    </div>
  )
}
