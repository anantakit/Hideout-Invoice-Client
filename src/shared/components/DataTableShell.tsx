import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Plus, Search } from 'lucide-react'
import { Card } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Fab } from '@/shared/ui/Fab'
import { Skeleton } from '@/shared/ui/skeleton'
import Pagination from '@/shared/ui/Pagination'

// ── Types ────────────────────────────────────────────────────────────────────

interface AddAction {
  label: string
  onClick?: () => void
  to?: string
}

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  limit: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

interface DataTableShellProps {
  /** Page title (h1) */
  title: string
  /** Subtitle text — pass null while loading to show "กำลังโหลด…" */
  subtitle: string | null
  /** Search input placeholder */
  searchPlaceholder: string
  searchInput: string
  onSearchChange: (value: string) => void

  /** Desktop header button + mobile FAB */
  addAction: AddAction

  /** Data states */
  isLoading: boolean
  isFetching: boolean
  isEmpty: boolean

  /** Empty state messaging */
  emptyMessage: string
  emptySearchMessage: string
  emptyAction?: ReactNode

  /** Extra filter controls rendered below the search input */
  filterSlot?: ReactNode

  /** Pagination — spread from useDataTable().paginationProps */
  pagination: PaginationProps

  /** Override max width (default: max-w-7xl) */
  maxWidth?: string

  /** Table content — rendered inside the Card when data is available */
  children: ReactNode
}

// ── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24 hidden sm:block" />
          <Skeleton className="h-4 w-20 hidden md:block" />
          <Skeleton className="h-8 w-8 rounded-md ml-auto" />
        </div>
      ))}
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export function DataTableShell({
  title,
  subtitle,
  searchPlaceholder,
  searchInput,
  onSearchChange,
  addAction,
  isLoading,
  isFetching,
  isEmpty,
  emptyMessage,
  emptySearchMessage,
  emptyAction,
  filterSlot,
  pagination,
  maxWidth = 'max-w-7xl',
  children,
}: DataTableShellProps) {
  const hasSearch = searchInput.length > 0

  return (
    <>
      <div className={`px-4 py-6 sm:px-6 lg:px-8 ${maxWidth} mx-auto pb-24 md:pb-6`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-section text-2xl">{title}</h1>
            <p className="text-helper mt-1">
              {subtitle ?? 'กำลังโหลด…'}
            </p>
          </div>
          {addAction.to ? (
            <Button asChild className="hidden md:inline-flex">
              <Link to={addAction.to}>
                <Plus className="w-4 h-4" />
                {addAction.label}
              </Link>
            </Button>
          ) : (
            <Button onClick={addAction.onClick} className="hidden md:inline-flex">
              <Plus className="w-4 h-4" />
              {addAction.label}
            </Button>
          )}
        </div>

        {/* Search + filters */}
        <div className="bg-card radius-card border border-border p-4 mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              className="pl-9"
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          {filterSlot}
        </div>

        {/* Content card */}
        <Card className="overflow-hidden">
          {isLoading ? (
            <LoadingSkeleton />
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <p className="text-sm">
                {hasSearch ? emptySearchMessage : emptyMessage}
              </p>
              {!hasSearch && emptyAction}
            </div>
          ) : (
            <div className={`transition-opacity duration-150 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
              {children}
              <Pagination {...pagination} />
            </div>
          )}
        </Card>
      </div>

      {addAction.to ? (
        <Fab to={addAction.to} label={addAction.label} />
      ) : (
        <Fab onClick={addAction.onClick} label={addAction.label} />
      )}
    </>
  )
}
