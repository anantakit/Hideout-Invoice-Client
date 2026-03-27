import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { RoomTypeBookingBuilder } from './RoomTypeBookingBuilder'

export function BookingStaySection() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">ห้องพัก</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <RoomTypeBookingBuilder />
      </CardContent>
    </Card>
  )
}
