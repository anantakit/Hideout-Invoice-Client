import { cn } from '@/lib/utils'

interface BottomBarProps {
  children: React.ReactNode
  className?: string
}

/**
 * Mobile-only fixed bottom action bar.
 * Hidden on md and above (md:hidden).
 * Handles safe-area inset automatically.
 * Place inside a React fragment alongside page content.
 */
export function BottomBar({ children, className }: BottomBarProps) {
  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0',
        'bg-background/95 backdrop-blur border-t border-border',
        'px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]',
        'md:hidden',
        'animate-in fade-in slide-in-from-bottom-2 duration-150',
        'space-y-2',
        className,
      )}
    >
      {children}
    </div>
  )
}
