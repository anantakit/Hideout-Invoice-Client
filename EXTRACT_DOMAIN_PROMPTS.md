# Extract Domain Prompts

แต่ละ prompt ใช้สั่ง Claude ทำ extract ทีละ phase — copy แล้ววางได้เลย

## Branch Map

| Branch | Phase | สร้างจาก |
|--------|-------|----------|
| `refactor/extract-timeline` | Phase A (A1–A8) | `main` |
| `refactor/extract-bookings` | Phase B (B1–B5) | `main` (หลัง merge timeline) |
| `refactor/extract-payment` | Phase C (C1–C2) | `main` (หลัง merge bookings) |
| `refactor/extract-shared` | Phase D (D1) | `main` (หลัง merge payment) |

---

## Phase A — Timeline Domain

### A1: useTimelineDrag → dragSnapping.ts

```
/extract-domain

Extract pure logic from useTimelineDrag — Phase A1 from frontend/EXTRACT_DOMAIN_PLAN.md

Branch: cd frontend && git checkout -b refactor/extract-timeline

Hook: src/features/timeline/hooks/useTimelineDrag.ts

Extract to: src/features/timeline/domain/dragSnapping.ts

Functions to extract:
1. snapDragToGrid — horizontal/vertical snap geometry (day index from clientX, room from clientY)
2. checkConflict — date overlap detection for target room (exclude current stay)
3. calculateAutoScroll — edge-proximity scroll velocity from pointer position
4. updatePreviewPosition — geometry calc for drag preview rendering
5. calculateGrabDayOffset — where on the booking block was grabbed

After extraction, hook should only contain:
- Pointer event handlers (onPointerDown/Move/Up)
- State management (dragState, previewPos)
- Calls to domain functions for all math

Safety: run existing tests before AND after. Write domain tests for each function.
Follow frontend/.claude/rules/extract-domain.md and testing.md.
Commit: "refactor: extract drag snap/conflict logic from useTimelineDrag"
```

---

### A2: useTimelineState → computeState.ts

```
/extract-domain

Extract derived computations from useTimelineState — Phase A2 from frontend/EXTRACT_DOMAIN_PLAN.md

Branch: cd frontend && git checkout refactor/extract-timeline (ต่อจาก A1)

Hook: src/features/timeline/hooks/useTimelineState.ts (~800 lines)

Extract to: src/features/timeline/domain/computeState.ts

Functions to extract:
1. buildBookingRoomCountMap(allRooms) → Record<string, number>
2. buildBookingColorMap(allRooms) → Record<string, string>
3. computeRowHeights(allRooms, roomLayerCountMap) → Record<string, number>
4. buildRoomMaps(availRoomTypes) → { typeIdMap, typeNameMap, priceMap }
5. filterRoomsByType(allRooms, selectedTypeId) → TimelineRoom[]
6. buildMobileDateStrip(mobileAnchor, stripDays, centerOffset) → Date[]
7. calculateTodayPendingCheckinCount(unassignedStays, allRooms, todayStr) → number

Note: computeDateKPI is already extracted ✓ — don't duplicate.

This is a monolithic hook — extract all 7 pure functions, keep useMemo wrappers in hook.
Safety: run existing tests before AND after. Write domain tests for each function.
Follow frontend/.claude/rules/extract-domain.md and testing.md.
Commit: "refactor: extract derived computations from useTimelineState"
```

---

### A3: useInfiniteTimeline → infiniteScroll.ts

```
/extract-domain

Extract scroll math from useInfiniteTimeline — Phase A3 from frontend/EXTRACT_DOMAIN_PLAN.md

Branch: cd frontend && git checkout refactor/extract-timeline (ต่อจาก A2)

Hook: src/features/timeline/hooks/useInfiniteTimeline.ts

Extract to: src/features/timeline/domain/infiniteScroll.ts

Functions to extract:
1. calculateBufferStart(currentDate, bufferDays) → Date
2. calculateVisibleRange(scrollLeft, bufferStart, cellWidth, viewportWidth) → { startDay, visibleDays }
3. shouldShiftBuffer(scrollLeft, totalWidth, viewportWidth, threshold) → 'left' | 'right' | null
4. calculateJumpTarget(targetDate, bufferDays, cellWidth) → number

These are viewport/scroll math functions. Domain tests should cover:
- Buffer boundary calculation with various dates
- Visible range at scroll extremes (0, max)
- Shift detection near edges
- Jump target for future/past dates

Safety: run existing tests before AND after. Write domain tests.
Follow frontend/.claude/rules/extract-domain.md and testing.md.
Commit: "refactor: extract scroll math from useInfiniteTimeline"
```

---

### A4: useTimelineDraw → drawGeometry.ts

