import { Button } from './button'

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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-border">
      <div className="flex items-center gap-3 text-sm text-muted-foreground order-2 sm:order-1">
        <span>
          {total > 0 ? `${from}–${to} จาก ${total} รายการ` : 'ไม่มีรายการ'}
        </span>
        <select
          value={limit}
          onChange={(e) => { onLimitChange(Number(e.target.value)); onPageChange(1) }}
          className="h-8 rounded-lg border border-input bg-card px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {LIMITS.map((l) => (
            <option key={l} value={l}>{l} ต่อหน้า</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1 order-1 sm:order-2">
        <div className="hidden sm:flex items-center gap-1">
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
                className="w-8 h-8"
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

        <div className="flex sm:hidden items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            ← ก่อนหน้า
          </Button>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {page}/{totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
          >
            ถัดไป →
          </Button>
        </div>
      </div>
    </div>
  )
}
