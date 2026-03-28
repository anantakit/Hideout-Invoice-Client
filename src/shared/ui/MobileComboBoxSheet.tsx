import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Search, X } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useDebounce } from '../hooks/useDebounce'
import { cn } from '../utils'

interface MobileComboBoxSheetProps<T extends object> {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  value: string
  displayLabel: string
  placeholder: string
  sheetTitle: string
  disabled?: boolean
  error?: boolean
  items: T[]
  isLoading: boolean
  valueKey: keyof T
  labelKey: keyof T
  onSelect: (item: T) => void
  onSearchChange: (search: string) => void
}

export function MobileComboBoxSheet<T extends object>({
  isOpen,
  onOpenChange,
  value,
  displayLabel,
  placeholder,
  sheetTitle,
  disabled,
  error,
  items,
  isLoading,
  valueKey,
  labelKey,
  onSelect,
  onSearchChange,
}: MobileComboBoxSheetProps<T>) {
  const [mobileSearch, setMobileSearch] = useState('')
  const debouncedSearch = useDebounce(mobileSearch, 300)
  const selectedRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      setMobileSearch('')
      requestAnimationFrame(() => {
        selectedRef.current?.scrollIntoView({ block: 'center' })
      })
    }
  }, [isOpen])

  useEffect(() => {
    onSearchChange(debouncedSearch)
  }, [debouncedSearch, onSearchChange])

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onOpenChange(true)}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-2 radius-button border border-input bg-background px-3 text-sm',
          'transition-colors',
          displayLabel ? 'text-foreground' : 'text-muted-foreground',
          error && 'border-destructive',
          disabled && 'opacity-50 pointer-events-none',
        )}
      >
        <span className="flex-1 truncate text-left">
          {displayLabel || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
      </button>

      <DialogPrimitive.Root open={isOpen} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            )}
          />

          <DialogPrimitive.Content
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 flex flex-col',
              'sheet-mobile rounded-t-2xl border-t border-border bg-card shadow-xl',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
              'data-[state=closed]:duration-200 data-[state=open]:duration-250',
            )}
          >
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
            </div>

            <div className="flex items-center justify-between px-5 pb-3 shrink-0">
              <DialogPrimitive.Title className="text-base font-semibold text-foreground">
                {sheetTitle}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-accent">
                <X className="h-4 w-4" />
                <span className="sr-only">ปิด</span>
              </DialogPrimitive.Close>
            </div>

            <DialogPrimitive.Description className="sr-only">
              เลือกตัวเลือกจากรายการด้านล่าง
            </DialogPrimitive.Description>

            <div className="px-4 pb-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={mobileSearch}
                  onChange={(e) => setMobileSearch(e.target.value)}
                  placeholder="ค้นหา…"
                  className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  autoComplete="off"
                  autoCorrect="off"
                />
              </div>
            </div>

            <div className="h-px bg-border shrink-0" />

            <div
              role="listbox"
              aria-label={sheetTitle}
              className="flex-1 overflow-y-auto overscroll-contain px-2 py-2"
              style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
            >
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Search className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">ไม่พบรายการ</p>
                </div>
              ) : (
                items.map((item) => {
                  const itemVal = String(item[valueKey])
                  const itemLabel = String(item[labelKey])
                  const isSelected = itemVal === value
                  return (
                    <button
                      key={itemVal}
                      ref={isSelected ? selectedRef : undefined}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => onSelect(item)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-4 min-h-12 py-3 text-left transition-colors',
                        'active:bg-accent/80',
                        isSelected ? 'bg-primary/10 text-primary' : 'text-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all',
                          isSelected ? 'bg-primary text-primary-foreground' : 'border border-border',
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span className="flex-1 text-[15px] leading-snug">{itemLabel}</span>
                    </button>
                  )
                })
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  )
}
