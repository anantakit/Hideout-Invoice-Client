---
description: "Feature module boundaries, import rules, and directory conventions"
paths:
  - "src/features/**"
---

# Feature Structure Rules

## Feature Directory Layout

Each feature follows this structure:

```
features/<name>/
  api.ts             → API functions (single const object)
  types.ts           → interfaces + type unions
  constants.ts       → feature-level constants
  pages/             → route-level page components
  components/        → feature-specific UI components
  hooks/             → TanStack Query hooks + custom hooks
  context/           → React context providers (if needed)
  utils/             → pure utility functions
  shared/            → components/hooks/utils shared across sub-modules
    components/
    hooks/
    utils/
```

Sub-domains within a feature group related components, hooks, and utils together:

```
features/bookings/booking-detail/
  stay/              → stay lifecycle operations
  payment/           → payment operations
  components/        → cross-concern display components
  hooks/             → shared hooks within booking-detail
```

## Import Boundary Rules

### Cross-Feature Imports: MUST go through `@/shared/` gateway

Features MUST NOT import directly from another feature. All cross-feature dependencies go through re-exports in `@/shared/`:

```tsx
// ✅ Cross-feature via shared gateway
import { useInvoicePrefill } from '@/shared/hooks/useInvoicePrefill'
import { customersApi } from '@/shared/api/customers'

// ❌ Direct cross-feature import
import { useInvoicePrefill } from '@/features/bookings/hooks'
import { customersApi } from '@/features/customers/api'
```

**Exception:** `timeline` feature re-imports from `@/features/bookings/` directly because timeline is a view layer over the booking domain. This is a deliberate architectural decision — timeline consumes booking types, hooks, and shared components without a gateway.

```tsx
// ✅ Timeline importing from bookings (allowed exception)
import { useCreateBooking } from '@/features/bookings/hooks'
import type { RoomStayResponse } from '@/features/bookings/types'
import { CheckInStayRow } from '@/features/bookings/shared/components/CheckInStayRow'
```

### Within-Feature Imports: use relative paths

```tsx
// ✅ Within same feature
import { useTimelineState } from '../hooks/useTimelineState'
import { TimelineProvider } from '../context/TimelineContext'

// ❌ Absolute path within same feature (unnecessary)
import { useTimelineState } from '@/features/timeline/hooks/useTimelineState'
```

### Shared UI Imports: always `@/shared/ui/`

```tsx
// ✅
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
```

## Adding a Shared Gateway

When feature B needs something from feature A:

1. Create a re-export file in `@/shared/hooks/` or `@/shared/api/`
2. Re-export only what's needed (not the entire module)
3. Feature B imports from `@/shared/`, never from feature A directly

```tsx
// @/shared/hooks/useInvoicePrefill.ts
export { useInvoicePrefill, useInvoiceCoverage } from '@/features/bookings/hooks'
```

## Preventing Regression

Before adding a new import:

1. **Same feature?** Use relative path
2. **Cross-feature?** Check if a gateway exists in `@/shared/`. If not, create one
3. **Reverse dependency?** A shared/ module MUST NOT import from a sub-module (e.g., `bookings/shared/` cannot import from `bookings/timeline/`)
4. **Circular dependency?** If A imports B and B imports A, extract shared code to `shared/`
