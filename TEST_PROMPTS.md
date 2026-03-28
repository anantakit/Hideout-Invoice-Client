# Frontend Test Prompts

แต่ละ prompt ใช้สั่ง Claude ทำ test ทีละ phase — copy แล้ววางได้เลย

## Branch Map

| Branch | Phases | สร้างจาก |
|--------|--------|----------|
| `test/foundation` | Phase 0 + 1 | `main` |
| `test/booking` | Phase 2 | `main` (หลัง merge foundation) |
| `test/payment` | Phase 3 | `main` (หลัง merge booking) |
| `test/features` | Phase 4 + 5 + 6 | `main` (หลัง merge payment) |

---

## Phase 0 — Foundation

```
/test-by-phase

Execute Frontend Phase 0 from frontend/TEST_PLAN.md — Setup test infrastructure.

Branch: cd frontend && git checkout -b test/foundation

Tasks:
1. Install test dependencies: vitest, @vitest/ui, @vitest/coverage-v8,
   @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, happy-dom
2. Create vitest.config.ts extending vite.config.ts with happy-dom environment
3. Create src/test/setup.ts importing @testing-library/jest-dom/vitest
4. Create src/test/helpers.ts with:
   - createQueryWrapper() for wrapping hooks with QueryClientProvider (retry: false)
   - Any other shared utilities
5. Add package.json scripts: "test", "test:ui", "test:coverage"
6. Verify: npm run test reports 0 tests, no errors

Follow frontend/.claude/rules/testing.md for all conventions.
Commit to frontend/ repo on branch test/foundation: "test: setup vitest infrastructure (phase 0)"
```

---

## Phase 1 — Shared Utils

```
/test-by-phase

Execute Frontend Phase 1 from frontend/TEST_PLAN.md — Test shared utility functions.

Branch: cd frontend && git checkout test/foundation (ต่อจาก Phase 0)

Source files to test:
- src/shared/utils.ts (all exported functions)
- src/shared/utils/addressUtils.ts

Key test scenarios:
1. formatTHB/formatCurrency: 0, positive, negative, decimal precision, large numbers
2. formatThaiDate/fmtShortBE/fmtLongBE: verify Buddhist Era year (+543), Thai month names
3. fmtShort, fmtShortWithYear, fmtShortISO: various date formats
4. todayISO, addDaysISO: use vi.useFakeTimers() to control date
5. formatPhone: valid phone, null, undefined, empty string
6. getErrorMessage: Error object, string, unknown type, with/without fallback
7. cn: single class, multiple classes, conditional classes
8. isMobileDevice: mock navigator.userAgent
9. formatCompactNumber/formatCompact/formatKPI: 0, hundreds, thousands, millions
10. parseAddressToThaiAddr: Thai address string → structured object
11. buildAddressString: structured → string roundtrip

All assertions should verify Thai text output where applicable.
Follow frontend/.claude/rules/testing.md for all conventions.
Commit to frontend/ repo on branch test/foundation: "test: add shared utils tests (phase 1)"

This is the last phase on test/foundation — branch is ready for review/merge to main.
```

---

## Phase 2 — Booking

```
/test-by-phase

Execute Frontend Phase 2 from frontend/TEST_PLAN.md — Test booking feature utilities.

Branch: cd frontend && git checkout -b test/booking (สร้างใหม่จาก main หลัง merge test/foundation)

Source files to test:
- features/bookings/create-booking/utils/bookingCalc.ts
  - calcNights: same day (0), 1 night, multi-night, cross-month, cross-year
  - calcLineTotal: price × qty × nights, zero values
  - calcKeyDeposit: 1 room, multiple rooms

- features/bookings/create-booking/utils/bookingSummaryCalc.ts
  - calcLineItems: empty items, single item, multiple items with different prices
  - calcDepositSplit: different payment modes (full, deposit, none)
  - calcTotalRooms: with/without quantity field, empty array

- features/bookings/create-booking/utils/expandGroupedStays.ts
  - expandGroupedStays: single room type qty 1, qty 3, multiple room types

- features/bookings/create-booking/utils/roomAssignment.ts
  - proximityAutoAssignAll: available rooms → assigned, no rooms → empty, scoring logic

- features/bookings/shared/utils/bookingStatusHelpers.ts
  - bookingStatusVariant: each BookingStatus → correct variant
  - stayStatusVariant: each StayStatus → correct variant
  - mapRoomGroups: with/without excludeRoomId
  - addDaysToISO, calcNights, isCheckInToday, isCheckInOverdue (use fake timers)

- features/bookings/shared/utils/paymentUtils.ts
  - filterPaymentsByType: filter by single type, multiple types, empty array

- features/bookings/shared/availabilityCalc.ts
  - calcAvailableCount: normal, zero physical, unassigned > physical

- features/bookings/booking-list/utils/bookingListUtils.ts
  - getRoomInfo: single room, multiple rooms, no stays
  - getStayRange: with stays, without stays (null)

Follow frontend/.claude/rules/testing.md for all conventions.
Commit to frontend/ repo on branch test/booking: "test: add booking utils tests (phase 2)"

This is the only phase on test/booking — branch is ready for review/merge to main.
```

