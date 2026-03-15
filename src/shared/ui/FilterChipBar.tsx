import { cn } from '../utils'

export interface FilterChip<K extends string = string> {
  key: K
  label: string
}

interface FilterChipBarProps<K extends string = string> {
  chips: readonly FilterChip<K>[]
  activeKey: K
  onSelect: (key: K) => void
  /** Extra elements rendered after chips (e.g. custom range button) */
  children?: React.ReactNode
}

export function FilterChipBar<K extends string = string>({
  chips,
  activeKey,
  onSelect,
  children,
}: FilterChipBarProps<K>) {
  return (
    <div className="relative">
      {/* Gradient scroll-hint — mobile only */}
      <div
        aria-hidden
        className="absolute right-0 top-0 bottom-0.5 w-10 bg-gradient-to-l from-card to-transparent pointer-events-none z-10 sm:hidden"
      />

      {/* Scrollable chip row — horizontal on mobile, wraps on desktop */}
      <div
        className="flex gap-1.5 overflow-x-auto sm:flex-wrap sm:overflow-visible pb-0.5 scrollbar-hide"
      >
        {chips.map((chip) => {
          const isActive = activeKey === chip.key
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => onSelect(chip.key)}
              className={cn(
                'h-8 px-3.5 rounded-lg text-[13px] font-medium shrink-0 whitespace-nowrap',
                'transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-[0_1px_3px_rgba(91,124,250,0.35)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/60 active:bg-accent/80',
              )}
            >
              {chip.label}
            </button>
          )
        })}
        {children}
      </div>
    </div>
  )
}