```
/extract-domain

Extract draw-to-create geometry from useTimelineDraw — Phase A4 from frontend/EXTRACT_DOMAIN_PLAN.md

Branch: cd frontend && git checkout refactor/extract-timeline (ต่อจาก A3)

Hook: src/features/timeline/hooks/useTimelineDraw.ts

Extract to: src/features/timeline/domain/drawGeometry.ts

Functions to extract:
1. getDayIndex(clientX, containerRect, cellWidth) → number
2. calculateDrawDateRange(startDay, currentDay, windowStart) → { checkIn, checkOut }
3. isCellEmpty(roomId, checkIn, checkOut, bookings) → boolean

Domain tests should cover:
- getDayIndex: at container edges, fractional positions, negative values
- calculateDrawDateRange: normal drag, reversed selection (right to left)
- isCellEmpty: no bookings, overlapping booking, adjacent booking (touching boundary)

Safety: run existing tests before AND after.
Follow frontend/.claude/rules/extract-domain.md and testing.md.
Commit: "refactor: extract draw geometry from useTimelineDraw"
```

---

### A5: usePendingGroups → stayAggregation.ts

```
/extract-domain

Extract stay aggregation from usePendingGroups — Phase A5 from frontend/EXTRACT_DOMAIN_PLAN.md

Branch: cd frontend && git checkout refactor/extract-timeline (ต่อจาก A4)

Hook: src/features/timeline/hooks/usePendingGroups.ts

Extract to: src/features/timeline/domain/stayAggregation.ts

Functions to extract:
1. groupUnassignedStaysByBooking(stays) → Map<string, PendingBookingGroup>
2. createDateSections(grouped, todayStr) → PendingDateSectionData[]
3. formatDateLabel(dateStr, todayStr) → string ("วันนี้", "พรุ่งนี้", or date)

Hook should be reduced to two useMemo calls wrapping pure functions.

Domain tests should cover:
- Empty stays, single booking, multiple bookings
- Date sections ordering (today first, then chronological)
- formatDateLabel: today, tomorrow, past date, future date

Safety: run existing tests before AND after.
Follow frontend/.claude/rules/extract-domain.md and testing.md.
Commit: "refactor: extract stay aggregation from usePendingGroups"
```

---

### A6: useMobileTimelineFilters → roomFiltering.ts

```
/extract-domain

Extract room filtering from useMobileTimelineFilters — Phase A6 from frontend/EXTRACT_DOMAIN_PLAN.md

Branch: cd frontend && git checkout refactor/extract-timeline (ต่อจาก A5)

Hook: src/features/timeline/hooks/useMobileTimelineFilters.ts

Extract to: src/features/timeline/domain/roomFiltering.ts

Functions to extract:
1. countUnassignedForDate(unassignedStays, dateStr) → number
2. buildRangeEntries(entries, stayRange) → { entries: RoomEntry[]; counts: RoomCounts }
3. filterEntriesByStatus(entries, status) → RoomEntry[]

Safety: run existing tests before AND after. Write domain tests.
Follow frontend/.claude/rules/extract-domain.md and testing.md.
Commit: "refactor: extract room filtering from useMobileTimelineFilters"
```

---

### A7: useCheckInData → checkInPrep.ts

```
/extract-domain

Extract check-in data prep from useCheckInData — Phase A7 from frontend/EXTRACT_DOMAIN_PLAN.md

Branch: cd frontend && git checkout refactor/extract-timeline (ต่อจาก A6)

Hook: src/features/timeline/hooks/useCheckInData.ts

Extract to: src/features/timeline/domain/checkInPrep.ts

Functions to extract:
1. partitionStaysByStatus(stays) → { unassigned, assigned, checkedIn }
2. extractCheckInCheckOutDates(stays) → { checkIn, checkOut }
3. buildRoomsByTypeMap(availability, neededTypeIds) → RoomTypeGroup[]
4. extractAssignedRoomIds(booking) → Set<string>

Note: buildRoomsByTypeMap is also used in useCheckInAvailability (bookings) —
consider if this should go to shared/domain/roomAvailability.ts instead.

Safety: run existing tests before AND after. Write domain tests.
Follow frontend/.claude/rules/extract-domain.md and testing.md.
Commit: "refactor: extract check-in data prep from useCheckInData"
```

---

### A8: useInlineBookingForm → (shared with bookings domain)

