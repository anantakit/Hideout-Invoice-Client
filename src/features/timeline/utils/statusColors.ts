const STATUS_COLOR_MAP: Record<string, string> = {
  CONFIRMED:             'bg-bk-reserved text-bk-reserved-foreground',
  RESERVED:              'bg-bk-reserved text-bk-reserved-foreground',
  ASSIGNED:              'bg-bk-reserved text-bk-reserved-foreground',
  PARTIALLY_CHECKED_IN:  'bg-bk-reserved text-bk-reserved-foreground',
  CHECKED_IN:            'bg-bk-checked-in text-bk-checked-in-foreground',
  CHECKED_OUT:           'bg-bk-checked-out text-bk-checked-out-foreground',
  NO_SHOW:               'bg-bk-no-show text-bk-no-show-foreground',
  CANCELLED:             'bg-bk-cancelled/30 text-bk-cancelled-foreground',
}

const FALLBACK_STATUS_COLOR = 'bg-secondary text-secondary-foreground'

export function getStatusColorClass(status: string): string {
  return STATUS_COLOR_MAP[status] ?? FALLBACK_STATUS_COLOR
}
