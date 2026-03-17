import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/utils'

/**
 * Tappable card surface — use for full-width, multi-line interactive cards
 * (expand/collapse, room selection, check-in cards, booking cards).
 *
 * Unlike `<Button>` (which has `inline-flex justify-center whitespace-nowrap`),
 * CardButton uses `flex text-left` so complex card content renders correctly.
 *
 * For small single-line actions (icon buttons, text links, filter chips),
 * keep using `<Button>`.
 */

const cardButtonVariants = cva(
  [
    'w-full flex flex-col text-left transition-colors cursor-pointer',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'radius-card border border-border bg-card hover:bg-accent/10 active:bg-accent/20',
        ghost: 'radius-card hover:bg-accent/10 active:bg-accent/20',
        outline: 'radius-card border border-border hover:bg-accent/10 active:bg-accent/20',
      },
      padding: {
        default: 'px-3 py-2.5',
        card: 'px-4 py-3',
        compact: 'px-3 py-2',
        none: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'default',
    },
  },
)

export interface CardButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof cardButtonVariants> {}

const CardButton = React.forwardRef<HTMLButtonElement, CardButtonProps>(
  ({ className, variant, padding, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(cardButtonVariants({ variant, padding, className }))}
        {...props}
      />
    )
  },
)
CardButton.displayName = 'CardButton'

export { CardButton, cardButtonVariants }
