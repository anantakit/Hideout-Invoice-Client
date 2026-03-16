import { todayISO, addDaysISO } from '@/shared/utils'
import { Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'
import { ROUTES } from '@/app/routes'
import { useStayAvailability } from '../../hooks/useStayAvailability'
import { RoomTypeAvailabilityRow } from './RoomTypeAvailabilityRow'
import { DateRangePicker } from '../../shared/components/DateRangePicker'
import type { DateRange } from '../../shared/components/DateRangePicker'

interface StayAvailabilityCardProps {
  /** Controlled range — parent owns the state for free-room toggle. */
  range?: DateRange
  onRangeChange?: (range: DateRange) => void
}

export function StayAvailabilityCard({ range, onRangeChange }: StayAvailabilityCardProps) {
  const navigate = useNavigate()
  const today = todayISO()
  const tomorrow = addDaysISO(1)

  const currentRange = range ?? { checkIn: today, checkOut: tomorrow }
  const handleChange = onRangeChange ?? (() => {})

  const isValid = currentRange.checkIn && currentRange.checkOut && currentRange.checkOut > currentRange.checkIn

  const { data, isLoading, isFetching } = useStayAvailability(
    isValid ? currentRange.checkIn : '',
    isValid ? currentRange.checkOut : '',
  )

  const totalAvailable = data?.roomTypes.reduce((s, rt) => s + rt.available, 0) ?? 0
  const totalRooms = data?.roomTypes.reduce((s, rt) => s + rt.total, 0) ?? 0

  return (
    <Card>
      <CardContent className="px-4 py-3 space-y-3">
        <p className="text-label text-muted-foreground">ห้องว่าง</p>

        <DateRangePicker
          value={currentRange}
          onChange={handleChange}
          placeholder="วันเช็คอิน → เช็คเอาท์"
        />

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
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => navigate(`${ROUTES.bookings.new}?check_in=${currentRange.checkIn}&check_out=${currentRange.checkOut}`)}
              >
                สร้างการจอง
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
