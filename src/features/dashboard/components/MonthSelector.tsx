import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../../shared/ui/button'

interface Props {
  month: string // YYYY-MM
  onChange: (month: string) => void
}

const MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

function parseMonth(month: string) {
  const [y, m] = month.split('-').map(Number)
  return { year: y, month: m }
}

function formatMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function MonthSelector({ month, onChange }: Props) {
  const { year, month: m } = parseMonth(month)
  const thaiYear = year + 543

  function shift(delta: number) {
    const d = new Date(year, m - 1 + delta, 1)
    onChange(formatMonth(d.getFullYear(), d.getMonth() + 1))
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={() => shift(-1)} className="h-8 w-8">
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-sm font-medium text-foreground min-w-[140px] text-center">
        {MONTH_NAMES[m - 1]} {thaiYear}
      </span>
      <Button variant="ghost" size="icon" onClick={() => shift(1)} className="h-8 w-8">
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  )
}
