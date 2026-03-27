import { differenceInDays, parseISO } from 'date-fns'
import { LogIn, Loader2, Key } from 'lucide-react'
import { fmtShortISO } from '@/shared/utils'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/ui/select'
import { ConfirmActionCard } from '@/shared/ui/confirm-action-card'
import type { RoomStayResponse } from '../../types'

interface AvailableRoom {
  room_id: string
  room_number: string
  available: boolean
}

interface CheckInStayRowProps {
  stay: RoomStayResponse
  hasRoom: boolean
  isSingleChecking: boolean
  isCheckInPending: boolean
  getRoomLabel: (stay: RoomStayResponse) => string
  onCheckIn: (stay: RoomStayResponse) => void
  // For room selection
  availabilityLoading: boolean
  roomsByType: Map<string, AvailableRoom[]>
  selections: Record<string, string>
  selectedRoomIds: Set<string>
  onSelectRoom: (stayId: string, roomId: string) => void
}

export function CheckInStayRow({
  stay, hasRoom, isSingleChecking, isCheckInPending,
  getRoomLabel, onCheckIn,
  availabilityLoading, roomsByType, selections, selectedRoomIds, onSelectRoom,
}: CheckInStayRowProps) {
  const nights = differenceInDays(parseISO(stay.check_out), parseISO(stay.check_in))

  if (hasRoom) {
    return (
      <ConfirmActionCard
        disabled={isCheckInPending}
        loading={isSingleChecking}
        loader={<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        icon={<LogIn className="w-4 h-4 text-primary" />}
        confirmTitle="ยืนยันเช็คอิน"
        confirmDescription={`เช็คอิน ${getRoomLabel(stay)} ?`}
        confirmLabel="เช็คอิน"
        onConfirm={() => onCheckIn(stay)}
      >
        <div className="flex items-center gap-2">
          <Key className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm font-semibold">{getRoomLabel(stay)}</span>
          <span className="text-xs text-muted-foreground">{stay.room_type_name}</span>
        </div>
        <p className="text-micro-sm text-muted-foreground mt-0.5 pl-5.5">
          {fmtShortISO(stay.check_in)} → {fmtShortISO(stay.check_out)} · {nights} คืน
        </p>
      </ConfirmActionCard>
    )
  }

  return (
    <div className="radius-card border border-border bg-card text-card-foreground shadow-card px-3 py-2.5">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{stay.room_type_name} · {nights} คืน</p>
        {availabilityLoading ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            กำลังโหลด...
          </div>
        ) : (
          <Select
            value={selections[stay.id] ?? ''}
            onValueChange={(rid) => onSelectRoom(stay.id, rid)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="เลือกห้อง" />
            </SelectTrigger>
            <SelectContent>
              {(roomsByType.get(stay.room_type_id) ?? [])
                .filter((r) => r.available || r.room_id === stay.room_id)
                .map((room) => {
                  const taken = selectedRoomIds.has(room.room_id) && room.room_id !== selections[stay.id]
                  return (
                    <SelectItem key={room.room_id} value={room.room_id} disabled={taken}>
                      ห้อง {room.room_number}{taken ? ' (เลือกแล้ว)' : ''}
                    </SelectItem>
                  )
                })}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  )
}
