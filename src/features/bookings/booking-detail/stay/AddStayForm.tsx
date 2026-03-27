import { Plus } from 'lucide-react'
import { formatTHB } from '@/shared/utils'
import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'
import type { RoomTypeResponse, AvailabilityGroupedResponse } from '../../types'
import type { StayDraft, Action } from './useAddStayForm'
import { StayDraftRow } from '../components/StayDraftRow'

// ── AddStayForm ─────────────────────────────────────────────────────────────

interface AddStayFormProps {
  drafts: StayDraft[]
  dispatch: React.Dispatch<Action>
  roomTypes: RoomTypeResponse[]
  availMap: Map<string, { data?: AvailabilityGroupedResponse; isLoading: boolean }>
  isRoomTakenByOtherRow: (currentKey: string, roomId: string, checkIn: string, checkOut: string) => boolean
  totalPrice: number
  canSubmit: boolean
  isPending: boolean
  onAddRow: () => void
  onSubmit: () => void
  onClose: () => void
}

export function AddStayForm({
  drafts,
  dispatch,
  roomTypes,
  availMap,
  isRoomTakenByOtherRow,
  totalPrice,
  canSubmit,
  isPending,
  onAddRow,
  onSubmit,
  onClose,
}: AddStayFormProps) {
  return (
    <>
      {/* Rows */}
      {drafts.map((draft, idx) => (
        <StayDraftRow
          key={draft.key}
          draft={draft}
          index={idx}
          roomTypes={roomTypes}
          availability={availMap.get(`${draft.checkIn}|${draft.checkOut}`)}
          isRoomTakenByOtherRow={isRoomTakenByOtherRow}
          canRemove={drafts.length > 1}
          dispatch={dispatch}
        />
      ))}

      {/* Add row */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full text-muted-foreground"
        onClick={onAddRow}
      >
        <Plus className="w-3.5 h-3.5 mr-1" />
        เพิ่มรายการ
      </Button>

      {/* Total */}
      {totalPrice > 0 && (
        <>
          <Separator />
          <div className="flex items-center justify-between text-body">
            <span className="text-muted-foreground">
              รวม {drafts.length} รายการ
            </span>
            <span className="font-semibold tabular-nums">{formatTHB(totalPrice)}</span>
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={isPending}
          onClick={onClose}
        >
          ยกเลิก
        </Button>
        <Button
          size="sm"
          className="flex-1"
          disabled={!canSubmit}
          onClick={onSubmit}
        >
          {isPending
            ? 'กำลังบันทึก…'
            : drafts.length === 1
              ? 'เพิ่มห้องพัก'
              : `เพิ่ม ${drafts.length} ห้อง`}
        </Button>
      </div>
    </>
  )
}
