import * as React from 'react'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Check, ChevronDown, ChevronUp, X, Search } from 'lucide-react'
import { cn } from '@/shared/utils'
import { useIsMobile } from '@/shared/hooks/useIsMobile'

// ─── Mobile Select Context ────────────────────────────────────────────────────

interface MobileSelectCtx {
  open: boolean
  setOpen: (v: boolean) => void
  value: string
  onValueChange: (v: string) => void
  /** Resolved display text for the selected value (set by SelectContent) */
  displayText: string
  setDisplayText: (text: string) => void
}

const MobileCtx = React.createContext<MobileSelectCtx | null>(null)

// ─── Select (Root) ────────────────────────────────────────────────────────────

interface SelectProps {
  children: React.ReactNode
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
  name?: string
  dir?: 'ltr' | 'rtl'
  required?: boolean
}

function Select({ children, value, defaultValue, onValueChange, open: openProp, onOpenChange, ...rest }: SelectProps) {
  const isMobile = useIsMobile()
  const [internalValue, setInternalValue] = useState(defaultValue ?? '')
  const [displayText, setDisplayText] = useState('')

  const currentValue = value ?? internalValue
  const handleValueChange = useCallback(
    (v: string) => {
      setInternalValue(v)
      onValueChange?.(v)
    },
    [onValueChange],
  )

  const [mobileOpen, setMobileOpen] = useState(false)
  const handleMobileOpen = useCallback(
    (v: boolean) => {
      setMobileOpen(v)
      onOpenChange?.(v)
    },
    [onOpenChange],
  )

  if (isMobile) {
    return (
      <MobileCtx.Provider
        value={{
          open: openProp ?? mobileOpen,
          setOpen: handleMobileOpen,
          value: currentValue,
          onValueChange: handleValueChange,
          displayText,
          setDisplayText,
        }}
      >
        {children}
      </MobileCtx.Provider>
    )
  }

  return (
    <SelectPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      open={openProp}
      onOpenChange={onOpenChange}
      {...rest}
    >
      {children}
    </SelectPrimitive.Root>
  )
}

const SelectGroup = SelectPrimitive.Group

// ─── SelectValue ──────────────────────────────────────────────────────────────
// On desktop: Radix's SelectValue. On mobile: reads from MobileCtx.

const SelectValue = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Value>
>(({ placeholder, className, ...props }, ref) => {
  const mobileCtx = React.useContext(MobileCtx)

  if (mobileCtx) {
    const text = mobileCtx.displayText
    return (
      <span ref={ref} className={cn('[&>span]:line-clamp-1', className)} {...props}>
        {text ? (
          <span>{text}</span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </span>
    )
  }

  return <SelectPrimitive.Value ref={ref} placeholder={placeholder} className={className} {...props} />
})
SelectValue.displayName = 'SelectValue'

// ─── SelectTrigger ────────────────────────────────────────────────────────────

const TRIGGER_BASE =
  'flex h-10 w-full items-center justify-between radius-button border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1'

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, disabled, ...props }, ref) => {
  const mobileCtx = React.useContext(MobileCtx)

  // On mobile: plain button that opens Sheet
  if (mobileCtx) {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        className={cn(TRIGGER_BASE, className)}
        onClick={(e) => {
          // Blur trigger so Radix Dialog can safely aria-hidden #root
          ;(e.currentTarget as HTMLElement).blur()
          mobileCtx.setOpen(true)
        }}
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    )
  }

  return (
    <SelectPrimitive.Trigger
      ref={ref}
      disabled={disabled}
      className={cn(TRIGGER_BASE, className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
})
SelectTrigger.displayName = 'SelectTrigger'

// ─── Desktop scroll buttons ──────────────────────────────────────────────────

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn('flex cursor-default items-center justify-center py-1', className)}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = 'SelectScrollUpButton'

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn('flex cursor-default items-center justify-center py-1', className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = 'SelectScrollDownButton'

// ─── SelectContent ────────────────────────────────────────────────────────────

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & {
    /** Title shown in mobile bottom sheet header */
    sheetTitle?: string
    /** Enable search in mobile bottom sheet (auto-enabled when > 6 items) */
    searchable?: boolean
  }
>(({ className, children, position = 'popper', sheetTitle, searchable, ...props }, ref) => {
  const mobileCtx = React.useContext(MobileCtx)

  // ── Mobile: bottom sheet ──────────────────────────────────────────────
  if (mobileCtx) {
    return (
      <MobileSelectSheet
        title={sheetTitle}
        searchable={searchable}
        value={mobileCtx.value}
        onValueChange={mobileCtx.onValueChange}
        open={mobileCtx.open}
        onOpenChange={mobileCtx.setOpen}
        setDisplayText={mobileCtx.setDisplayText}
      >
        {children}
      </MobileSelectSheet>
    )
  }

  // ── Desktop: Radix popper dropdown ────────────────────────────────────
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          'relative z-50 max-h-96 min-w-[8rem] overflow-hidden radius-card border border-border bg-card text-foreground shadow-popover data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          className,
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            'p-1',
            position === 'popper' &&
              'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
})
SelectContent.displayName = 'SelectContent'

// ─── Mobile Bottom Sheet ──────────────────────────────────────────────────────

interface OptionData {
  value: string
  label: string
  disabled?: boolean
}

/** Extract option data from SelectItem children (ReactElements with value prop) */
function extractOptions(children: React.ReactNode): OptionData[] {
  const options: OptionData[] = []

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return

    // SelectItem → has `value` prop
    if (child.props && typeof child.props === 'object' && 'value' in child.props) {
      const props = child.props as { value: string; disabled?: boolean; children?: React.ReactNode }
      let label = ''
      if (typeof props.children === 'string') {
        label = props.children
      } else if (typeof props.children === 'number') {
        label = String(props.children)
      } else {
        const parts: string[] = []
        React.Children.forEach(props.children, (c) => {
          if (typeof c === 'string' || typeof c === 'number') parts.push(String(c))
        })
        label = parts.join('') || props.value
      }
      options.push({ value: props.value, label, disabled: props.disabled })
    }

    // SelectGroup → recurse into its children
    if (child.props && typeof child.props === 'object' && 'children' in child.props) {
      const nested = (child.props as { children?: React.ReactNode }).children
      if (nested && !('value' in child.props)) {
        options.push(...extractOptions(nested))
      }
    }
  })

  return options
}

