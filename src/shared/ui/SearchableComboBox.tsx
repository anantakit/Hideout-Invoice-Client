import { useState, useEffect, useId, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { useDebounce } from '../hooks/useDebounce'
import { useIsMobile } from '../hooks/useIsMobile'
import { Input } from './input'
import { Popover, PopoverAnchor, PopoverContent } from './popover'
import { cn } from '../utils'
import { MobileComboBoxSheet } from './MobileComboBoxSheet'

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

  // Mobile search term (driven by MobileComboBoxSheet callback)
  const [mobileSearchTerm, setMobileSearchTerm] = useState('')

  useEffect(() => {
    if (displayValue !== undefined) {
      setInputText(displayValue)
    } else if (!value && !isOpen) {
      setInputText('')
    }
  }, [displayValue, value, isOpen])

  const searchTerm = isMobile ? mobileSearchTerm : debouncedSearch

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

  const handleSelect = useCallback((item: T) => {
    const val = String(item[valueKey])
    const label = String(item[labelKey])
    setInputText(label)
    setIsOpen(false)
    onChange(val)
    onSelectItem?.(item)
  }, [valueKey, labelKey, onChange, onSelectItem])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value)
    if (!isOpen) setIsOpen(true)
    if (value) {
      onChange('')
      onSelectItem?.(null)
    }
  }

  const handleMobileSearchChange = useCallback((search: string) => {
    setMobileSearchTerm(search)
  }, [])

  // ── Mobile: bottom sheet ───────────────────────────────────────────────────

  if (isMobile) {
    const triggerLabel = displayValue || (value ? inputText : '')

    return (
      <MobileComboBoxSheet<T>
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        value={value}
        displayLabel={triggerLabel}
        placeholder={placeholder}
        sheetTitle={sheetTitle}
        disabled={disabled}
        error={error}
        items={items}
        isLoading={isLoading}
        valueKey={valueKey}
        labelKey={labelKey}
        onSelect={handleSelect}
        onSearchChange={handleMobileSearchChange}
      />
    )
  }

  // ── Desktop: Popover dropdown ──────────────────────────────────────────────

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverAnchor asChild>
        <div className="relative">
          <Input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
              setTimeout(() => setIsOpen(false), 150)
            }}
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
      </PopoverAnchor>

      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0 max-h-60 overflow-y-auto"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div role="listbox">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground text-center">
              {searchTerm ? 'ไม่พบผลลัพธ์' : 'ไม่มีข้อมูล'}
            </div>
          ) : (
            items.map((item) => {
              const itemVal = String(item[valueKey])
              const itemLabel = String(item[labelKey])
              const isSelected = itemVal === value
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
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
