import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/utils'
import type { RoomStayResponse } from '@/features/bookings/types'

interface RoomTypeGroup {
  typeId: string
  typeName: string
  rooms: { room_id: string; room_number: string }[]
}

interface UnassignedRoomPickerProps {
  unassignedStays: RoomStayResponse[]
  roomsByType: RoomTypeGroup[]
  availLoading: boolean
  isBusy: boolean
  busyStayId: string | null
  onAssign: (roomTypeId: string, roomId: string, roomNumber: string) => void
}

export function UnassignedRoomPicker({
  unassignedStays, roomsByType, availLoading, isBusy, busyStayId, onAssign,
}: UnassignedRoomPickerProps) {
  if (unassignedStays.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs text-warning font-medium">
        รอกำหนด {unassignedStays.length} ห้อง
      </p>
      {availLoading ? (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : roomsByType.length === 0 ? (
        <p className="text-xs text-destructive text-center py-2">ไม่มีห้องว่างในประเภทนี้</p>
      ) : (
        roomsByType.map((rt) => (
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
                    onClick={() => onAssign(rt.typeId, room.room_id, room.room_number)}
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
        ))
      )}
    </div>
  )
}
