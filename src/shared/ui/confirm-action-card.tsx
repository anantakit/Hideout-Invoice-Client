import * as React from 'react'
import { useState } from 'react'
import { cn } from '@/shared/utils'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from './alert-dialog'

interface ConfirmActionCardProps {
  /** Card content (left side). */
  children: React.ReactNode
  /** Icon shown on the right as action affordance. Hidden when disabled. */
  icon?: React.ReactNode
  /** Loading indicator replaces icon when true. */
  loading?: boolean
  /** Loader element shown when `loading` is true. */
  loader?: React.ReactNode
  disabled?: boolean
  /** AlertDialog title. */
  confirmTitle: string
  /** AlertDialog description. */
  confirmDescription: string
  /** AlertDialog action button label. */
  confirmLabel: string
  /** Called when user confirms in the dialog. */
  onConfirm: () => void
  className?: string
}

/**
 * A card-styled button that opens an AlertDialog for confirmation before
 * executing an action. Used for check-in, check-out, and similar operations.
 *
 * Renders as a `<button>` with Card-consistent styling (radius, border,
 * shadow) plus hover/active states to indicate interactivity.
 */
const ConfirmActionCard = React.forwardRef<HTMLButtonElement, ConfirmActionCardProps>(
  (
    {
      children,
      icon,
      loading,
      loader,
      disabled,
      confirmTitle,
      confirmDescription,
      confirmLabel,
      onConfirm,
      className,
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false)

    return (
      <>
        <button
          ref={ref}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(true)}
          className={cn(
            'w-full flex items-center gap-3 radius-card border border-border bg-card text-card-foreground shadow-card',
            'px-3 py-2.5 text-left transition-colors',
            !disabled && 'hover:bg-accent/10 active:bg-accent/20 cursor-pointer',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className,
          )}
        >
          <div className="flex-1 min-w-0">{children}</div>
          {loading
            ? (loader ?? null)
            : !disabled && icon
              ? <div className="shrink-0">{icon}</div>
              : null}
        </button>

        <AlertDialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onConfirm()
                  setOpen(false)
                }}
              >
                {confirmLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  },
)
ConfirmActionCard.displayName = 'ConfirmActionCard'

export { ConfirmActionCard }
export type { ConfirmActionCardProps }
