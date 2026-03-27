import { Plus, X } from 'lucide-react'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { useAddStayForm } from './useAddStayForm'
import { AddStayForm } from './AddStayForm'

// ── AddStayPanel ────────────────────────────────────────────────────────────

interface AddStayPanelProps {
  bookingId: string
}

export function AddStayPanel({ bookingId }: AddStayPanelProps) {
  const form = useAddStayForm(bookingId)

  if (!form.open) {
    return (
      <Button variant="outline" size="sm" className="w-full" onClick={() => form.setOpen(true)}>
        <Plus className="w-4 h-4 mr-1.5" />
        เพิ่มห้องพัก
      </Button>
    )
  }

  return (
    <Card>
      <CardContent className="px-4 py-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-body font-medium">เพิ่มห้องพัก</p>
          <button
            type="button"
            onClick={form.handleClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <AddStayForm
          drafts={form.drafts}
          dispatch={form.dispatch}
          roomTypes={form.roomTypes}
          availMap={form.availMap}
          isRoomTakenByOtherRow={form.isRoomTakenByOtherRow}
          totalPrice={form.totalPrice}
          canSubmit={form.canSubmit}
          isPending={form.isPending}
          onAddRow={form.handleAddRow}
          onSubmit={form.handleSubmit}
          onClose={form.handleClose}
        />
      </CardContent>
    </Card>
  )
}
