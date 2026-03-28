import { Button } from './button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'

interface Props {
  page: number
  totalPages: number
  total: number
  limit: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

const LIMITS = [10, 20, 50]

export default function Pagination({ page, totalPages, total, limit, onPageChange, onLimitChange }: Props) {
  if (totalPages <= 1 && total <= LIMITS[0]) return null

  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  const pageNums: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNums.push(i)
  } else {
    const left = Math.max(2, page - 1)
    const right = Math.min(totalPages - 1, page + 1)
    pageNums.push(1)
    if (left > 2) pageNums.push('...')
    for (let i = left; i <= right; i++) pageNums.push(i)
    if (right < totalPages - 1) pageNums.push('...')
    pageNums.push(totalPages)
  }

  return (
    <div className="border-t border-border px-4 sm:px-6 py-4">

      {/* ── Desktop ─────────────────────────────────────────────────── */}
      <div className="hidden sm:flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            {total > 0 ? `${from}–${to} จาก ${total} รายการ` : 'ไม่มีรายการ'}
          </span>
          <Select
            value={String(limit)}
            onValueChange={(v) => { onLimitChange(Number(v)); onPageChange(1) }}
          >
            <SelectTrigger className="h-9 w-28 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIMITS.map((l) => (
                <SelectItem key={l} value={String(l)}>{l} ต่อหน้า</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            ←
          </Button>

          {pageNums.map((n, i) =>
            n === '...' ? (
              <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-sm select-none">…</span>
            ) : (
              <Button
                key={n}
                variant={n === page ? 'default' : 'ghost'}
                size="icon"
                className="w-9 h-9 min-h-11 min-w-11"
                onClick={() => onPageChange(n as number)}
              >
                {n}
              </Button>
            )
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
          >
            →
          </Button>
        </div>
      </div>

      {/* ── Mobile: compact single row ──────────────────────────────── */}
      <div className="flex sm:hidden items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {total > 0 ? `${from}–${to} จาก ${total}` : 'ไม่มีรายการ'}
        </span>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 min-h-11 min-w-11"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            ←
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums min-w-12 text-center">
            {page}/{totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 min-h-11 min-w-11"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
          >
            →
          </Button>
        </div>
      </div>
    </div>
  )
}
