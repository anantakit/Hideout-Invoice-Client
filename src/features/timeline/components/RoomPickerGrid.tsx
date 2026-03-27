import { Loader2, ArrowRightLeft } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { CardButton } from '@/shared/ui/card-button'
import { Separator } from '@/shared/ui/separator'
import { cn, formatCompactNumber } from '@/shared/utils'
import type { RoomStayResponse } from '@/features/bookings/types'
import type { AvailableRoom, TransferRoomGroup } from '../hooks/useAssignRoom'

// ── Transfer Room Picker ─────────────────────────────────────────────────────

interface TransferPickerProps {
  transferringStay: RoomStayResponse
  transferRoomGroups: TransferRoomGroup[]
  currentTypePrice: number
  availLoading: boolean
  isBusy: boolean
  onCancel: () => void
  onPick: (roomId: string, roomNumber: string) => void
}

function TransferPicker({
  transferringStay,
  transferRoomGroups,
  currentTypePrice,
  availLoading,
  isBusy,
  onCancel,
  onPick,
}: TransferPickerProps) {
  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-body font-semibold flex items-center space-inline">
            <ArrowRightLeft className="w-3.5 h-3.5" />
            ย้ายจากห้อง {transferringStay.room_number}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={onCancel}
          >
            ยกเลิก
          </Button>
        </div>

        {availLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : transferRoomGroups.length === 0 ? (
          <p className="text-helper text-destructive text-center py-3">ไม่มีห้องว่าง</p>
        ) : (
          <div className="space-y-4">
            {transferRoomGroups.map((group) => {
              const diff = group.pricePerNight - currentTypePrice
              return (
                <div key={group.typeId}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <p className="text-label text-foreground">
                      {group.typeName}
                      {group.isSameType && (
                        <span className="text-helper font-normal ml-1">(ประเภทเดียวกัน)</span>
                      )}
                    </p>
                    {!group.isSameType && diff !== 0 && (
                      <span className={cn(
                        'text-micro font-medium',
                        diff > 0 ? 'text-warning' : 'text-success',
                      )}>
                        {diff > 0 ? '+' : ''}{formatCompactNumber(diff)}/คืน
                      </span>
                    )}
                  </div>
                  <div className="space-list">
                    {group.rooms.map((room) => (
                      <CardButton
                        key={room.room_id}
                        disabled={isBusy}
                        onClick={() => onPick(room.room_id, room.room_number)}
                        padding="card"
                        className={cn(
                          'flex-row items-center justify-between border',
                          group.isSameType
                            ? 'border-primary/30 bg-primary/5 active:bg-primary/10'
                            : 'border-border-soft bg-card active:bg-accent/10',
                        )}
                      >
                        <p className="text-body font-bold tabular-nums">ห้อง {room.room_number}</p>
                        <span className="text-caption text-primary shrink-0">เลือก</span>
                      </CardButton>
                    ))}
                  </div>
                </div>
              )
            })}

            {transferRoomGroups.some((g) => !g.isSameType) && (
              <p className="text-micro text-muted-foreground/70">
                * ราคาต่อคืนจะยังเป็นราคาเดิม
              </p>
            )}
          </div>
        )}
      </div>
      <Separator />
    </>
  )
}

// ── Assign Room Picker ───────────────────────────────────────────────────────

interface AssignPickerProps {
  remainingCount: number
  roomsByType: Map<string, AvailableRoom[]>
  unassignedStays: RoomStayResponse[]
  totalAvailableRooms: number
  availLoading: boolean
  isBusy: boolean
  onAssign: (roomTypeId: string, roomId: string, roomNumber: string) => void
}

function AssignPicker({
  remainingCount,
  roomsByType,
  unassignedStays,
  totalAvailableRooms,
  availLoading,
  isBusy,
  onAssign,
}: AssignPickerProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-body font-semibold">เลือกห้อง</p>
        <p className="text-helper text-warning font-medium mt-0.5">
          เหลืออีก {remainingCount} ห้อง
        </p>
      </div>

      {availLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {Array.from(roomsByType.entries()).map(([typeId, rooms]) => {
            const hasUnassigned = unassignedStays.some((s) => s.room_type_id === typeId)
            if (!hasUnassigned) return null

            return (
              <div key={typeId} className="space-y-1.5">
                {roomsByType.size > 1 && (
                  <p className="text-caption text-muted-foreground pb-0.5">
                    {rooms[0]?.room_type_name}
                  </p>
                )}
                {rooms.map((room) => (
                  <CardButton
                    key={room.room_id}
                    disabled={isBusy}
                    onClick={() => onAssign(typeId, room.room_id, room.room_number)}
                    padding="card"
                    className="flex-row items-center justify-between active:bg-accent/10"
                  >
                    <div>
                      <p className="text-body font-bold tabular-nums">ห้อง {room.room_number}</p>
                      <p className="text-micro text-muted-foreground">{room.room_type_name}</p>
                    </div>
                    <span className="text-caption text-primary shrink-0">เลือก</span>
                  </CardButton>
                ))}
              </div>
            )
          })}

          {totalAvailableRooms === 0 && (
            <p className="text-helper text-destructive text-center py-3">ไม่มีห้องว่างในประเภทนี้</p>
          )}
        </>
      )}
    </div>
  )
}

// ── Combined Export ──────────────────────────────────────────────────────────

export interface RoomPickerGridProps {
  remainingCount: number
  roomsByType: Map<string, AvailableRoom[]>
  unassignedStays: RoomStayResponse[]
  totalAvailableRooms: number
  availLoading: boolean
  isBusy: boolean
  transferringStay: RoomStayResponse | null
  transferRoomGroups: TransferRoomGroup[]
  currentTypePrice: number
  onAssign: (roomTypeId: string, roomId: string, roomNumber: string) => void
  onTransferPick: (roomId: string, roomNumber: string) => void
  onTransferCancel: () => void
}

export function RoomPickerGrid({
  remainingCount,
  roomsByType,
  unassignedStays,
  totalAvailableRooms,
  availLoading,
  isBusy,
  transferringStay,
  transferRoomGroups,
  currentTypePrice,
  onAssign,
  onTransferPick,
  onTransferCancel,
}: RoomPickerGridProps) {
  return (
    <>
      {transferringStay && (
        <TransferPicker
          transferringStay={transferringStay}
          transferRoomGroups={transferRoomGroups}
          currentTypePrice={currentTypePrice}
          availLoading={availLoading}
          isBusy={isBusy}
          onCancel={onTransferCancel}
          onPick={onTransferPick}
        />
      )}

      {remainingCount > 0 && !transferringStay && (
        <AssignPicker
          remainingCount={remainingCount}
          roomsByType={roomsByType}
          unassignedStays={unassignedStays}
          totalAvailableRooms={totalAvailableRooms}
          availLoading={availLoading}
          isBusy={isBusy}
          onAssign={onAssign}
        />
      )}
    </>
  )
}
