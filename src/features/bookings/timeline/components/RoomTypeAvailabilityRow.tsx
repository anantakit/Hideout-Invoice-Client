import { cn } from '@/shared/utils'

interface RoomTypeAvailabilityRowProps {
  name: string
  available: number
  total: number
}

export function RoomTypeAvailabilityRow({ name, available, total }: RoomTypeAvailabilityRowProps) {
  const isFull = available === 0

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-body text-foreground">{name}</span>
      <span className={cn(
        'text-body font-semibold tabular-nums',
        isFull ? 'text-destructive' : 'text-foreground',
      )}>
        {available}/{total}
      </span>
    </div>
  )
}
