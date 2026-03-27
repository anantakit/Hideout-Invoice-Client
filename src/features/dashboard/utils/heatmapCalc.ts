import type { DailyRevenueEntry } from '../types'

export interface CalendarDay {
  day: number | null
  amount: number
  isToday: boolean
  isFuture: boolean
}

/** 5-level intensity: 0 = no revenue, 1-4 = ratio-based */
export function getIntensityClass(amount: number, max: number): string {
  if (amount <= 0) return 'bg-muted/50'
  const ratio = amount / max
  if (ratio <= 0.25) return 'bg-primary/20'
  if (ratio <= 0.5) return 'bg-primary/40'
  if (ratio <= 0.75) return 'bg-primary/65'
  return 'bg-primary'
}

/**
 * Build a Mon-start calendar grid for a given year/month,
 * filling each day cell with revenue data and today/future flags.
 */
export function buildCalendarGrid(
  year: number,
  monthIdx: number,
  data: DailyRevenueEntry[],
): CalendarDay[][] {
  const dayMap = new Map<number, number>()
  for (const d of data) {
    dayMap.set(d.day, d.amount)
  }

  const now = new Date()
  const todayYear = now.getFullYear()
  const todayMonth = now.getMonth()
  const todayDate = now.getDate()

  const firstDay = new Date(year, monthIdx, 1)
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate()
  // JS: 0=Sun → convert to Mon=0
  const startDow = (firstDay.getDay() + 6) % 7

  const weeks: CalendarDay[][] = []
  let currentWeek: CalendarDay[] = Array.from({ length: startDow }, () => ({
    day: null,
    amount: 0,
    isToday: false,
    isFuture: false,
  }))

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIdx, day)
    const todayRef = new Date(todayYear, todayMonth, todayDate)

    currentWeek.push({
      day,
      amount: dayMap.get(day) ?? 0,
      isToday: year === todayYear && monthIdx === todayMonth && day === todayDate,
      isFuture: d > todayRef,
    })

    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ day: null, amount: 0, isToday: false, isFuture: false })
    }
    weeks.push(currentWeek)
  }

  return weeks
}
