import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { cn } from '@/shared/utils'

interface FabProps {
  /** Navigation target — renders as Link when provided */
  to?: string
  /** Click handler — used when `to` is not provided */
  onClick?: () => void
  /** Custom icon — defaults to Plus */
  icon?: React.ReactNode
  /** Accessible label */
  label: string
  /** Disable the button */
  disabled?: boolean
  className?: string
}

/**
 * Mobile-only Floating Action Button for list pages.
 * Portaled to document.body so it sits outside any scroll container.
 * Fixed bottom-right, respects safe-area, scroll-reactive.
 * Hidden on md+ where header buttons handle the action.
 */
export function Fab({ to, onClick, icon, label, disabled, className, ref }: FabProps & { ref?: React.Ref<HTMLElement> }) {
  const [scrolled, setScrolled] = useState(false)
  const lastY = useRef(0)

  // Listen on the scroll container (Layout's overflow-auto div), not window
  useEffect(() => {
    const scroller =
      document.querySelector<HTMLElement>('[data-scroll-region]') ?? window

    const onScroll = () => {
      const y =
        scroller instanceof HTMLElement ? scroller.scrollTop : window.scrollY
      setScrolled(y > lastY.current && y > 80)
      lastY.current = y
    }

    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [])

  const classes = cn(
    // layout — fixed to viewport
    'fixed z-50 md:hidden',
    'bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-4',
    // size & shape — circular, 56px
    'w-14 h-14 rounded-full',
    'flex items-center justify-center',
    // colors — tokens only
    'bg-primary text-primary-foreground',
    // elevation — layered shadow for floating feel
    'shadow-[0_4px_14px_-2px] shadow-primary/25',
    'ring-1 ring-primary/10',
    // scroll reaction
    'transition-[transform,opacity] duration-200 ease-out',
    scrolled ? 'scale-90 opacity-80' : 'scale-100 opacity-100',
    // tap
    'active:scale-90',
    // focus
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    // entrance
    'animate-in fade-in slide-in-from-bottom-4 duration-300',
    // disabled
    disabled && 'opacity-50 pointer-events-none',
    className,
  )

  const content = icon ?? <Plus className="w-6 h-6" strokeWidth={2.5} />

  const fab = to ? (
    <Link
      ref={ref as React.Ref<HTMLAnchorElement>}
      to={to}
      className={classes}
      aria-label={label}
    >
      {content}
    </Link>
  ) : (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={classes}
      aria-label={label}
    >
      {content}
    </button>
  )

  return createPortal(fab, document.body)
}
