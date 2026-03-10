import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/shared/utils'

interface CheckboxCardProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

function CheckboxCard({ checked, onCheckedChange, children, className, disabled }: CheckboxCardProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'flex items-center gap-3 w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
        checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/40',
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
    >
      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
          checked ? 'border-primary bg-primary' : 'border-muted-foreground/40',
        )}
      >
        {checked && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </button>
  )
}

export { CheckboxCard }
