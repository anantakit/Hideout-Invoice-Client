import { ChevronDown, Loader2, Wand2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { CardButton } from '@/shared/ui/card-button'
import { cn, fmtShortISO } from '@/shared/utils'
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,
  AlertDialogHeader, AlertDialogFooter, AlertDialogTitle,
  AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/shared/ui/alert-dialog'
import { InlineRoomPicker } from './InlineRoomPicker'

interface PendingBookingGroup {
  bookingId: string
  guestName: string
  checkIn: string
  checkOut: string
  roomTypeNames: string[]
  totalRooms: number
  nights: number
}

interface DateSectionProps {
  section: { dateStr: string; label: string; isUrgent: boolean; bookings: PendingBookingGroup[]; stayCount: number }
  expandedBookingId: string | null
  setExpandedBookingId: (id: string | null) => void
  autoAssign: { isPending: boolean }
  autoAssignDate: string | null
  handleAutoAssign: (date: string) => void
}

export function PendingDateSection({
  section, expandedBookingId, setExpandedBookingId, autoAssign, autoAssignDate, handleAutoAssign,
}: DateSectionProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className={cn(
          'text-xs flex items-center space-inline',
          section.isUrgent ? 'font-semibold text-warning' : 'font-medium text-muted-foreground',
        )}>
          {section.isUrgent && <span className="w-1.5 h-1.5 radius-badge bg-warning" />}
          {section.label}
          <span className="font-normal text-muted-foreground/50">{section.stayCount} ห้อง</span>
        </p>
        {section.stayCount > 1 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" disabled={autoAssign.isPending} className="gap-1.5 h-auto p-0 text-helper hover:text-primary">
                {autoAssign.isPending && autoAssignDate === section.dateStr ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                อัตโนมัติ
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>ยืนยันจัดห้องอัตโนมัติ</AlertDialogTitle>
                <AlertDialogDescription>มอบหมายห้องอัตโนมัติให้ {section.stayCount} ห้อง เข้าพัก{section.label} ระบบจะเลือกห้องที่เหมาะสมที่สุด</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleAutoAssign(section.dateStr)} className="bg-primary text-primary-foreground hover:bg-primary/90">จัดอัตโนมัติ</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {section.bookings.map((booking) => {
        const isExpanded = expandedBookingId === booking.bookingId
        return (
          <div key={booking.bookingId}>
            <CardButton
              onClick={() => setExpandedBookingId(isExpanded ? null : booking.bookingId)}
              padding="card"
              className={cn(
                'border',
                isExpanded ? 'border-border bg-card rounded-b-none'
                  : section.isUrgent ? 'border-border bg-card hover:bg-accent/10'
                    : 'border-border-soft bg-card/50 hover:bg-card',
                isExpanded && 'rounded-b-none',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={cn('text-body font-semibold truncate', !section.isUrgent && 'text-muted-foreground')}>{booking.guestName}</span>
                <span className="text-helper shrink-0">{booking.nights} คืน</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center space-inline text-helper">
                  <span>{booking.roomTypeNames.join(', ')}</span>
                  <span>·</span>
                  <span className="tabular-nums">{booking.totalRooms} ห้อง</span>
                </div>
                <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground/50 transition-transform shrink-0', isExpanded && 'rotate-180')} />
              </div>
              <p className="text-helper text-muted-foreground/50 mt-0.5 tabular-nums">
                {fmtShortISO(booking.checkIn)} → {fmtShortISO(booking.checkOut)}
              </p>
            </CardButton>

            {isExpanded && (
              <InlineRoomPicker bookingId={booking.bookingId} checkIn={booking.checkIn} checkOut={booking.checkOut} onDone={() => setExpandedBookingId(null)} />
            )}
          </div>
        )
      })}
    </div>
  )
}
