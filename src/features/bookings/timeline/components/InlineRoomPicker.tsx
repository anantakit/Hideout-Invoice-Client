import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/shared/utils'
import { useAssignRooms } from '../../hooks'
import { useRoomPickerData } from '../hooks/useRoomPickerData'

// ─── InlineRoomPicker ─────────────────────────────────────────────────────────

export function InlineRoomPicker({
  bookingId,
  checkIn,
  checkOut,
  onDone,
}: {
  bookingId: string
  checkIn: string
  checkOut: string
  onDone: () => void
}) {
  const { unassignedStays, roomsByType, isLoading } = useRoomPickerData(bookingId, checkIn, checkOut)
  const assignMutation = useAssignRooms(bookingId)
  const [busyStayId, setBusyStayId] = useState<string | null>(null)

  const handleAssign = async (roomTypeId: string, roomId: string, roomNumber: string) => {
    const stay = unassignedStays.find((s) => s.room_type_id === roomTypeId)
    if (!stay) return
    setBusyStayId(stay.id)
    try {
      await assignMutation.mutateAsync([{ room_stay_id: stay.id, room_id: roomId }])
      toast.success(`กำหนดห้อง ${roomNumber} แล้ว`)
      if (unassignedStays.length <= 1) onDone()
    } catch (err) {
      toast.error((err as Error).message || 'เกิดข้อผิดพลาด')
    } finally {
      setBusyStayId(null)
    }
  }

  const isBusy = assignMutation.isPending

  return (
    <div className="radius-card rounded-t-none border border-t-0 border-border bg-card space-card space-y-2">
      {isLoading ? (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : roomsByType.length === 0 ? (
        <p className="text-xs text-destructive text-center py-2">ไม่มีห้องว่างในประเภทนี้</p>
      ) : (
        <>
          {unassignedStays.length > 0 && (
            <p className="text-xs text-warning font-medium">
              รอกำหนด {unassignedStays.length} ห้อง
            </p>
          )}

          {roomsByType.map((rt) => (
            <div key={rt.typeId} className="space-y-1.5">
              {roomsByType.length > 1 && (
                <p className="text-xs text-muted-foreground">{rt.typeName}</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {rt.rooms.map((room) => {
                  const stayForType = unassignedStays.find((s) => s.room_type_id === rt.typeId)
                  const isBusyRoom = busyStayId === stayForType?.id
                  return (
                    <button
                      key={room.room_id}
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleAssign(rt.typeId, room.room_id, room.room_number)}
                      className={cn(
                        'radius-card border border-border bg-card px-3 py-2 min-w-14 text-center',
                        'text-sm font-bold tabular-nums transition-colors cursor-pointer',
                        isBusy ? 'opacity-50' : 'hover:border-primary hover:bg-primary/5 active:bg-primary/10',
                      )}
                    >
                      {isBusyRoom && isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                      ) : (
                        room.room_number
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
