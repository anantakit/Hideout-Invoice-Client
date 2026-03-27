import {
  X, Plus, CalendarDays, Banknote, KeyRound, CreditCard, Clock, Loader2,
} from 'lucide-react'
import { cn, fmtThaiDate, formatTHBCurrency, formatCompactNumber } from '@/shared/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { CardButton } from '@/shared/ui/card-button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { KEY_DEPOSIT_PER_ROOM } from '../../constants'
import { useInlineBookingForm } from '../hooks/useInlineBookingForm'
import type { PaymentMode } from '../hooks/useInlineBookingForm'
import { InlineGuestFields } from './InlineGuestFields'
import { InlineRoomSelector } from './InlineRoomSelector'
import type { CreateBookingPrefill } from './OperationsDrawer'

// ── Types ────────────────────────────────────────────────────────────────────

interface InlineCreateBookingFormProps {
  prefill: CreateBookingPrefill
  onClose: () => void
  onBookingCreated?: (bookingId: string) => void
}

// ── Payment mode options ─────────────────────────────────────────────────────

const PAYMENT_OPTIONS: { value: PaymentMode; label: string; desc: string; Icon: typeof Banknote }[] = [
  { value: 'full', label: 'ค่าห้อง', desc: 'เต็มจำนวน', Icon: Banknote },
  { value: 'full_deposit', label: 'ค่าห้อง + ประกัน', desc: 'รวมเงินประกัน', Icon: KeyRound },
  { value: 'partial', label: 'บางส่วน', desc: 'กรอกจำนวนเอง', Icon: CreditCard },
  { value: 'reserve', label: 'ภายหลัง', desc: 'ยังไม่ชำระ', Icon: Clock },
]

// ── Component ────────────────────────────────────────────────────────────────