function MobileSelectSheet({
  children,
  title,
  searchable: searchableProp,
  value,
  onValueChange,
  open,
  onOpenChange,
  setDisplayText,
}: {
  children: React.ReactNode
  title?: string
  searchable?: boolean
  value: string
  onValueChange: (v: string) => void
  open: boolean
  onOpenChange: (v: boolean) => void
  setDisplayText: (text: string) => void
}) {
  const [search, setSearch] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  const options = useMemo(() => extractOptions(children), [children])
  const isSearchable = searchableProp ?? options.length > 6

  // Sync display text for the trigger whenever value or options change
  useEffect(() => {
    const matched = options.find((o) => o.value === value)
    setDisplayText(matched?.label ?? '')
  }, [value, options, setDisplayText])

  const filtered = useMemo(() => {
    if (!search) return options
    const q = search.toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, search])

  // Auto-scroll to selected item when sheet opens
  useEffect(() => {
    if (open && selectedRef.current) {
      const timer = setTimeout(() => {
        selectedRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 280)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Reset search on close
  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  const handleSelect = useCallback(
    (v: string) => {
      onValueChange(v)
      onOpenChange(false)
    },
    [onValueChange, onOpenChange],
  )

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Backdrop */}
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-background/60 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
        />

        {/* Sheet */}
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex flex-col',
            'max-h-[85vh] rounded-t-2xl border-t border-border bg-card shadow-xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            'data-[state=closed]:duration-200 data-[state=open]:duration-250',
          )}
          onOpenAutoFocus={(e) => {
            if (!isSearchable) e.preventDefault()
          }}
        >
          {/* ── Drag handle ────────────────────────────────── */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
          </div>

          {/* ── Header ─────────────────────────────────────── */}
          <div className="flex items-center justify-between px-5 pb-3 shrink-0">
            <DialogPrimitive.Title className="text-base font-semibold text-foreground">
              {title || 'เลือกรายการ'}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">ปิด</span>
            </DialogPrimitive.Close>
          </div>

          <DialogPrimitive.Description className="sr-only">
            เลือกตัวเลือกจากรายการด้านล่าง
          </DialogPrimitive.Description>

          {/* ── Search ─────────────────────────────────────── */}
          {isSearchable && (
            <div className="px-4 pb-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหา…"
                  className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  autoComplete="off"
                  autoCorrect="off"
                />
              </div>
            </div>
          )}

          {/* ── Divider ────────────────────────────────────── */}
          <div className="h-px bg-border shrink-0" />

          {/* ── Options list ───────────────────────────────── */}
          <div
            ref={listRef}
            role="listbox"
            aria-label={title || 'เลือกรายการ'}
            className="flex-1 overflow-y-auto overscroll-contain px-2 py-2"
            style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
          >
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Search className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">ไม่พบรายการ</p>
              </div>
            ) : (
              filtered.map((option) => {
                const isSelected = option.value === value
                return (
                  <button
                    key={option.value}
                    ref={isSelected ? selectedRef : undefined}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-4 min-h-[3rem] py-3 text-left transition-colors',
                      'active:bg-accent/80',
                      isSelected
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-accent',
                      option.disabled && 'opacity-40 pointer-events-none',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border',
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <span className="flex-1 text-[15px] leading-snug">{option.label}</span>
                  </button>
                )
              })
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

// ─── SelectLabel ──────────────────────────────────────────────────────────────

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('py-1.5 pl-8 pr-2 text-xs font-semibold text-muted-foreground', className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

// ─── SelectItem ───────────────────────────────────────────────────────────────
// On desktop: Radix item. On mobile: just a data carrier (not rendered visually).

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => {
  const mobileCtx = React.useContext(MobileCtx)

  // On mobile, SelectItem is only used for data extraction by MobileSelectSheet.
  // Return null — the Sheet renders its own option buttons.
  if (mobileCtx) return null

  return (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-md py-2 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
})
SelectItem.displayName = SelectPrimitive.Item.displayName

// ─── SelectSeparator ──────────────────────────────────────────────────────────

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-border', className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

// ─── Exports ──────────────────────────────────────────────────────────────────

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
