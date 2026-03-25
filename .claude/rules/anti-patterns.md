---
description: "Known anti-patterns in the frontend codebase — avoid when writing new code, fix when refactoring"
paths:
  - "**/*.tsx"
  - "**/*.ts"
---

# Frontend Anti-Patterns

## Critical — Must Fix During Refactor

### God Components

| File | Lines | Problem |
|------|-------|---------|
| `OperationsDrawer.tsx` | 958 | Houses CheckoutAllButton, BookingDetailContent, inline create-booking form, and drawer orchestrator — 3-4 components in one file |
| `TimelinePage.tsx` | 916 | 25 useState, 15 useCallback, 10 useMemo, 7 useEffect, binary search, virtualizer, drag/draw coordination |
| `StayCardOperational.tsx` | 696 | Cancel/extend/checkout/transfer each with own dialog state, form state, and mutation |
| `RoomTypeBookingBuilder.tsx` | 615 | Contains Manhattan distance auto-assign algorithm (90 lines of business logic in UI) |
| `CreateReceiptPage.tsx` | 562 | Zod schema + form + customer search + 3 chained useEffects for prefill |

**Target**: No component file over 300 lines. Extract sub-components, custom hooks, and utility functions.

### Duplicate Code

| What | Where | Fix |
|------|-------|-----|
| `statusVariant()` | OperationsDrawer, BookingBottomSheet, bookingStatusHelpers.ts | Single source in `bookingStatusHelpers.ts` |
| `BadgeVariant` type | BookingListPage, AdminUsersPage, bookingStatusHelpers | Single type in shared types |
| `SelectedBookingContext` interface | OperationsDrawer, BookingBottomSheet | Single definition, import everywhere |
| `toApiDate/fromApiDate` | DateRangeFilter, ReceiptDateFilter | Move to `shared/utils.ts` |
| DateRangeFilter vs ReceiptDateFilter | 460 vs 402 lines, identical presets + effects | Merge into one configurable component |
| Table page boilerplate | CustomersPage, AdminUsersPage, ReceiptHistoryPage, BookingListPage | Extract shared `DataTablePage` pattern or hook |

## Moderate — Fix When Touching Related Code

### Business Logic in Components

- Manhattan distance scoring in `RoomTypeBookingBuilder.tsx` (90 lines) — extract to `utils/roomAssignment.ts`
- Binary search `getRoomAtY` in `TimelinePage.tsx` — extract to timeline utilities
- Error message mapping (server → Thai) in `TimelinePage.tsx` — extract to error mapping utility

### Prop Drilling

- `TimelinePage` → `RoomRow` → `BookingBlock`: 13+ props through 3 levels
- `TimelinePage` → `TimelineToolbar`: 15 props (state + setters)
- **Target**: Extract timeline state into a context or custom hook that children consume directly

### Chained useEffects

- `CreateReceiptPage.tsx`: 3 effects forming a cascade (prefill customer → reset flag → apply data)
- **Target**: Combine into single effect or `useMemo` with proper dependencies

### Inconsistent Patterns

- Import paths: mixed `@/shared/...` and `../../../shared/...` — standardize on `@/`
- Mobile detection: 3 different approaches — standardize on `useIsMobile` hook
- Some files mix `PaymentPanel.tsx` uses both `@/shared/utils` and `../../../../shared/utils`

## Rules for New Code

1. **No component file over 300 lines** — split into sub-components + hooks
2. **No business logic in components** — extract to `utils/` or hooks
3. **No duplicate utilities** — check `shared/utils.ts` and feature utils before creating
4. **Always use `@/` alias** for imports outside current feature directory
5. **Max 5 useState per component** — if more, extract into a custom hook or useReducer
6. **Max 2 useEffect per component** — if more, split component or extract hooks
7. **Shared UI patterns**: if 3+ pages use the same layout (table + search + pagination + delete dialog), extract the pattern
