import { useState } from 'react'
import { format, addDays } from 'date-fns'
import { Loader2, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'
import { ROUTES } from '@/app/routes'
import { useStayAvailability } from '../../hooks/useStayAvailability'
import { RoomTypeAvailabilityRow } from './RoomTypeAvailabilityRow'

export function StayAvailabilityCard() {
  const navigate = useNavigate()
  const today = format(new Date(), 'yyyy-MM-dd')
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  const [checkIn, setCheckIn] = useState(today)
  const [checkOut, setCheckOut] = useState(tomorrow)
  const [searchDates, setSearchDates] = useState({ checkIn: '', checkOut: '' })

  const isValid = checkIn && checkOut && checkOut > checkIn
  const dateError = checkIn && checkOut && checkOut <= checkIn
    ? 'วันเช็คเอาท์ต้องหลังวันเช็คอิน'
    : ''

  const { data, isLoading, isFetching } = useStayAvailability(
    searchDates.checkIn,
    searchDates.checkOut,
  )

  function handleSearch() {
    if (!isValid) return
    setSearchDates({ checkIn, checkOut })
  }

  const totalAvailable = data?.roomTypes.reduce((s, rt) => s + rt.available, 0) ?? 0
  const hasResults = data && searchDates.checkIn

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Check Stay Availability</CardTitle>
        <CardDescription className="text-xs">
          ตรวจสอบห้องว่างตามช่วงวันที่
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Date inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Check-in</label>
            <Input
              type="date"
              value={checkIn}
              min={today}
              onChange={(e) => setCheckIn(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Check-out</label>
            <Input
              type="date"
              value={checkOut}
              min={checkIn || today}
              onChange={(e) => setCheckOut(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>

        {dateError && (
          <p className="text-xs text-destructive">{dateError}</p>
        )}

        <Button
          onClick={handleSearch}
          disabled={!isValid || isLoading}
          className="w-full"
          size="sm"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Search className="w-4 h-4 mr-2" />
          )}
          Check Rooms
        </Button>

        {/* Results */}
        {hasResults && (
          <>
            <Separator />

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Available for entire stay
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
                onClick={() => navigate(ROUTES.bookings.new)}
              >
                Create Booking
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
