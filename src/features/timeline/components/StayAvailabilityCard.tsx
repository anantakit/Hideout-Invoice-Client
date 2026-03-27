import { useState, useRef } from 'react'
import { todayISO, addDaysISO, cn } from '@/shared/utils'
import { Loader2, Search, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'
import { ROUTES } from '@/app/routes'
import { useStayAvailability } from '@/features/bookings/hooks/useStayAvailability'
import { RoomTypeAvailabilityRow } from './RoomTypeAvailabilityRow'
import { DateRangePicker } from '@/features/bookings/shared/components/DateRangePicker'
import type { DateRange } from '@/features/bookings/shared/components/DateRangePicker'

interface StayAvailabilityCardProps {
  /** Controlled range — parent owns the state for free-room toggle. */
  range?: DateRange
  onRangeChange?: (range: DateRange) => void
  /** When true, content is shown immediately (parent controls visibility). */
  defaultExpanded?: boolean
}

export function StayAvailabilityCard({ range, onRangeChange, defaultExpanded = false }: StayAvailabilityCardProps) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(defaultExpanded)
  const cardRef = useRef<HTMLDivElement>(null)
  const today = todayISO()
  const tomorrow = addDaysISO(1)

  const currentRange = range ?? { checkIn: today, checkOut: tomorrow }
  const handleChange = onRangeChange ?? (() => {})

  const isValid = currentRange.checkIn && currentRange.checkOut && currentRange.checkOut > currentRange.checkIn

  // Only fetch when expanded — avoids unnecessary API call on every page load
  const { data, isLoading, isFetching } = useStayAvailability(
    expanded && isValid ? currentRange.checkIn : '',
    expanded && isValid ? currentRange.checkOut : '',
  )

  const totalAvailable = data?.roomTypes.reduce((s, rt) => s + rt.available, 0) ?? 0
  const totalRooms = data?.roomTypes.reduce((s, rt) => s + rt.total, 0) ?? 0

  return (
    <div ref={cardRef} className="radius-card border border-border bg-card overflow-hidden">
      {/* Collapsed header — always visible */}
      <button
        type="button"
        onClick={() => {
          setExpanded((v) => {
            if (!v) requestAnimationFrame(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
            return !v
          })
        }}
        className={cn(
          'w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors',
          'hover:bg-accent/10 active:bg-accent/20 cursor-pointer',
        )}
      >
        <span className="text-label text-muted-foreground flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5" />
          ค้นหาห้องว่าง
        </span>
        <ChevronDown className={cn(
          'w-3.5 h-3.5 text-muted-foreground/50 transition-transform',
          expanded && 'rotate-180',
        )} />
      </button>

      {/* Expanded content — date picker + availability */}
      {expanded && (
        <div className="px-4 pb-3 space-y-3 border-t border-border-soft">
          <div className="pt-3">
            <DateRangePicker
              value={currentRange}
              onChange={handleChange}
              placeholder="วันเช็คอิน → เช็คเอาท์"
            />
          </div>

          {isValid && isLoading && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {data && isValid && (
            <>
              <div className="space-y-0.5">
                {data.roomTypes.map((rt) => (
                  <RoomTypeAvailabilityRow
                    key={rt.id}
                    name={rt.name}
                    available={rt.available}
                    total={rt.total}
                  />
                ))}
              </div>

              {data.roomTypes.length > 1 && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-body font-medium">ว่างทั้งหมด</span>
                    <span className="text-body font-bold tabular-nums">
                      {totalAvailable}/{totalRooms} ห้อง
                      {isFetching && <Loader2 className="w-3 h-3 animate-spin inline ml-1" />}
                    </span>
                  </div>
                </>
              )}

              {totalAvailable > 0 && (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(`${ROUTES.bookings.new}?check_in=${currentRange.checkIn}&check_out=${currentRange.checkOut}`)}
                >
                  สร้างการจอง
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
