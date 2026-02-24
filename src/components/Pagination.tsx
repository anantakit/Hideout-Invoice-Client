import { cn } from '../lib/utils'

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

  // Build page number window: always show first, last, and ±2 around current
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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-gray-100">
      {/* Summary + per-page selector */}
      <div className="flex items-center gap-3 text-sm text-gray-500 order-2 sm:order-1">
        <span>
          {total > 0 ? `${from}–${to} จาก ${total} รายการ` : 'ไม่มีรายการ'}
        </span>
        <select
          value={limit}
          onChange={(e) => { onLimitChange(Number(e.target.value)); onPageChange(1) }}
          className="input !py-1 !px-2 w-auto text-xs"
        >
          {LIMITS.map((l) => (
            <option key={l} value={l}>{l} ต่อหน้า</option>
          ))}
        </select>
      </div>

      {/* Page controls */}
      <div className="flex items-center gap-1 order-1 sm:order-2">
        {/* Desktop: numbered pages */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              page === 1
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            ←
          </button>

          {pageNums.map((n, i) =>
            n === '...' ? (
              <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm select-none">…</span>
            ) : (
              <button
                key={n}
                onClick={() => onPageChange(n as number)}
                className={cn(
                  'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                  n === page
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {n}
              </button>
            )
          )}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              page === totalPages
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            →
          </button>
        </div>

        {/* Mobile: prev | page/total | next */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="btn-secondary text-xs disabled:opacity-40 px-3 py-1.5"
          >
            ← ก่อนหน้า
          </button>
          <span className="text-sm text-gray-600 whitespace-nowrap">
            {page}/{totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="btn-secondary text-xs disabled:opacity-40 px-3 py-1.5"
          >
            ถัดไป →
          </button>
        </div>
      </div>
    </div>
  )
}
