import { cn } from '@/shared/utils'
import type { LucideIcon } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ToggleOption<T extends string> {
  value: T
  label: string
  desc?: string
  Icon?: LucideIcon
}

export interface ToggleGroupProps<T extends string> {
  options: readonly ToggleOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Grid columns. Default: options.length (auto-fit). */
  columns?: number
  /** When true, grid columns are controlled via className (no inline style). */
  responsiveColumns?: boolean
  /** Compact mode: single-line without description. */
  compact?: boolean
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Reusable toggle-button group.
 *
 * Selected state uses `border-primary bg-primary/15 text-primary`.
 * Supports optional icon and description per option.
 */
export function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
  columns,
  responsiveColumns = false,
  compact = false,
  className,
}: ToggleGroupProps<T>) {
  const gridStyle = responsiveColumns
    ? undefined
    : { gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }

  return (
    <div
      className={cn('grid gap-2', className)}
      style={gridStyle}
    >
      {options.map((opt) => {
        const selected = value === opt.value

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'radius-card border text-left transition-colors cursor-pointer',
              compact
                ? 'px-2 py-2 text-center'
                : opt.Icon
                  ? 'flex items-center gap-2.5 px-3 py-2.5'
                  : 'flex flex-col items-center gap-0.5 px-3 py-2 text-center',
              selected
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border text-muted-foreground hover:border-muted-foreground/50',
            )}
          >
            {opt.Icon && <opt.Icon className="w-4 h-4 shrink-0" />}
            <div className="min-w-0">
              <span className={cn(
                'block leading-tight font-semibold',
                compact ? 'text-xs' : 'text-xs',
              )}>
                {opt.label}
              </span>
              {!compact && opt.desc && (
                <span className="text-[11px] leading-tight block opacity-80">{opt.desc}</span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
