import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/utils'

interface RoomTypeAvailabilityRowProps {
  name: string
  available: number
  total: number
}

export function RoomTypeAvailabilityRow({ name, available, total }: RoomTypeAvailabilityRowProps) {
  const isFull = available === 0
  const isLow = !isFull && (total >= 5 ? available / total <= 0.20 : available === 1)

  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-foreground">{name}</span>
      <div className="flex items-center gap-2">
        {isFull ? (
          <Badge variant="destructive" className="text-xs">เต็ม</Badge>
        ) : isLow ? (
          <Badge variant="amber" className="text-xs">ใกล้เต็ม</Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">{available} ว่าง</Badge>
        )}
        <span className={cn(
          'text-sm font-semibold tabular-nums w-8 text-right',
          isFull ? 'text-destructive' : 'text-foreground',
        )}>
          {available}
        </span>
      </div>
    </div>
  )
}
