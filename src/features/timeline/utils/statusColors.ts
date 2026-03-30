const STATUS_COLOR_MAP: Record<string, string> = {
  CONFIRMED:             'bk-block bk-accent-reserved text-foreground',
  RESERVED:              'bk-block bk-accent-reserved text-foreground',
  ASSIGNED:              'bk-block bk-accent-reserved text-foreground',
  PARTIALLY_CHECKED_IN:  'bk-block bk-accent-reserved text-foreground',
  CHECKED_IN:            'bk-block bk-accent-checked-in text-foreground',
  CHECKED_OUT:           'bk-block bk-accent-checked-out text-foreground',
  NO_SHOW:               'bk-block bk-accent-no-show text-foreground',
  CANCELLED:             'bk-block text-muted-foreground',
}

const FALLBACK_STATUS_COLOR = 'bg-secondary text-secondary-foreground'

export function getStatusColorClass(status: string): string {
  return STATUS_COLOR_MAP[status] ?? FALLBACK_STATUS_COLOR
}
