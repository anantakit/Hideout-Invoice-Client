import { Link } from 'react-router'
import { Receipt, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/ui/select'
import { RadioCardGroup, RadioCardItem } from '@/shared/ui/radio-card-group'
import { CheckboxCard } from '@/shared/ui/checkbox-card'
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
import { formatThaiDate, formatTHB } from '@/shared/utils'
import { addDaysToISO } from '../../shared/utils/bookingStatusHelpers'
import type { BookingResponse, RoomStayResponse, InvoiceResponseShort } from '../../types'
import { useReceiptBillingState } from '../hooks/useReceiptBillingState'

export function ReceiptSection({
  bookingId,
  booking,
  stays,
}: {
  bookingId: string
  booking: BookingResponse
  stays: RoomStayResponse[]
}) {
  const {
    showModeSelect, setShowModeSelect,
    billingMode, changeBillingMode,
    selectedStayIds, toggleStayId,
    selectedStayId, changeNightStay,
    selectedDate, setSelectedDate,
    canConfirm, handleConfirm,
  } = useReceiptBillingState(bookingId)

  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-helper font-semibold flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            ใบเสร็จ
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-xs"
            onClick={() => setShowModeSelect(true)}
          >
            <FileText className="w-3.5 h-3.5 mr-1" />
            ออกใบเสร็จ
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-3">
        {booking.invoices && booking.invoices.length > 0 ? (
          <div className="space-y-2">
            {booking.invoices.map((inv: InvoiceResponseShort) => (
              <Link
                key={inv.id}
                to={`/receipts/${inv.id}`}
                className="flex items-center justify-between radius-button border border-border bg-card px-3 py-2.5 hover:bg-accent/60 transition-colors"
              >
                <div>
                  <p className="text-body font-medium text-primary">{inv.invoice_number}</p>
                  <p className="text-helper">{formatThaiDate(inv.issue_date)}</p>
                </div>
                <span className="text-body font-semibold">{formatTHB(inv.total)}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-helper text-center py-3">ยังไม่มีใบเสร็จ</p>
        )}
      </CardContent>

      {/* Billing mode dialog */}
      <AlertDialog open={showModeSelect} onOpenChange={setShowModeSelect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>เลือกรูปแบบใบเสร็จ</AlertDialogTitle>
            <AlertDialogDescription>
              เลือกวิธีออกใบเสร็จสำหรับการจองนี้
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2">
            {/* Mode selection cards */}
            <RadioCardGroup
              value={billingMode}
              onValueChange={(val) => changeBillingMode(val as 'booking' | 'stay' | 'night')}
            >
              {([
                ['booking', 'ทั้งการจอง', 'รวมทุกห้องในใบเสร็จเดียว'],
                ['stay', 'แยกตามห้อง', 'เลือกห้องที่ต้องการออกใบเสร็จ'],
                ['night', 'รายวัน', 'ออกใบเสร็จสำหรับคืนที่เลือก'],
              ] as const).map(([value, label, desc]) => (
                <RadioCardItem key={value} value={value}>
                  <p className="text-body font-medium">{label}</p>
                  <p className="text-helper">{desc}</p>
                </RadioCardItem>
              ))}
            </RadioCardGroup>

            {/* Stay selection for mode=stay */}
            {billingMode === 'stay' && (
              <div className="pl-2 space-y-1.5 pt-1">
                <p className="text-helper font-medium mb-1">เลือกห้อง:</p>
                {stays.map((stay) => (
                  <CheckboxCard
                    key={stay.id}
                    checked={selectedStayIds.includes(stay.id)}
                    onCheckedChange={() => toggleStayId(stay.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-body">
                        {stay.room_number ? `ห้อง ${stay.room_number}` : stay.room_type_name}
                      </span>
                      <span className="text-helper">
                        {stay.nights} คืน
                      </span>
                    </div>
                  </CheckboxCard>
                ))}
              </div>
            )}

            {/* Stay + date selection for mode=night */}
            {billingMode === 'night' && (
              <div className="pl-2 space-y-2 pt-1">
                <div>
                  <p className="text-helper font-medium mb-1">เลือกห้อง:</p>
                  <Select
                    value={selectedStayId || undefined}
                    onValueChange={changeNightStay}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือก..." />
                    </SelectTrigger>
                    <SelectContent sheetTitle="เลือกห้อง">
                      {stays.map((stay) => (
                        <SelectItem key={stay.id} value={stay.id}>
                          {stay.room_number ? `ห้อง ${stay.room_number}` : stay.room_type_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedStayId && (() => {
                  const stay = stays.find((s) => s.id === selectedStayId)
                  if (!stay) return null
                  return (
                    <div>
                      <p className="text-helper font-medium mb-1">เลือกวันที่:</p>
                      <Input
                        type="date"
                        value={selectedDate}
                        min={stay.check_in.slice(0, 10)}
                        max={addDaysToISO(stay.check_out, -1)}
                        onChange={(e) => setSelectedDate(e.target.value)}
                      />
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction disabled={!canConfirm} onClick={handleConfirm}>
              ต่อไป
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
