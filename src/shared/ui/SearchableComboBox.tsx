import { useState, useEffect, useId } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from '../hooks/useDebounce'

interface FetchParams {
  search?: string
  page: number
  limit: number
}

interface FetchResult<T> {
  data: T[]
}

interface SearchableComboBoxProps<T extends object> {
  /** The currently selected value (e.g. an ID string). */
  value: string
  /** Called with the valueKey field of the selected item. */
  onChange: (value: string) => void
  /** Optional: called with the full item when selection changes. */
  onSelectItem?: (item: T | null) => void
  /** API function: called with {search?, page, limit}, must return {data: T[]}. */
  fetchFunction: (params: FetchParams) => Promise<FetchResult<T>>
  placeholder?: string
  /** Key of T whose value is displayed in the list. */
  labelKey: keyof T
  /** Key of T whose value is used as the form value. */
  valueKey: keyof T
  /**
   * Text to show in the input box when an item is selected externally
   * (e.g. after creating a new item via a modal).
   */
  displayValue?: string
  error?: boolean
  disabled?: boolean
}

/**
 * SearchableComboBox — a reusable, API-driven search combobox.
 *
 * On first open it fetches the latest 20 records (no search term).
 * While typing it debounces 300ms then searches via fetchFunction.
 * Fully controlled: value/onChange are the source of truth.
 *
 * @example
 * <SearchableComboBox
 *   value={field.value}
 *   onChange={(id) => field.onChange(id)}
 *   onSelectItem={(item) => setSelected(item as Customer)}
 *   fetchFunction={(p) => customersApi.list(p)}
 *   labelKey="name"
 *   valueKey="id"
 *   displayValue={selected?.name}
 *   placeholder="ค้นหาลูกค้า…"
 * />
 */
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
  // Stable unique key per component instance for the TanStack Query cache.
  const instanceId = useId()

  const [inputText, setInputText] = useState(displayValue ?? '')
  const [isOpen, setIsOpen] = useState(false)

  const debouncedSearch = useDebounce(inputText, 1000)

  // Sync display text when an item is selected externally (e.g. via modal).
  useEffect(() => {
    if (displayValue !== undefined) {
      setInputText(displayValue)
    }
  }, [displayValue])

  // Clear the input when value is reset from outside, but only while the
  // dropdown is closed (prevents clearing mid-keystroke when the user is
  // typing and clears the selection internally).
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
    // Clear current selection so form knows value is unset while typing.
    if (value) {
      onChange('')
      onSelectItem?.(null)
    }
  }

  const handleFocus = () => {
    setIsOpen(true)
  }

  const handleBlur = () => {
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          className={`w-full pr-8 ${error ? 'input-error' : 'input'}`}
        />
        {/* Chevron */}
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <svg
            className={`w-4 h-4 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>

      {isOpen && (
        <div
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">
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
                  // Prevent blur before click fires so the dropdown doesn't
                  // close before the selection is processed.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(item)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    itemVal === value
                      ? 'bg-brand-50 text-brand-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
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
