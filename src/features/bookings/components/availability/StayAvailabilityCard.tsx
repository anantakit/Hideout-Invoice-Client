import { format, addDays } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'
import { ROUTES } from '@/app/routes'
import { useStayAvailability } from '../../hooks/useStayAvailability'
import { RoomTypeAvailabilityRow } from './RoomTypeAvailabilityRow'
import { DateRangePicker } from '../DateRangePicker'
import type { DateRange } from '../DateRangePicker'

interface StayAvailabilityCardProps {
  /** Controlled range — parent owns the state for free-room toggle. */
  range?: DateRange
  onRangeChange?: (range: DateRange) => void
}

export function StayAvailabilityCard({ range, onRangeChange }: StayAvailabilityCardProps) {
  const navigate = useNavigate()
  const today = format(new Date(), 'yyyy-MM-dd')
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  // Use controlled props if provided, otherwise this is a no-op (shouldn't happen)
  const currentRange = range ?? { checkIn: today, checkOut: tomorrow }
  const handleChange = onRangeChange ?? (() => {})

  const isValid = currentRange.checkIn && currentRange.checkOut && currentRange.checkOut > currentRange.checkIn

  // Auto-fetch when both dates are valid
  const { data, isLoading, isFetching } = useStayAvailability(
    isValid ? currentRange.checkIn : '',
    isValid ? currentRange.checkOut : '',
  )

  const totalAvailable = data?.roomTypes.reduce((s, rt) => s + rt.available, 0) ?? 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">ตรวจสอบห้องว่างสำหรับการจอง</CardTitle>
        <CardDescription className="text-xs">
          เลือกวันเช็คอิน–เช็คเอาท์เพื่อดูห้องว่าง
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <DateRangePicker
          value={currentRange}
          onChange={handleChange}
          placeholder="เลือกวันเช็คอิน → เช็คเอาท์"
        />

        {/* Loading indicator */}
        {isValid && isLoading && (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Results — shown automatically when dates are valid */}
        {data && isValid && (
          <>
            <Separator />

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                ห้องว่างในช่วงที่เลือก
                {isFetching && <Loader2 className="w-3 h-3 animate-spin inline ml-1" />}
              </p>

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
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">รวม</span>
                    <span className="text-sm font-bold tabular-nums">
                      {totalAvailable} ว่าง
                    </span>
                  </div>
                </>
              )}
            </div>

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
