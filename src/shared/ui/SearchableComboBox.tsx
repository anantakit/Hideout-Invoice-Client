import { useState, useEffect, useRef, useId } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Check, Search, X } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useDebounce } from '../hooks/useDebounce'
import { useIsMobile } from '../hooks/useIsMobile'
import { Input } from './input'
import { cn } from '../utils'

interface FetchParams {
  search?: string
  page: number
  limit: number
}

interface FetchResult<T> {
  data: T[]
}

interface SearchableComboBoxProps<T extends object> {
  value: string
  onChange: (value: string) => void
  onSelectItem?: (item: T | null) => void
  fetchFunction: (params: FetchParams) => Promise<FetchResult<T>>
  placeholder?: string
  labelKey: keyof T
  valueKey: keyof T
  displayValue?: string
  error?: boolean
  disabled?: boolean
  /** Title shown in the mobile bottom sheet header */
  sheetTitle?: string
}

export default function SearchableComboBox<T extends object>({
  value,
  onChange,
  onSelectItem,
  fetchFunction,
  placeholder = 'ค้นหา…',
  labelKey,
  valueKey,
  displayValue,
  error,
  disabled,
  sheetTitle = 'เลือกรายการ',
}: SearchableComboBoxProps<T>) {
  const instanceId = useId()
  const isMobile = useIsMobile()

  const [inputText, setInputText] = useState(displayValue ?? '')
  const [isOpen, setIsOpen] = useState(false)

  const debouncedSearch = useDebounce(inputText, 1000)

  // Mobile uses its own search state
  const [mobileSearch, setMobileSearch] = useState('')
  const debouncedMobileSearch = useDebounce(mobileSearch, 300)
  const selectedRef = useRef<HTMLButtonElement>(null)

  // Sync inputText from external state — single effect avoids race between
  // displayValue sync and value-cleared reset.
  useEffect(() => {
    if (displayValue !== undefined) {
      setInputText(displayValue)
    } else if (!value && !isOpen) {
      setInputText('')
    }
  }, [displayValue, value, isOpen])

  // Reset mobile search when sheet opens
  useEffect(() => {
    if (isOpen && isMobile) {
      setMobileSearch('')
      // Scroll to selected item
      requestAnimationFrame(() => {
        selectedRef.current?.scrollIntoView({ block: 'center' })
      })
    }
  }, [isOpen, isMobile])

  const searchTerm = isMobile ? debouncedMobileSearch : debouncedSearch

  const queryParams: FetchParams = {
    ...(searchTerm ? { search: searchTerm } : {}),
    page: 1,
    limit: 20,
  }

  const { data, isLoading } = useQuery({
    queryKey: [instanceId, queryParams],
    queryFn: () => fetchFunction(queryParams),
    enabled: isOpen,
    placeholderData: (prev) => prev,
    staleTime: 10_000,
  })

  const items = data?.data ?? []

  const handleSelect = (item: T) => {
    const val = String(item[valueKey])
    const label = String(item[labelKey])
    setInputText(label)
    setIsOpen(false)
    onChange(val)
    onSelectItem?.(item)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value)
    if (!isOpen) setIsOpen(true)
    if (value) {
      onChange('')
      onSelectItem?.(null)
    }
  }

  // ── Shared: item list ──────────────────────────────────────────────────────

  const renderItems = (mobile: boolean) => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )
    }
    if (items.length === 0) {
      return mobile ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <Search className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">ไม่พบรายการ</p>
        </div>
      ) : (
        <div className="px-4 py-3 text-sm text-muted-foreground text-center">
          {searchTerm ? 'ไม่พบผลลัพธ์' : 'ไม่มีข้อมูล'}
        </div>
      )
    }
    return items.map((item) => {
      const itemVal = String(item[valueKey])
      const itemLabel = String(item[labelKey])
      const isSelected = itemVal === value

      if (mobile) {
        return (
          <button
            key={itemVal}
            ref={isSelected ? selectedRef : undefined}
            type="button"
            role="option"
            aria-selected={isSelected}
            onClick={() => handleSelect(item)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-4 min-h-[3rem] py-3 text-left transition-colors',
              'active:bg-accent/80',
              isSelected
                ? 'bg-primary/10 text-primary'
                : 'text-foreground',
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
            <span className="flex-1 text-[15px] leading-snug">{itemLabel}</span>
          </button>
        )
      }

      return (
        <button
          key={itemVal}
          type="button"
          role="option"
          aria-selected={isSelected}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleSelect(item)}
          className={cn(
            'w-full text-left px-4 py-2.5 text-sm transition-colors',
            isSelected
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-foreground hover:bg-muted',
          )}
        >
          {itemLabel}
        </button>
      )
    })
  }

  // ── Mobile: bottom sheet ───────────────────────────────────────────────────

  if (isMobile) {
    const triggerLabel = displayValue || (value ? inputText : '')

    return (
      <div>
        {/* Trigger button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(true)}
          className={cn(
            'flex h-11 w-full items-center justify-between gap-2 radius-button border border-input bg-background px-3 text-sm',
            'transition-colors',
            triggerLabel ? 'text-foreground' : 'text-muted-foreground',
            error && 'border-destructive',
            disabled && 'opacity-50 pointer-events-none',
          )}
        >
          <span className="flex-1 truncate text-left">
            {triggerLabel || placeholder}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </button>

        <DialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
          <DialogPrimitive.Portal>
            {/* Backdrop */}
            <DialogPrimitive.Overlay
              className={cn(
                'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm',
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
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
              </div>

              {/* Header */}
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

              {/* Search */}
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

              {/* Divider */}
              <div className="h-px bg-border shrink-0" />

              {/* Options list */}
              <div
                role="listbox"
                aria-label={sheetTitle}
                className="flex-1 overflow-y-auto overscroll-contain px-2 py-2"
                style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
              >
                {renderItems(true)}
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>
    )
  }

  // ── Desktop: inline dropdown ───────────────────────────────────────────────

  return (
    <div className="relative">
      <div className="relative">
        <Input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          className={cn('pr-8', error && 'border-destructive focus-visible:ring-destructive')}
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
          <ChevronDown className={cn('w-4 h-4 transition-transform duration-150', isOpen && 'rotate-180')} />
        </span>
      </div>

      {isOpen && (
        <div
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-card border border-border radius-card shadow-popover max-h-60 overflow-y-auto"
        >
          {renderItems(false)}
        </div>
      )}
    </div>
  )
}