export function InlineCreateBookingForm({
  prefill,
  onClose,
  onBookingCreated,
}: InlineCreateBookingFormProps) {
  const form = useInlineBookingForm(prefill, onBookingCreated)
  const {
    source, guestName, guestPhone, paymentMode, paymentAmount, paymentMethod,
    showRoomPicker, selectedRooms, selectedRoomIds,
    nights, totalAmount, depositAmount, canSubmit, submitLabel, availData, isPending,
    dispatch, handlePaymentModeChange, handleSubmit,
  } = form

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-3 border-b border-border-soft">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-foreground flex items-center gap-1.5">
            <Plus size={16} />
            สร้างการจอง
            {selectedRooms.length > 1 && (
              <Badge variant="blue" className="text-xs px-1.5 py-0">
                {selectedRooms.length} ห้อง
              </Badge>
            )}
          </span>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 shrink-0" aria-label="ปิด">
            <X size={16} />
          </Button>
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
          <CalendarDays size={12} className="shrink-0" />
          {fmtThaiDate(prefill.checkIn)} → {fmtThaiDate(prefill.checkOut)} · {nights} คืน
        </div>
      </div>

      {/* ── Scrollable content ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Section 1: Room & Source */}
        <InlineRoomSelector
          selectedRooms={selectedRooms}
          selectedRoomIds={selectedRoomIds}
          source={source}
          showRoomPicker={showRoomPicker}
          availData={availData}
          dispatch={dispatch}
        />

        {/* Section 2: Guest info */}
        <InlineGuestFields
          guestName={guestName}
          guestPhone={guestPhone}
          dispatch={dispatch}
        />

        {/* Section 3: Payment */}
        <div className="rounded-lg bg-muted/50 p-3 space-y-2.5">
          <p className="text-micro-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Banknote size={12} />
            การชำระเงิน
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_OPTIONS.map((opt) => (
              <CardButton
                key={opt.value}
                variant="ghost"
                padding="default"
                onClick={() => handlePaymentModeChange(opt.value)}
                className={cn(
                  'flex-row gap-2 rounded-lg border',
                  paymentMode === opt.value
                    ? 'border-primary/40 bg-primary/10 text-primary ring-1 ring-primary/20'
                    : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground',
                )}
              >
                <opt.Icon size={16} className="shrink-0 opacity-70" />
                <div className="min-w-0">
                  <span className="text-sm font-semibold block leading-tight">{opt.label}</span>
                  <span className="text-xs leading-tight block opacity-60">{opt.desc}</span>
                </div>
              </CardButton>
            ))}
          </div>

          {paymentMode !== 'reserve' && (
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div>
                <Label htmlFor="drawer-pay-amount" className="text-xs text-muted-foreground">ยอดชำระ (฿)</Label>
                <Input
                  id="drawer-pay-amount"
                  type="number"
                  min={0}
                  step={0.01}
                  readOnly={paymentMode === 'full' || paymentMode === 'full_deposit'}
                  className={cn(
                    'mt-0.5 h-9 text-sm tabular-nums',
                    (paymentMode === 'full' || paymentMode === 'full_deposit') && 'bg-muted cursor-default',
                  )}
                  value={paymentAmount}
                  onChange={(e) => dispatch({ type: 'SET_PAYMENT_AMOUNT', value: e.target.value })}
                  placeholder={totalAmount > 0 ? formatCompactNumber(totalAmount) : '0'}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">วิธีชำระ</Label>
                <div className="flex gap-1.5 mt-0.5">
                  {(['CASH', 'TRANSFER'] as const).map((m) => (
                    <Button
                      key={m}
                      variant="outline"
                      onClick={() => dispatch({ type: 'SET_PAYMENT_METHOD', value: m })}
                      className={cn(
                        'flex-1 h-9 text-sm font-medium',
                        paymentMethod === m
                          ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15'
                          : 'text-muted-foreground',
                      )}
                    >
                      {m === 'CASH' ? 'เงินสด' : 'โอนเงิน'}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary card */}
        {totalAmount > 0 && (
          <SummaryCard
            selectedRooms={selectedRooms}
            nights={nights}
            totalAmount={totalAmount}
            depositAmount={depositAmount}
            paymentMode={paymentMode}
            paymentAmount={paymentAmount}
          />
        )}
      </div>

      {/* ── Sticky footer ──────────────────────────────────────────── */}
      <div className="shrink-0 p-3 border-t border-border-soft">
        <Button
          className="w-full gap-1.5"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {isPending && <Loader2 className="icon-sm animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </div>
  )
}

// ── Summary Card (private) ───────────────────────────────────────────────────

interface SummaryCardProps {
  selectedRooms: { roomId: string; roomNumber: string; pricePerNight: number; chargedPrice?: number }[]
  nights: number
  totalAmount: number
  depositAmount: number
  paymentMode: PaymentMode
  paymentAmount: string
}

function SummaryCard({ selectedRooms, nights, totalAmount, depositAmount, paymentMode, paymentAmount }: SummaryCardProps) {
  return (
    <div className="rounded-lg border border-border-soft bg-card p-3 pl-3.5 border-l-2 border-l-primary/50 space-y-1.5 text-sm">
      {selectedRooms.length > 1 && selectedRooms.map((r) => {
        const ep = r.chargedPrice ?? r.pricePerNight
        const discounted = r.chargedPrice != null && r.chargedPrice < r.pricePerNight
        return (
          <div key={r.roomId} className="flex justify-between text-xs text-muted-foreground">
            <span>
              ห้อง {r.roomNumber} ({nights} คืน)
              {discounted && (
                <span className="ml-1">
                  <span className="line-through">{formatTHBCurrency(r.pricePerNight)}</span>
                  {' → '}
                  <span className="text-primary">{formatTHBCurrency(ep)}</span>
                </span>
              )}
            </span>
            <span className="tabular-nums">{formatTHBCurrency(nights * ep)}</span>
          </div>
        )
      })}
      <div className="flex justify-between">
        <span className="text-muted-foreground">
          ค่าห้อง{selectedRooms.length > 1 ? ` (${selectedRooms.length} ห้อง)` : ''}
        </span>
        <span className="font-semibold tabular-nums">{formatTHBCurrency(totalAmount)}</span>
      </div>
      {paymentMode === 'full_deposit' && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>ประกันกุญแจ ({selectedRooms.length} × ฿{KEY_DEPOSIT_PER_ROOM})</span>
          <span className="tabular-nums">{formatTHBCurrency(depositAmount)}</span>
        </div>
      )}
      {paymentMode !== 'full_deposit' && depositAmount > 0 && (
        <div className="flex justify-between text-xs text-amber-500">
          <span>เก็บประกันหน้าเคาน์เตอร์</span>
          <span className="tabular-nums">{' ' + formatTHBCurrency(depositAmount)}</span>
        </div>
      )}
      {paymentMode !== 'reserve' && paymentAmount && (
        <>
          <div className="border-t border-border-soft my-1" />
          <div className="flex justify-between">
            <span className="text-muted-foreground">ชำระ</span>
            <span className="font-medium text-success tabular-nums">{formatTHBCurrency(Number(paymentAmount))}</span>
          </div>
          {totalAmount - Number(paymentAmount) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">คงเหลือ</span>
              <span className="font-semibold text-warning tabular-nums">
                {formatTHBCurrency(totalAmount - Number(paymentAmount))}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
