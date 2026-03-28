---
description: "Known anti-patterns in the frontend codebase — avoid when writing new code, fix when refactoring"
paths:
  - "**/*.tsx"
  - "**/*.ts"
---

# Frontend Anti-Patterns

## Critical — Must Fix During Refactor

### ✅ Oversized Components (> 300 lines) — RESOLVED

Steps 1–5 split all 27 oversized files. Only shadcn exceptions remain (select.tsx 561, calendar.tsx 411).

### ✅ Excessive useState (> 5) — RESOLVED

All components now have ≤ 5 useState. Highest is AdminRoomsPage at exactly 5.

### ✅ Duplicate Code — RESOLVED

statusVariant, DateRangeFilter/ReceiptDateFilter merge, toApiDate, etc. — all consolidated.

### Inline useMutation in Components

Step 6 extracted 6 component files into 7 dedicated hooks. Remaining page-level mutations:

| File | Mutations | Should extract to |
|------|-----------|-------------------|
| `AdminRoomsPage.tsx` | 6 (CRUD room types + rooms) | `useRoomTypeMutations`, `useRoomMutations` |
| `AdminUsersPage.tsx` | 1 (delete) | `useDeleteUser` |
| `CustomersPage.tsx` | 1 (delete) | `useDeleteCustomer` |
| `CreateReceiptPage.tsx` | 1 (create) | `useCreateReceipt` |
| `ReceiptDetailPage.tsx` | 1 (delete) | `useDeleteReceipt` |
| `ReceiptHistoryPage.tsx` | 1 (delete) | `useDeleteReceipt` (reuse) |

**Target**: No `useMutation` in `.tsx` component files — only in hook files (`hooks/*.ts`).

### Business Logic in Hooks → Extract to Domain

Hooks contain pure business logic mixed with React orchestration. See **`EXTRACT_DOMAIN_PLAN.md`** for the full extraction plan (Phase A–D) and **`/extract-domain`** skill for workflow.

**Target**: Hook files contain only state + effects + orchestration. Pure logic lives in `domain/*.ts` files.

### Prop-Heavy Components

TimelineContext + TimelineCallbackContext + HoverContext reduced most drilling. Remaining:

| Component | Props | Target | Action |
|-----------|-------|--------|--------|
| `TimelineContent` | 19 | < 10 | Move drawer/drag state to context or hook |
| `BookingBlock` | 18 | < 12 | Verify callbacks use `useTimelineCallbacks()` |
| `OperationsDrawer` | 12 | < 6 | Read rooms/todayStr/roomTypeNameMap from `useTimelineContext()` |

**Target**: No component receives > 12 props.

## Moderate — Fix When Touching Related Code

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