```
/extract-domain

Extract form logic from useInlineBookingForm — Phase A8 from frontend/EXTRACT_DOMAIN_PLAN.md

Branch: cd frontend && git checkout refactor/extract-timeline (ต่อจาก A7)

Hook: src/features/timeline/hooks/useInlineBookingForm.ts

Extract to: src/features/bookings/domain/formValidation.ts
(shared domain file — will also be used by useCreateBookingForm in Phase B)

Functions to extract:
1. calculateTotalAmount(selectedRooms, nights) → number
2. validateBookingForm(hasGuest, hasPayment, isPending) → boolean
3. buildSubmitLabel(source, paymentMode) → string
4. buildCreateBookingPayload(state, prefill, depositAmount) → CreateBookingPayload

Note: formReducer is already extracted within the hook file ✓

Since this creates a shared domain file, check if useCreateBookingForm
has similar functions — merge into one file if signatures are compatible.

Safety: run existing tests before AND after. Write domain tests.
Follow frontend/.claude/rules/extract-domain.md and testing.md.
Commit: "refactor: extract form validation/payload logic from useInlineBookingForm"

This is the last hook in Phase A — branch refactor/extract-timeline is ready for review/merge.
```

---

## Phase B — Bookings Domain

### B1: useAddStayForm → stayManagement.ts

```
/extract-domain

Extract stay management logic from useAddStayForm — Phase B1 from frontend/EXTRACT_DOMAIN_PLAN.md

Branch: cd frontend && git checkout -b refactor/extract-bookings (สร้างใหม่จาก main หลัง merge refactor/extract-timeline)

Hook: src/features/bookings/booking-detail/stay/useAddStayForm.ts

Extract to: src/features/bookings/domain/stayManagement.ts

Functions to extract:
1. calculateStayTotalPrice(drafts, roomTypes) → number — uses date math for nights
2. isRoomTaken(draft, allDrafts) → boolean — date overlap detection across drafts
3. deduplicateDatePairs(drafts) → DatePair[] — unique date ranges from drafts
4. validateStayDrafts(drafts) → { isValid: boolean; errors?: string[] }
5. buildStayPayload(draft) → CreateStayPayload

This hook has the most complex business logic in bookings — pricing + conflict detection.

Domain tests should cover:
- calculateStayTotalPrice: 1 night, multi-night, cross-month, different room prices
- isRoomTaken: no overlap, partial overlap, exact same dates, adjacent (touching)
- deduplicateDatePairs: all same, all different, mix
- validateStayDrafts: valid, missing room, missing dates, overlapping rooms

Safety: run existing tests before AND after.
Follow frontend/.claude/rules/extract-domain.md and testing.md.
Commit: "refactor: extract stay management logic from useAddStayForm"
```

---

### B2: useRoomTypeBuilder → roomAssignment.ts

```
/extract-domain

Extract room assignment logic from useRoomTypeBuilder — Phase B2 from frontend/EXTRACT_DOMAIN_PLAN.md

Branch: cd frontend && git checkout refactor/extract-bookings (ต่อจาก B1)

Hook: src/features/bookings/create-booking/hooks/useRoomTypeBuilder.ts

Extract to: src/features/bookings/domain/roomAssignment.ts

Functions to extract:
1. syncItemDates(items, checkIn, checkOut) → FormValues — when sameDates toggle
2. calculateUnassignedSlots(items) → boolean — has unassigned rooms?

Note: proximityAutoAssignAll is already extracted in utils ✓ — don't duplicate.

Safety: run existing tests before AND after.
Follow frontend/.claude/rules/extract-domain.md and testing.md.
Commit: "refactor: extract room assignment logic from useRoomTypeBuilder"
```

---

### B3: useCreateBookingForm → formValidation.ts (extend)

```
/extract-domain

Extract form logic from useCreateBookingForm — Phase B3 from frontend/EXTRACT_DOMAIN_PLAN.md

Branch: cd frontend && git checkout refactor/extract-bookings (ต่อจาก B2)

Hook: src/features/bookings/create-booking/hooks/useCreateBookingForm.ts

Extend: src/features/bookings/domain/formValidation.ts (created in Phase A8)

Functions to extract:
1. validateCreateBookingForm(values) → { hasGuest, hasValidItems, hasPayment }
2. calculateSubmitLabel(source, paymentMode) → string — อาจซ้ำกับ A8, merge ถ้าได้
3. buildCreateBookingPayload(values, items, depositAmount) → CreateBookingPayload

Check for overlap with functions from Phase A8 (useInlineBookingForm).
Merge compatible signatures, keep separate if logic differs significantly.

Note: expandGroupedStays is already in utils ✓

Safety: run existing tests before AND after.
Follow frontend/.claude/rules/extract-domain.md and testing.md.
Commit: "refactor: extract form validation from useCreateBookingForm"
```

---

### B4: useCheckInAvailability → checkInAvailability.ts

