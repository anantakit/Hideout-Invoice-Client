---
description: "Known anti-patterns in the frontend codebase — avoid when writing new code, fix when refactoring"
paths:
  - "**/*.tsx"
  - "**/*.ts"
---

# Frontend Anti-Patterns

## Critical — Must Fix During Refactor

### Oversized Components (> 300 lines)

Phase 3 split the original god objects (TimelinePage 916→hooks, OperationsDrawer 958→sub-components).
27 files still exceed the 300-line limit. Top offenders:

| File | Lines | Problem |
|------|-------|---------|
| `AssignRoomBottomSheet.tsx` | 607 | Room picker grid + confirm dialog + assignment mutation in one file |
| `MobileTimelineList.tsx` | 587 | 8 useState, filter/search/sort + room cards + booking items all inline |
| `InlineCreateBookingForm.tsx` | 509 | 9 useState, guest fields + room selector + form state in one file |
| `BookingBlock.tsx` | 493 | Content + tooltip + drag handles all inline |
| `CreateBookingPage.tsx` | 492 | Form state + guest section + stay section in one file |
| `BookingListPage.tsx` | 483 | Filters + table + row rendering + filter state sync |
| `TimelineToolbar.tsx` | 479 | Zoom + date nav + KPI strip + room type filter all inline |
| `AddStayPanel.tsx` | 472 | Form fields + availability check + submit mutation |
| `DateRangeFilter.tsx` | 460 | Near-identical to ReceiptDateFilter (402) — should be merged |
| `RoomTypeBookingBuilder.tsx` | 456 | Room selection grid + date sync logic inline |
| `PaymentPanel.tsx` | 447 | Payment form + history list + CRUD mutations |

Plus 16 more files in the 300–450 range. **Hotspot**: `bookings/timeline/` accounts for 10 of 27.

**Target**: No component file over 300 lines. Extract sub-components, custom hooks, and utility functions.

### Excessive useState (> 5)

| Count | File |
|-------|------|
| 9 | `InlineCreateBookingForm.tsx` |
| 8 | `MobileTimelineList.tsx` |
| 7 | `DateRangeFilter.tsx`, `BookingDetailPage.tsx` |
| 6 | `ThaiAddressPicker.tsx`, `AdminRoomsPage.tsx`, `ReceiptDateFilter.tsx`, `DateRangePicker.tsx`, `StayCardOperational.tsx`, `ReceiptSection.tsx` |

**Target**: Max 5 useState per component. Extract related state into `useReducer` or a custom hook.

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

Core algorithms already extracted to utils (`roomAssignment.ts`, `bookingLayout.ts`, `classifyRooms.ts`, `computeDateKPI.ts`).
Remaining minor violations:

- `BookingSummary.tsx` — `calcNights()` + cost computation inline → extract to `utils/bookingCalc.ts`
- `DailyRevenueHeatmap.tsx` — quartile intensity + calendar grid builder inline → extract to `utils/heatmapCalc.ts`
- `RoomTypeBookingBuilder.tsx` — availability calc inline → extract to existing utils

### Prop Drilling

Phase 3 extracted `useTimelineState` hook, but props still waterfall through components:

- `TimelineContent` receives **~35 props** from `TimelinePage` — god component distributing to children
- `RoomRow` receives **18 props** — mostly callbacks passed through to `BookingBlock`
- `MobileSection` is a **pure pass-through wrapper** (12 props, zero logic) → should be eliminated
- Drag/keyboard/context-menu callbacks drill through 3 levels unchanged

**Target**: Introduce `TimelineContext` + `TimelineCallbackContext` so children consume directly via hooks. Goal: no component receives > 10 props.

### Inconsistent Patterns

- Import paths: mixed `@/shared/...` and `../../../shared/...` — standardize on `@/`
- Mobile detection: 3 different approaches — standardize on `useIsMobile` hook

## Rules for New Code

1. **No component file over 300 lines** — split into sub-components + hooks
2. **No business logic in components** — extract to `utils/` or hooks
3. **No duplicate utilities** — check `shared/utils.ts` and feature utils before creating
4. **Always use `@/` alias** for imports outside current feature directory
5. **Max 5 useState per component** — if more, extract into a custom hook or useReducer
6. **Max 2 useEffect per component** — if more, split component or extract hooks
7. **Shared UI patterns**: if 3+ pages use the same layout (table + search + pagination + delete dialog), extract the pattern
