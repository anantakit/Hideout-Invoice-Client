---
description: "Frontend testing conventions: Vitest, Testing Library, test structure, mocking patterns"
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/test/**"
---

# Frontend Testing Conventions

## Framework

- **Test runner**: Vitest (NOT Jest)
- **Component testing**: `@testing-library/react` + `@testing-library/user-event`
- **Environment**: `happy-dom`
- **Run**: `npm run test` / `npm run test:coverage`

## File Structure

- Test files live next to source: `utils.ts` → `utils.test.ts`
- Shared test helpers: `src/test/setup.ts` (global), `src/test/helpers.ts` (utilities)
- No `__tests__/` directories — colocate with source

## Pure Function Tests

```typescript
import { describe, it, expect } from 'vitest'
import { calcNights } from './bookingCalc'

describe('calcNights', () => {
  it('returns number of nights between dates', () => {
    expect(calcNights('2024-03-01', '2024-03-03')).toBe(2)
  })

  it('returns 0 for same-day', () => {
    expect(calcNights('2024-03-01', '2024-03-01')).toBe(0)
  })
})
```

- `describe` per function, `it` per behavior
- Test name describes expected behavior in Thai context where relevant
- Cover: normal case, edge cases (0, null, empty), boundary values

## Hook Tests

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

it('returns booking list', async () => {
  const { result } = renderHook(() => useBookings(params), {
    wrapper: createWrapper(),
  })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data).toHaveLength(2)
})
```

- Wrap with `QueryClientProvider` (retry: false for tests)
- Mock API layer with `vi.mock` at module level — mock `xxxApi`, not axios
- Use `waitFor` for async assertions

## Component Tests

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

it('shows error on empty guest name', async () => {
  const user = userEvent.setup()
  render(<BookingForm onSubmit={vi.fn()} />)

  await user.click(screen.getByRole('button', { name: /บันทึก/ }))

  expect(screen.getByText(/กรุณากรอกชื่อ/)).toBeInTheDocument()
})
```

- Query by role/text (Thai), not test-id — accessible selectors first
- Use `userEvent` (not `fireEvent`) for realistic interactions
- Assert visible outcomes, not implementation details

## Mocking

- Mock at API layer: `vi.mock('@/features/bookings/api')` — not axios, not fetch
- Mock return values per test: `vi.mocked(bookingsApi.list).mockResolvedValue(mockData)`
- For dates: `vi.useFakeTimers()` + `vi.setSystemTime(new Date('2024-03-15'))`
- Mock data should mirror real API response structure completely (see testing-anti-patterns.md)

## Thai-Specific Testing

- All user-facing text assertions use Thai strings: `กรุณากรอก`, `บันทึก`, `ยกเลิก`
- Date assertions verify Buddhist Era: `พ.ศ. 2567` not `2024`
- Money assertions verify `formatTHB` output: `1,500.00` format
- Phone assertions verify formatted output: `0XX-XXX-XXXX`

## What NOT To Do

- NO snapshot tests — they break on any change and test nothing meaningful
- NO `test-id` as primary selector — use role/text first
- NO testing mock behavior — test real component behavior (see testing-anti-patterns.md)
- NO testing shadcn/ui internals — test the feature's usage of the component
- NO `console.log` in tests — use assertions
- NO `.only` or `.skip` left in committed code
- NO testing implementation details (state values, internal method calls)
