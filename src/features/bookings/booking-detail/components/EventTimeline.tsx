import { Clock, FileText, CreditCard, DoorOpen, LogIn, LogOut, Ban, Timer, Repeat, ArrowRightLeft, Receipt, Pencil } from 'lucide-react'
import { cn } from '@/shared/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { formatThaiDate, fmtShortISO } from '@/shared/utils'
import type { BookingEventResponse } from '../../types'

// ─── Event config (icon + color per action) ──────────────────────────────────

type EventConfig = { label: string; icon: typeof Clock; color: string }

const EVENT_CONFIG: Record<string, EventConfig> = {
  BOOKING_CREATED:  { label: 'สร้างการจอง',         icon: FileText,       color: 'text-primary' },
  PAYMENT_RECEIVED: { label: 'รับชำระเงิน',         icon: CreditCard,     color: 'text-success' },
  PAYMENT_REFUNDED: { label: 'คืนเงิน',             icon: CreditCard,     color: 'text-warning' },
  ROOM_ASSIGNED:    { label: 'มอบหมายห้อง',         icon: DoorOpen,       color: 'text-primary' },
  AUTO_ASSIGNED:    { label: 'มอบหมายอัตโนมัติ',   icon: Wand2,          color: 'text-primary' },
  CHECKED_IN:       { label: 'เช็คอิน',             icon: LogIn,          color: 'text-success' },
  CHECKED_OUT:      { label: 'เช็คเอาท์',           icon: LogOut,         color: 'text-muted-foreground' },
  STAY_CANCELLED:   { label: 'ยกเลิกห้อง',         icon: Ban,            color: 'text-destructive' },
  STAY_EXTENDED:    { label: 'ขยายเวลา',            icon: Timer,          color: 'text-info' },
  STAY_MOVED:       { label: 'ย้ายห้อง',            icon: Repeat,         color: 'text-info' },
  ROOM_TRANSFERRED: { label: 'ย้ายห้อง',            icon: ArrowRightLeft, color: 'text-info' },
  INVOICE_ISSUED:   { label: 'ออกใบเสร็จ',          icon: Receipt,        color: 'text-foreground' },
  BOOKING_MODIFIED: { label: 'แก้ไขข้อมูล',         icon: Pencil,         color: 'text-info' },
}

const DEFAULT_EVENT: EventConfig = { label: '', icon: Clock, color: 'text-muted-foreground' }

/** Replace ISO dates (YYYY-MM-DD) in event detail text with short Thai format */
function formatEventDetail(detail: string): string {
  return detail.replace(/\d{4}-\d{2}-\d{2}/g, (match) => {
    try { return fmtShortISO(match) } catch { return match }
  })
}

// ─── Component ───────────────────────────────────────────────────────────────

import { Wand2 } from 'lucide-react'

export function EventTimeline({ events }: { events: BookingEventResponse[] }) {
  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-helper font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4" />
          ประวัติกิจกรรม
          <span className="text-micro font-normal text-muted-foreground/70 ml-auto">{events.length} รายการ</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-3">
        <div className="space-y-0">
          {events.map((ev, i) => {
            const cfg = EVENT_CONFIG[ev.action] ?? DEFAULT_EVENT
            const Icon = cfg.icon
            return (
              <div key={ev.id} className="flex gap-3">
                {/* Timeline line + icon */}
                <div className="flex flex-col items-center">
                  <div className={cn('mt-1 shrink-0', cfg.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {i < events.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>
                {/* Content */}
                <div className="pb-4 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="text-body font-medium">
                      {cfg.label || ev.action}
                    </p>
                    <span className="text-micro text-muted-foreground/70">
                      {formatThaiDate(ev.created_at)}
                    </span>
                  </div>
                  <p className="text-helper mt-0.5">{formatEventDetail(ev.detail)}</p>
                  {ev.actor && (
                    <p className="text-micro text-muted-foreground/50 mt-0.5">
                      โดย {ev.actor}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
