---
description: "React and TypeScript code style conventions for this project"
paths:
  - "**/*.tsx"
  - "**/*.ts"
---

# React / TypeScript Style Rules

## Component Definitions

```tsx
// ✅ Named function declaration
export function BookingCard({ booking }: BookingCardProps) { ... }

// ❌ Arrow function for components
export const BookingCard = ({ booking }: BookingCardProps) => { ... }
```

- Arrow functions: only for inline callbacks, one-liner utilities, and API object methods
- Always export from definition site — no default exports

## Hooks

```tsx
// ✅ Named function, wraps TanStack Query directly
export function useBookings(params: BookingParams) {
  return useQuery({
    queryKey: BOOKING_KEYS.list(params),
    queryFn: () => bookingsApi.list(params),
  })
}
```

- Return TanStack Query result directly — no custom return shape
- JSDoc comment on every exported hook (one-liner `/** ... */`)
- Mutations: always invalidate related queries in `onSuccess`

## Query Keys

```tsx
export const BOOKING_KEYS = {
  all: ['bookings'] as const,
  list: (params: BookingParams) => ['bookings', 'list', params] as const,
  detail: (id: string) => ['bookings', id] as const,
}
```

## API Layer

```tsx
export const bookingsApi = {
  list: async (params: BookingParams) => {
    const { data } = await apiClient.get<ApiResponse<Booking[]>>('/bookings', { params })
    return data.data
  },
}
```

- One API object per feature
- Destructure `data.data` from `ApiResponse<T>` envelope
- Use `apiClient` from `@/shared/api/client`

## Types

```tsx
// ✅ Interface for data shapes
export interface BookingResponse {
  id: string
  guest_name: string        // snake_case matching backend
  total_amount: number
}

// ✅ Type for unions
export type BookingStatus = 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED'
```

- Fields: `snake_case` (matching JSON from backend)
- Optional fields: `field?: type` (not `field: type | undefined`)

## Imports

Preferred order (no strict enforcement, but be consistent):
1. React / framework (`react`, `react-router-dom`)
2. Third-party (`lucide-react`, `@tanstack/react-query`)
3. Internal aliases (`@/shared/ui/button`, `@/shared/utils`)
4. Relative (`./types`, `../api`)

**Always use `@/` alias** for cross-feature and shared imports. Relative only within same feature directory.

## State Management

- Server state: TanStack Query (never local state for API data)
- Form state: `react-hook-form` + `zod` schemas
- Global UI state: React Context (AuthProvider, HoverContext)
- Local UI state: `useState` — keep minimal

## Error Handling

- API errors: handled by axios 401 interceptor + per-mutation `onError`
- Toast: `react-hot-toast` — `toast.success()` / `toast.error()`
- Never `console.log` errors in production code — use toast for user feedback
