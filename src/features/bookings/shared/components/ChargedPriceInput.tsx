import { useState, useEffect } from 'react'
import { Tag, X } from 'lucide-react'
import { cn, formatTHB } from '@/shared/utils'
import { Input } from '@/shared/ui/input'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChargedPriceEntry {
  /** Unique key for the entry (roomId, stayKey, or item index). */
  key: string
  /** Display label (e.g. room number or room type name). */
  label: string
  /** Rack rate for this entry. */
  rackPrice: number
  /** Current charged price — undefined means no discount. */
  chargedPrice?: number
}

export interface ChargedPriceSingleProps {
  /** Rack rate to show as reference / placeholder. */
  rackPrice: number
  /** Current charged price — undefined means collapsed (no discount). */
  chargedPrice?: number
  /** Callback when charged price changes. undefined = remove discount. */
  onChange: (value: number | undefined) => void
  className?: string
}

export interface ChargedPriceMultiProps {
  entries: ChargedPriceEntry[]
  onChange: (key: string, value: number | undefined) => void
  /** Clear all discounts and collapse. */
  onClearAll: () => void
  className?: string
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const PRICE_INPUT_CLASS = cn(
  'h-9 w-28 tabular-nums',
  '[appearance:textfield]',
  '[&::-webkit-inner-spin-button]:appearance-none',
  '[&::-webkit-outer-spin-button]:appearance-none',
)

const TOGGLE_BUTTON_CLASS =
  'flex items-center gap-1.5 text-caption text-muted-foreground hover:text-primary transition-colors cursor-pointer touch-target'

const CLEAR_BUTTON_CLASS =
  'flex items-center justify-center touch-target-square -mr-2 text-muted-foreground hover:text-destructive transition-colors cursor-pointer'

// ─── Discount badge (rack → charged) ─────────────────────────────────────────

function DiscountBadge({ rackPrice, chargedPrice }: { rackPrice: number; chargedPrice: number }) {
  if (chargedPrice >= rackPrice) return null
  return (
    <span className="text-helper">
      <span className="line-through">{formatTHB(rackPrice)}</span>
      {' → '}
      <span className="text-primary font-medium">{formatTHB(chargedPrice)}</span>
    </span>
  )
}

// ─── Single-entry variant ─────────────────────────────────────────────────────

/**
 * Collapsible charged-price input for a single room-type group.
 *
 * Used in CreateBookingPage (RoomTypeBookingBuilder) and AddStayPanel.
 */
export function ChargedPriceInput({
  rackPrice,
  chargedPrice,
  onChange,
  className,
}: ChargedPriceSingleProps) {
  const [expanded, setExpanded] = useState(chargedPrice != null)

  // Sync: if chargedPrice becomes non-null from outside (e.g. prefill), expand
  useEffect(() => {
    if (chargedPrice != null) setExpanded(true)
  }, [chargedPrice])

  if (!expanded) {
    return (
      <div className={className}>
        <button type="button" className={TOGGLE_BUTTON_CLASS} onClick={() => {
          setExpanded(true)
          onChange(rackPrice)
        }}>
          <Tag className="icon-xs" />
          ราคาพิเศษ
        </button>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Tag className="icon-sm text-primary shrink-0" />
      <Input
        type="number"
        min={1}
        step="any"
        placeholder={rackPrice.toString()}
        className={PRICE_INPUT_CLASS}
        value={chargedPrice ?? ''}
        onChange={(e) => {
          const v = parseFloat(e.target.value)
          onChange(isNaN(v) ? undefined : v)
        }}
      />
      <span className="text-helper">/คืน</span>
      <DiscountBadge rackPrice={rackPrice} chargedPrice={chargedPrice ?? rackPrice} />
      <button type="button" className={CLEAR_BUTTON_CLASS} onClick={() => {
        setExpanded(false)
        onChange(undefined)
      }}>
        <X className="icon-sm" />
      </button>
    </div>
  )
}

// ─── Multi-entry variant ──────────────────────────────────────────────────────

/**
 * Collapsible charged-price inputs for multiple rooms.
 *
 * Used in OperationsDrawer (timeline quick-booking with multi-room).
 */
export function ChargedPriceMulti({
  entries,
  onChange,
  onClearAll,
  className,
}: ChargedPriceMultiProps) {
  const hasAny = entries.some((e) => e.chargedPrice != null)
  const [expanded, setExpanded] = useState(false)

  if (!expanded && !hasAny) {
    return (
      <div className={className}>
        <button type="button" className={TOGGLE_BUTTON_CLASS} onClick={() => setExpanded(true)}>
          <Tag className="icon-xs" />
          ราคาพิเศษ
        </button>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <p className="text-micro-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <Tag size={11} />
          ราคาพิเศษ
        </p>
        <button
          type="button"
          className={CLEAR_BUTTON_CLASS}
          onClick={() => {
            setExpanded(false)
            onClearAll()
          }}
        >
          <X className="icon-sm" />
        </button>
      </div>

      {entries.map((entry) => (
        <div key={entry.key} className="flex items-center gap-2">
          <span className="text-caption text-muted-foreground w-10 shrink-0 tabular-nums">
            {entry.label}
          </span>
          <Input
            type="number"
            min={1}
            step="any"
            placeholder={entry.rackPrice.toString()}
            className={PRICE_INPUT_CLASS}
            value={entry.chargedPrice ?? ''}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              onChange(entry.key, isNaN(v) ? undefined : v)
            }}
          />
          <span className="text-helper">/คืน</span>
          <DiscountBadge rackPrice={entry.rackPrice} chargedPrice={entry.chargedPrice ?? entry.rackPrice} />
        </div>
      ))}
    </div>
  )
}
