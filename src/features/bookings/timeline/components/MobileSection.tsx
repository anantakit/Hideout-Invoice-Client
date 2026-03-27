import React from 'react'
import type { TimelineRoom, TimelineBooking, UnassignedStay } from '../../types'
import { MobileDateStrip } from './MobileDateStrip'
import { MobileTimelineList } from './MobileTimelineList'

interface MobileSectionProps {
  mobileDays: Date[]
  mobileDayOffset: number
  todayStr: string
  mobileStripRef: React.RefObject<HTMLDivElement>
  onMobileDaySelect: (index: number) => void
  rooms: TimelineRoom[]
  selectedDateStr: string
  bookingColorMap: Record<string, string>
  roomTypeNameMap: Record<string, string>
  roomTypeIdMap: Record<string, string>
  unassignedStays: UnassignedStay[]
  onSelectBooking: (b: TimelineBooking, roomNumbers?: string[]) => void
}

export const MobileSection = React.memo(function MobileSection({
  mobileDays,
  mobileDayOffset,
  todayStr,
  mobileStripRef,
  onMobileDaySelect,
  rooms,
  selectedDateStr,
  bookingColorMap,
  roomTypeNameMap,
  roomTypeIdMap,
  unassignedStays,
  onSelectBooking,
}: MobileSectionProps) {
  return (
    <div className="md:hidden flex flex-col flex-1 overflow-hidden">
      <MobileDateStrip
        days={mobileDays}
        selectedIndex={mobileDayOffset}
        todayStr={todayStr}
        stripRef={mobileStripRef}
        onSelectDay={onMobileDaySelect}
      />

      <MobileTimelineList
        rooms={rooms}
        selectedDateStr={selectedDateStr}
        bookingColorMap={bookingColorMap}
        roomTypeNameMap={roomTypeNameMap}
        roomTypeIdMap={roomTypeIdMap}
        unassignedStays={unassignedStays}
        onSelectBooking={onSelectBooking}
      />
    </div>
  )
})