---

## Phase 3 — Payment & Receipt

```
/test-by-phase

Execute Frontend Phase 3 from frontend/TEST_PLAN.md — Test payment and receipt hooks.

Branch: cd frontend && git checkout -b test/payment (สร้างใหม่จาก main หลัง merge test/booking)

Source files to test:
- features/receipts/hooks/useReceiptPrefill.ts
- features/receipts/hooks/useCreateReceipt.ts
- features/receipts/hooks/useDeleteReceipt.ts
- features/bookings/booking-detail/hooks/usePaymentPanel.ts
- features/bookings/booking-detail/hooks/useReceiptBillingState.ts

Testing approach:
- Mock API layer (vi.mock the feature's api.ts)
- Use createQueryWrapper() from test helpers
- Use renderHook + waitFor for async hooks
- Test success paths, error paths, and loading states
- Verify query invalidation on mutations (onSuccess)

Follow frontend/.claude/rules/testing.md for all conventions.
Commit to frontend/ repo on branch test/payment: "test: add payment & receipt hook tests (phase 3)"

This is the only phase on test/payment — branch is ready for review/merge to main.
```

---

## Phase 4 — Dashboard

```
/test-by-phase

Execute Frontend Phase 4 from frontend/TEST_PLAN.md — Test dashboard calculation utilities.

Branch: cd frontend && git checkout -b test/features (สร้างใหม่จาก main หลัง merge test/payment)

Source files to test:
- features/dashboard/utils/dashboardCalc.ts
  - calcYTDCumulative: empty data, single month, full year, verify accumulation
  - calcYoYPercent: normal case, previous=0 (null), current=0, both zero
  - calcPressureKPI: empty data, single entry, multiple entries
  - getTopInsights: limit < data length, limit > data length, empty

- features/dashboard/utils/heatmapCalc.ts
  - getIntensityClass: amount=0, low/mid/high relative to max, max=0
  - buildCalendarGrid: verify grid dimensions (weeks × 7), data mapping,
    empty days padding, month boundary handling

Follow frontend/.claude/rules/testing.md for all conventions.
Commit to frontend/ repo on branch test/features: "test: add dashboard calc tests (phase 4)"
```

---

## Phase 5 — Timeline

```
/test-by-phase

Execute Frontend Phase 5 from frontend/TEST_PLAN.md — Test timeline computation utilities.

Branch: cd frontend && git checkout test/features (ต่อจาก Phase 4)

Source files to test:
- features/timeline/utils/bookingLayout.ts
  - computeRoomLayout: no bookings, single booking, overlapping bookings (layers),
    bookings outside window, boundary bookings

- features/timeline/utils/classifyRooms.ts
  - overlapsRange: fully inside, partially overlapping, outside, touching boundaries
  - classifyRooms: mixed statuses, empty rooms, all occupied

- features/timeline/utils/computeDateKPI.ts
  - computeDateKPI: total rooms, available, occupied %, by room type breakdown

- features/timeline/utils/computeDateOps.ts
  - computeDateOps: checkins today, checkouts today, already done, none

- features/timeline/utils/operationTypes.ts
  - toDateStr: datetime → date only
  - formatNightsLabel: single night, multiple nights

- features/timeline/utils/shareOperations.ts
  - computeStayingGuests: guests with active stays on date
  - buildShareText: verify Thai text output format, all sections present

- features/timeline/utils/statusColors.ts
  - getStatusColorClass: each status → correct CSS class, unknown status

- features/timeline/utils/tokens.ts
  - getCellWidthPx, computeRowHeight: verify numeric calculations

Follow frontend/.claude/rules/testing.md for all conventions.
Commit to frontend/ repo on branch test/features: "test: add timeline utils tests (phase 5)"
```

---

## Phase 6 — Simple Features

```
/test-by-phase

Execute Frontend Phase 6 from frontend/TEST_PLAN.md — Test remaining simple features.

Branch: cd frontend && git checkout test/features (ต่อจาก Phase 5)

Source files to test:
- features/rooms/ hooks: useRoomMutations, useUpdateRoomStatus
- features/customers/ hooks: useCreateCustomer, useUpdateCustomer, useDeleteCustomer
- features/users/ hooks: useCreateUser, useUpdateUser, useDeleteUser
- shared/hooks/: usePaginatedQuery, useDataTable, useDebounce, useIsMobile

Testing approach:
- Mutation hooks: mock API, verify mutation calls, verify query invalidation
- usePaginatedQuery: mock API with paginated response, verify page/limit params
- useDataTable: verify sort state changes, pagination state
- useDebounce: use vi.useFakeTimers() + vi.advanceTimersByTime()
- useIsMobile: mock window.matchMedia

Follow frontend/.claude/rules/testing.md for all conventions.
Commit to frontend/ repo on branch test/features: "test: add remaining feature tests (phase 6)"

This is the last phase on test/features — branch is ready for review/merge to main.
```
