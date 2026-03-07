import { useState, useEffect, useId } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { useDebounce } from '../hooks/useDebounce'
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
}: SearchableComboBoxProps<T>) {
  const instanceId = useId()

  const [inputText, setInputText] = useState(displayValue ?? '')
  const [isOpen, setIsOpen] = useState(false)

  const debouncedSearch = useDebounce(inputText, 1000)

  useEffect(() => {
    if (displayValue !== undefined) {
      setInputText(displayValue)
    }
  }, [displayValue])

  useEffect(() => {
    if (!value && !isOpen) {
      setInputText('')
    }
  }, [value, isOpen])

  const queryParams: FetchParams = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
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
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground text-center">
              {debouncedSearch ? 'ไม่พบผลลัพธ์' : 'ไม่มีข้อมูล'}
            </div>
          ) : (
            items.map((item) => {
              const itemVal = String(item[valueKey])
              const itemLabel = String(item[labelKey])
              return (
                <button
                  key={itemVal}
                  type="button"
                  role="option"
                  aria-selected={itemVal === value}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    'w-full text-left px-4 py-2.5 text-sm transition-colors',
                    itemVal === value
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  {itemLabel}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
