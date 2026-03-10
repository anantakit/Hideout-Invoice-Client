import * as React from 'react'
import { cn } from '@/shared/utils'

// ─── Context ─────────────────────────────────────────────────────────────────

interface RadioCardCtx {
  value: string
  onValueChange: (value: string) => void
}

const Ctx = React.createContext<RadioCardCtx | null>(null)

// ─── RadioCardGroup ──────────────────────────────────────────────────────────

interface RadioCardGroupProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

function RadioCardGroup({ value, onValueChange, children, className }: RadioCardGroupProps) {
  const ctx = React.useMemo(() => ({ value, onValueChange }), [value, onValueChange])
  return (
    <Ctx.Provider value={ctx}>
      <div role="radiogroup" className={cn('space-y-2', className)}>
        {children}
      </div>
    </Ctx.Provider>
  )
}

// ─── RadioCardItem ───────────────────────────────────────────────────────────

interface RadioCardItemProps {
  value: string
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

function RadioCardItem({ value, children, className, disabled }: RadioCardItemProps) {
  const ctx = React.useContext(Ctx)
  if (!ctx) throw new Error('RadioCardItem must be used inside RadioCardGroup')

  const selected = ctx.value === value

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        'flex items-center gap-3 w-full rounded-lg border px-3 py-3 text-left transition-colors',
        selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/40',
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
    >
      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          selected ? 'border-primary bg-primary' : 'border-muted-foreground/40',
        )}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </button>
  )
}

export { RadioCardGroup, RadioCardItem }
