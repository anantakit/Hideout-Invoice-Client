import { useState, useEffect } from 'react'
import { LogIn, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/shared/ui/button'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/shared/ui/alert-dialog'
import { useCheckInRooms } from '../../hooks'
import type { RoomStayResponse } from '../../types'
import { useCheckInAvailability } from '../../timeline/hooks/useCheckInData'
import { CheckInStayRow } from './CheckInStayRow'

interface InlineCheckInProps {
  bookingId: string
  pendingStays: RoomStayResponse[]
  compact?: boolean
}

export function InlineCheckIn({ bookingId, pendingStays }: InlineCheckInProps) {
  const checkIn = useCheckInRooms(bookingId)
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [initialized, setInitialized] = useState(false)
  const [checkingInStayId, setCheckingInStayId] = useState<string | null>(null)
  const [confirmAll, setConfirmAll] = useState(false)

  useEffect(() => {
    if (pendingStays.length > 0 && !initialized) {
      const initial: Record<string, string> = {}
      for (const stay of pendingStays) { if (stay.room_id) initial[stay.id] = stay.room_id }
      if (Object.keys(initial).length > 0) setSelections(initial)
      setInitialized(true)
    }
  }, [pendingStays, initialized])

  const assigned = pendingStays.filter((s) => s.room_id || selections[s.id])
  const unassigned = pendingStays.filter((s) => !s.room_id && !selections[s.id])
  const allReady = assigned.length === pendingStays.length

  const { roomsByType, selectedRoomIds, availabilityLoading } =
    useCheckInAvailability(bookingId, pendingStays, unassigned.length, selections)

  function getRoomLabel(stay: RoomStayResponse): string {
    const roomId = selections[stay.id] || stay.room_id || ''
    if (stay.room_number) return `ห้อง ${stay.room_number}`
    const rooms = roomsByType.get(stay.room_type_id) ?? []
    const room = rooms.find((r) => r.room_id === roomId)
    return room ? `ห้อง ${room.room_number}` : `ห้อง ${roomId.slice(0, 6)}`
  }

  function handleCheckInSingle(stay: RoomStayResponse) {
    const roomId = selections[stay.id] || stay.room_id
    if (!roomId) return
    setCheckingInStayId(stay.id)
    checkIn.mutate([{ room_stay_id: stay.id, room_id: roomId }], {
      onSuccess: () => { toast.success(`เช็คอิน ห้อง ${stay.room_number || roomId.slice(0, 6)} สำเร็จ`); setCheckingInStayId(null) },
      onError: (err: Error) => { toast.error(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'); setCheckingInStayId(null) },
    })
  }

  function handleCheckInAll() {
    const stays = pendingStays.filter((s) => selections[s.id] || s.room_id).map((s) => ({ room_stay_id: s.id, room_id: selections[s.id] || s.room_id! }))
    if (stays.length === 0) return
    checkIn.mutate(stays, {
      onSuccess: () => { toast.success(`เช็คอิน ${stays.length} ห้องสำเร็จ`) },
      onError: (err: Error) => { toast.error(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่') },
    })
  }

  const stayRows = (
    <div className="space-y-2">
      {pendingStays.map((stay) => {
        const roomId = selections[stay.id] || stay.room_id || ''
        return (
          <CheckInStayRow
            key={stay.id}
            stay={stay}
            hasRoom={roomId !== ''}
            isSingleChecking={checkingInStayId === stay.id && checkIn.isPending}
            isCheckInPending={checkIn.isPending}
            getRoomLabel={getRoomLabel}
            onCheckIn={handleCheckInSingle}
            availabilityLoading={availabilityLoading}
            roomsByType={roomsByType}
            selections={selections}
            selectedRoomIds={selectedRoomIds}
            onSelectRoom={(stayId, rid) => setSelections((prev) => ({ ...prev, [stayId]: rid }))}
          />
        )
      })}
    </div>
  )

  const batchButton = pendingStays.length > 1 && (
    <Button variant="ghost" size="sm" className="gap-1 text-xs h-auto py-1 px-2 text-primary hover:text-primary/80 shrink-0" disabled={checkIn.isPending || !allReady} onClick={() => setConfirmAll(true)}>
      {checkIn.isPending && checkingInStayId === null ? <Loader2 size={12} className="animate-spin" /> : <LogIn size={12} />}
      เช็คอินทั้งหมด
    </Button>
  )

  const confirmDialogs = (
    <AlertDialog open={confirmAll} onOpenChange={(open) => !open && setConfirmAll(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ยืนยันเช็คอิน</AlertDialogTitle>
          <AlertDialogDescription>เช็คอินทั้งหมด {pendingStays.length} ห้อง ?</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction onClick={() => { handleCheckInAll(); setConfirmAll(false) }}>เช็คอินทั้งหมด</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <LogIn className="w-3.5 h-3.5" />
          เช็คอิน {pendingStays.length > 1 ? `0/${pendingStays.length} ห้อง` : ''}
        </p>
        {batchButton}
      </div>
      {stayRows}
      {confirmDialogs}
    </div>
  )
}
