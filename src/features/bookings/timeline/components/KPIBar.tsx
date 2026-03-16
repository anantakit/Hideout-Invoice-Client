import React, { useMemo } from 'react'
import { cn } from '@/shared/utils'
import { Separator } from '@/shared/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import type { RoomAvailability } from './AvailabilitySummary'

// ─── KPIStat ──────────────────────────────────────────────────────────────────

interface KPIStatProps {
  icon?: React.ElementType
  label: string
  value: React.ReactNode
  color?: string
  onClick?: () => void
}

function KPIStat({ icon: Icon, label, value, color = 'bg-muted-foreground', onClick }: KPIStatProps) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5',
        onClick && 'hover:bg-muted/50 -mx-1 px-1 rounded transition-colors',
      )}
    >
      {Icon ? (
        <Icon className="w-3 h-3 text-muted-foreground" />
      ) : (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', color)} />
      )}
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </Wrapper>
  )
}

// ─── KPIBar ───────────────────────────────────────────────────────────────────

interface KPIBarProps {
  roomTypes: RoomAvailability[]
  selectedRoomTypeId: string | null
  onSelectRoomType: (id: string | null) => void
  isLoading?: boolean
}

export const KPIBar = React.memo(function KPIBar({
  roomTypes,
  selectedRoomTypeId,
  onSelectRoomType,
  isLoading,
}: KPIBarProps) {
  const totals = useMemo(() => {
    const total     = roomTypes.reduce((s, r) => s + r.total_rooms, 0)
    const available = roomTypes.reduce((s, r) => s + r.available_rooms, 0)
    const occupied  = roomTypes.reduce((s, r) => s + r.occupied_rooms, 0)
    const occupancyPct = total > 0 ? Math.round((occupied / total) * 100) : 0
    return { total, available, occupied, occupancyPct }
  }, [roomTypes])

  if (isLoading && roomTypes.length === 0) {
    return (
      <div className="h-10 shrink-0 flex items-center px-3 border-b border-border-soft bg-card/50">
        <div className="w-48 h-4 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="h-10 shrink-0 flex items-center gap-4 px-3 border-b border-border-soft bg-card/50 text-xs tabular-nums overflow-x-auto">
      <KPIStat
        label="Occupancy"
        value={`${totals.occupancyPct}%`}
        color={totals.occupancyPct >= 90 ? 'bg-destructive' : 'bg-info'}
      />

      <Separator orientation="vertical" className="h-5" />

      <KPIStat
        label="ห้องว่าง"
        value={totals.available}
        color={totals.available === 0 ? 'bg-destructive' : 'bg-success'}
      />

      <Separator orientation="vertical" className="h-5" />

      <KPIStat
        label="ไม่ว่าง"
        value={totals.occupied}
        color="bg-warning"
      />

      <Separator orientation="vertical" className="h-5" />

      <KPIStat
        label="ทั้งหมด"
        value={totals.total}
        color="bg-muted-foreground/40"
      />

      {/* Room type filter dropdown */}
      <div className="ml-auto shrink-0">
        <Select
          value={selectedRoomTypeId ?? '__all__'}
          onValueChange={(v) => onSelectRoomType(v === '__all__' ? null : v)}
        >
          <SelectTrigger className="h-7 w-[120px] text-xs border-border-soft">
            <SelectValue placeholder="ทุกประเภท" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">ทุกประเภท</SelectItem>
            {roomTypes.map((rt) => (
              <SelectItem key={rt.room_type_id} value={rt.room_type_id}>
                {rt.room_type_name} ({rt.available_rooms})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
})