```
/extract-domain

Extract check-in availability from useCheckInAvailability — Phase B4 from frontend/EXTRACT_DOMAIN_PLAN.md

Branch: cd frontend && git checkout refactor/extract-bookings (ต่อจาก B3)

Hook: src/features/bookings/shared/hooks/useCheckInAvailability.ts

Extract to: src/features/bookings/domain/checkInAvailability.ts
— OR merge into shared/domain/roomAvailability.ts if A7 created it

Functions to extract:
1. extractDateRange(stays) → { checkIn, checkOut }
2. buildRoomsByTypeMap(availability) → Map<string, Room[]>
3. extractSelectedRoomIds(stays, selections) → Set<string>

Check Phase A7 (useCheckInData) — buildRoomsByTypeMap may already exist
in shared/domain/roomAvailability.ts. Reuse if compatible.

Safety: run existing tests before AND after.
Follow frontend/.claude/rules/extract-domain.md and testing.md.
Commit: "refactor: extract check-in availability logic"
```

---

### B5: useReceiptBillingState → billingRules.ts

```
/extract-domain

Extract billing rules from useReceiptBillingState — Phase B5 from frontend/EXTRACT_DOMAIN_PLAN.md

Branch: cd frontend && git checkout refactor/extract-bookings (ต่อจาก B4)

Hook: src/features/bookings/booking-detail/hooks/useReceiptBillingState.ts

Extract to: src/features/bookings/domain/billingRules.ts

Functions to extract:
1. buildReceiptUrl(bookingId, billingMode, stays, date) → string
2. isValidBillingSelection(mode, selections) → boolean

Safety: run existing tests before AND after.
Follow frontend/.claude/rules/extract-domain.md and testing.md.
Commit: "refactor: extract billing rules from useReceiptBillingState"

This is the last hook in Phase B — branch refactor/extract-bookings is ready for review/merge.
```

---

## Phase C — Payment & Receipt

### C1: usePaymentPanel → paymentCalc.ts

```
/extract-domain

Extract payment logic from usePaymentPanel — Phase C1 from frontend/EXTRACT_DOMAIN_PLAN.md

Branch: cd frontend && git checkout -b refactor/extract-payment (สร้างใหม่จาก main หลัง merge refactor/extract-bookings)

Hook: src/features/bookings/booking-detail/payment/usePaymentPanel.ts

Extract to: src/features/bookings/domain/paymentCalc.ts

Functions to extract:
1. buildCreatePayload(values: PaymentFormValues) → CreatePaymentPayload
2. buildEditPayload(original: PaymentResponse, values: PaymentFormValues) → Record<string, unknown> | null

Domain tests:
- buildEditPayload: changed fields only, no changes → null, all fields changed
- buildCreatePayload: all payment methods, edge amounts

Safety: run existing tests before AND after.
Follow frontend/.claude/rules/extract-domain.md and testing.md.
Commit: "refactor: extract payment payload logic from usePaymentPanel"
```

---

### C2: useReceiptPrefill → prefillLogic.ts

```
/extract-domain

Extract prefill logic from useReceiptPrefill — Phase C2 from frontend/EXTRACT_DOMAIN_PLAN.md

Branch: cd frontend && git checkout refactor/extract-payment (ต่อจาก C1)

Hook: src/features/receipts/hooks/useReceiptPrefill.ts

Extract to: src/features/receipts/domain/prefillLogic.ts

Functions to extract:
1. mapPrefillToFormValues(prefill: PrefillData) → Partial<ReceiptFormValues>
2. buildPrefillNotes(guestName?: string, guestPhone?: string) → string | undefined

Domain tests:
- mapPrefillToFormValues: all payment methods (METHOD_MAP), items mapping, missing fields
- buildPrefillNotes: both name+phone, only name, only phone, neither

Safety: run existing tests before AND after.
Follow frontend/.claude/rules/extract-domain.md and testing.md.
Commit: "refactor: extract prefill logic from useReceiptPrefill"

This is the last hook in Phase C — branch refactor/extract-payment is ready for review/merge.
```

---

## Phase D — Shared

### D1: useDateRangeFilter → dateRange.ts

```
/extract-domain

Extract date range logic from useDateRangeFilter — Phase D1 from frontend/EXTRACT_DOMAIN_PLAN.md

Branch: cd frontend && git checkout -b refactor/extract-shared (สร้างใหม่จาก main หลัง merge refactor/extract-payment)

Hook: src/shared/hooks/useDateRangeFilter.ts

Extract to: src/shared/domain/dateRange.ts

Functions to extract:
1. calculateDayClick(pendingStart, pendingEnd, day) → { start, end }

Note: toApiDate and fromApiDate are already extracted ✓

Domain tests:
- First click (no pending) → sets start
- Second click after start → sets end (ordered)
- Second click before start → swaps start/end
- Click same day as start → resets

Safety: run existing tests before AND after.
Follow frontend/.claude/rules/extract-domain.md and testing.md.
Commit: "refactor: extract date range logic from useDateRangeFilter"

This is the last phase — branch refactor/extract-shared is ready for review/merge.
All extract-domain work is complete. Update EXTRACT_DOMAIN_PLAN.md to mark all phases ✅.
```
