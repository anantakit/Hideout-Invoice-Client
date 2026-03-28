# Extract Domain Logic Plan

## บริบท

ตอนนี้ hooks หลายตัวรวม business logic + orchestration + side effects ไว้ด้วยกัน ทำให้:
- Test ต้อง dig เข้า implementation details (mock.calls callback, form.setValue args)
- Test เปราะ — refactor hook แล้ว test พัง ทั้งที่ behavior ไม่เปลี่ยน
- อ่านยาก — ไม่รู้ว่า logic อยู่ตรงไหน

## แนวทาง: แยก 3 layers

```
Domain (pure functions)     → business logic, ไม่มี React
Hook (orchestration)        → เรียก domain + mutate + จัดการ state
Component (UI)              → render + user interaction
```

### Test ของแต่ละ layer

| Layer | Test แบบไหน | Mock อะไร |
|-------|------------|-----------|
| Domain | input → output, edge cases | ไม่มี mock |
| Hook | wiring เบาๆ — เรียก domain ถูก, เรียก mutate ถูก, state transitions | mock API layer |
| Component | user เห็นอะไร, assert outcome จริง | mock hook ทั้งตัว |

## ลำดับการทำ

```
✅ Phase 0-3  test เสร็จแล้ว (safety net พร้อม)
⬜ Phase 4-6  test ที่เหลือ
⬜ Extract    ย้าย logic ออกจาก hooks → pure functions
⬜ Migrate    ย้าย test ให้ตรง layer
```

**ทำ test ทุก phase ให้เสร็จก่อน → แล้วค่อย extract** เพราะ test เดิมเป็น safety net คุ้มครองตอน refactor

---

## สรุปภาพรวม

| หมวด | hooks ทั้งหมด | มี logic ควร extract | thin wrapper |
|------|:---:|:---:|:---:|
| Timeline | 14 | **10** | 4 |
| Bookings | 12 | **8** | 4 |
| Receipts | 2 | 1 | 1 |
| Shared | 6 | 1 | 5 |
| Rooms / Customers / Users | 9 | 0 | 9 |
| Dashboard | 1 | 0 | 1 |
| **รวม** | **53** | **23** | **30** |

---

## Extract Phase A — Timeline Domain (🔴 Critical)

Timeline เป็น logic-heavy ที่สุด — geometry math, conflict detection, virtualization ล้วนเป็น pure functions ที่ test ได้ง่ายมากถ้าแยกออกมา

### A1: `useTimelineDrag` → `timeline/domain/dragSnapping.ts` ✅

**ปัจจุบัน:** hook ทำทั้ง pointer events + snap geometry + conflict check + auto-scroll + preview

**Extract:**
```typescript
// timeline/domain/dragSnapping.ts (pure)
function snapDragToGrid(clientX, containerLeft, cellWidth, mode, originalSpan, grabOffset): SnapResult
function checkConflict(targetRoomId, checkIn, checkOut, excludeStayId, bookings): boolean
function calculateAutoScroll(pointerPos, containerRect, currentScroll): { dx: number; dy: number }
function updatePreviewPosition(checkIn, checkOut, roomId, windowStart, cellWidth, roomTopMap): DragPreviewPosition
function calculateGrabDayOffset(pointerX, bookingLeftX, cellWidth): number
```

**Hook เหลือ:** pointer event handler + state manager ที่เรียก pure functions

**Test เปลี่ยน:**
- Domain → test snap edge cases, conflict overlap, auto-scroll velocity curves
- Hook → test: pointer down → snap called, conflict → revert

---

### A2: `useTimelineState` → `timeline/domain/computeState.ts` ✅

**ปัจจุบัน:** monolithic hook ~800 lines, มี 8+ derived computations ที่เป็น pure

**Extract:**
```typescript
// timeline/domain/computeState.ts (pure)
function buildBookingRoomCountMap(allRooms): Record<string, number>
function buildBookingColorMap(allRooms): Record<string, string>
function computeRowHeights(allRooms, roomLayerCountMap): Record<string, number>
function buildRoomMaps(availRoomTypes): { typeIdMap, typeNameMap, priceMap }
function filterRoomsByType(allRooms, selectedTypeId): TimelineRoom[]
function buildMobileDateStrip(mobileAnchor, stripDays, centerOffset): Date[]
function calculateTodayPendingCheckinCount(unassignedStays, allRooms, todayStr): number
```

> `computeDateKPI` ถูก extract ไว้แล้ว ✓

**Test เปลี่ยน:**
- Domain → test color assignment, row height calculation, room filtering
- Hook → test: state transitions, query orchestration

---

### A3: `useInfiniteTimeline` → `timeline/domain/infiniteScroll.ts` ✅

**Extract:**
```typescript
// timeline/domain/infiniteScroll.ts (pure)
function calculateBufferStart(currentDate, bufferDays): Date
function calculateVisibleRange(scrollLeft, bufferStart, cellWidth, viewportWidth): { startDay, visibleDays }
function shouldShiftBuffer(scrollLeft, totalWidth, viewportWidth, threshold): 'left' | 'right' | null
function calculateJumpTarget(targetDate, bufferDays, cellWidth): number
```

**Test เปลี่ยน:**
- Domain → test buffer boundaries, visible range at extremes, shift thresholds

---

### A4: `useTimelineDraw` → `timeline/domain/drawGeometry.ts` ✅

**Extract:**
```typescript
// timeline/domain/drawGeometry.ts (pure)
function getDayIndex(clientX, containerRect, cellWidth): number
function calculateDrawDateRange(startDay, currentDay, windowStart): { checkIn, checkOut }
function isCellEmpty(roomId, checkIn, checkOut, bookings): boolean
```

**Test เปลี่ยน:**
- Domain → test day index at edges, date range with reversed selection, cell conflict

---

### A5: `usePendingGroups` → `timeline/domain/stayAggregation.ts` ✅

**Extract:**
```typescript
// timeline/domain/stayAggregation.ts (pure)
function groupUnassignedStaysByBooking(stays): Map<string, PendingBookingGroup>
function createDateSections(grouped, todayStr): PendingDateSectionData[]
function formatDateLabel(dateStr, todayStr): string
```

**Hook เหลือ:** สอง useMemo calls ที่ wrap pure functions

---

### A6: `useMobileTimelineFilters` → `timeline/domain/roomFiltering.ts` ✅

**Extract:**
```typescript
// timeline/domain/roomFiltering.ts (pure)
function countUnassignedForDate(unassignedStays, dateStr): number
function buildRangeEntries(entries, stayRange): { entries: RoomEntry[]; counts: RoomCounts }
function filterEntriesByStatus(entries, status): RoomEntry[]
```

---

### A7: `useCheckInData` → `timeline/domain/checkInPrep.ts` ✅

**Extract:**
```typescript
// timeline/domain/checkInPrep.ts (pure)
function partitionStaysByStatus(stays): { unassigned, assigned, checkedIn }
function extractCheckInCheckOutDates(stays): { checkIn: string; checkOut: string }
function buildRoomsByTypeMap(availability, neededTypeIds): RoomTypeGroup[]
function extractAssignedRoomIds(booking): Set<string>
```

---

### A8: `useInlineBookingForm` → (ใช้ shared domain ร่วมกับ Bookings) ✅

**Extract:**
```typescript
// bookings/domain/formValidation.ts (shared กับ Phase B)
function calculateTotalAmount(selectedRooms, nights): number
function validateBookingForm(hasGuest, hasPayment, isPending): boolean
function buildSubmitLabel(source, paymentMode): string
function buildCreateBookingPayload(state, prefill, depositAmount): CreateBookingPayload
```

> `formReducer` ถูก extract ไว้แล้วใน hook file ✓

---

## Extract Phase B — Bookings Domain (🟠 High)

### B1: `useAddStayForm` → `bookings/domain/stayManagement.ts` ✅

**ปัจจุบัน:** hook ทำทั้ง pricing + conflict detection + draft management

**Extract:**
```typescript
// bookings/domain/stayManagement.ts (pure)
function calculateStayTotalPrice(drafts, roomTypes): number
function isRoomTaken(draft, allDrafts): boolean
function deduplicateDatePairs(drafts): DatePair[]
function validateStayDrafts(drafts): { isValid: boolean; errors?: string[] }
function buildStayPayload(draft): CreateStayPayload
```

**Test เปลี่ยน:**
- Domain → test pricing with different night counts, overlap detection edge cases
- Hook → test: draft add/remove, submit calls mutate

---

### B2: `useRoomTypeBuilder` → `bookings/domain/roomAssignment.ts` ✅

**Extract:**
```typescript
// bookings/domain/roomAssignment.ts (pure)
function syncItemDates(items, checkIn, checkOut): FormValues  // when sameDates toggle
function calculateUnassignedSlots(items): boolean
```

> `proximityAutoAssignAll` ถูก extract ไว้แล้วใน utils ✓

---

### B3: `useCreateBookingForm` → `bookings/domain/formValidation.ts` ✅

**Extract:**
```typescript
// bookings/domain/formValidation.ts (pure)
function validateCreateBookingForm(values): { hasGuest, hasValidItems, hasPayment }
function calculateSubmitLabel(source, paymentMode): string
function buildCreateBookingPayload(values, items, depositAmount): CreateBookingPayload
```

> `expandGroupedStays` ถูก extract ไว้แล้วใน utils ✓

---

### B4: `useCheckInAvailability` → `bookings/domain/checkInAvailability.ts` ✅

**Extract:**
```typescript
// bookings/domain/checkInAvailability.ts (pure)
function extractDateRange(stays): { checkIn, checkOut }
function buildRoomsByTypeMap(availability): Map<string, Room[]>
function extractSelectedRoomIds(stays, selections): Set<string>
```

---

### B5: `useReceiptBillingState` → `bookings/domain/billingRules.ts` ✅

**Extract:**
```typescript
// bookings/domain/billingRules.ts (pure)
function buildReceiptUrl(bookingId, billingMode, stays, date): string
function isValidBillingSelection(mode, selections): boolean
```

---

## Extract Phase C — Payment & Receipt (🟡 Medium)

### C1: `usePaymentPanel` → `bookings/domain/paymentCalc.ts` ✅

**Extract:**
```typescript
// bookings/domain/paymentCalc.ts (pure)
function buildCreatePayload(values: PaymentFormValues): CreatePaymentPayload
function buildEditPayload(original: PaymentResponse, values: PaymentFormValues): Record<string, unknown> | null
```

**Hook เหลือ:**
```typescript
function onEditSubmit(paymentId, original, values) {
  const payload = buildEditPayload(original, values)
  if (!payload) { cancelEdit(); return }
  updatePayment.mutate({ paymentId, payload }, { onSuccess: ... })
}
```

---

### C2: `useReceiptPrefill` → `receipts/domain/prefillLogic.ts` ✅

**Extract:**
```typescript
// receipts/domain/prefillLogic.ts (pure)
function mapPrefillToFormValues(prefill: PrefillData): Partial<ReceiptFormValues>
function buildPrefillNotes(guestName?: string, guestPhone?: string): string | undefined
```

---

## Extract Phase D — Shared (🟢 Low)

### D1: `useDateRangeFilter` → `shared/domain/dateRange.ts`

**Extract:**
```typescript
// shared/domain/dateRange.ts (pure)
function calculateDayClick(pendingStart, pendingEnd, day): { start, end }
```

> `toApiDate`, `fromApiDate` ถูก extract ไว้แล้ว ✓

---

## Hooks ที่ไม่ต้อง extract (Thin Wrappers)

mutation-only, query-only, re-export, utility hooks **30 ตัว** — ไม่มี business logic:

- **Rooms**: useRoomMutations, useRoomTypeMutations, useUpdateRoomStatus, useRoomPageState
- **Customers**: useCreateCustomer, useUpdateCustomer, useDeleteCustomer
- **Users**: useCreateUser, useUpdateUser, useDeleteUser
- **Bookings**: useBookingListFilters (minor), useStayAvailability (uses imported utils)
- **Timeline**: useBookingBlockDrag, useTimelineActions, useTimelineDrawCreate, useTimeline
- **Receipts**: useCreateReceipt
- **Dashboard**: useDashboard
- **Shared**: usePaginatedQuery, useDataTable, useIsMobile, useDebounce, useInvoicePrefill, useCustomerMutations
- **Auth/other**: thin wrappers

---

## Shared Domain Modules (Cross-Feature)

บาง logic ซ้ำข้าม features — ควร extract เป็น shared domain:

| Module | Functions | ใช้ใน hooks |
|--------|-----------|-------------|
| `shared/domain/roomAvailability.ts` | buildRoomsByTypeMap, extractAssignedRoomIds | useCheckInData, useCheckInAvailability, useRoomPickerData |
| `bookings/domain/formValidation.ts` | validateForm, buildPayload, buildSubmitLabel | useCreateBookingForm, useInlineBookingForm |
| `bookings/utils/bookingCalc.ts` | calcNights, calcLineTotal | useTotalAmount, useAddStayForm (มีอยู่แล้ว ✓) |

---

## Checklist สำหรับ extract แต่ละ hook

1. [ ] อ่าน hook — ระบุส่วนที่เป็น pure logic (ไม่ใช้ React, ไม่เรียก API)
2. [ ] สร้างไฟล์ domain ใน `domain/` ข้าง hook (หรือ shared ถ้าใช้ข้าม feature)
3. [ ] ย้าย logic → pure function, export
4. [ ] Hook import แล้วเรียก domain function
5. [ ] Run test เดิม — ต้อง pass ทั้งหมด (safety net)
6. [ ] เขียน domain test ใหม่ (pure, ไม่มี mock)
7. [ ] ลด hook test — เอา implementation detail assertions ออก
8. [ ] Run ทั้งหมดอีกรอบ — pass + coverage ไม่ลด

---

## Priority Matrix

| Phase | Scope | Hooks | Est. Pure Functions | ความซับซ้อน | คุณค่า |
|-------|-------|:-----:|:-------------------:|:-----------:|:-----:|
| **A** | Timeline | 8 | ~30 | สูง | 🔴 Critical |
| **B** | Bookings | 5 | ~15 | กลาง | 🟠 High |
| **C** | Payment & Receipt | 2 | ~4 | ต่ำ | 🟡 Medium |
| **D** | Shared | 1 | ~1 | ต่ำ | 🟢 Low |
| | **รวม** | **16** | **~50** | | |

> Hooks 7 ตัวที่เหลือ (จาก 23 ที่มี logic) มี logic น้อยมากหรือ extract ไว้บางส่วนแล้ว — ทำได้ตอน refactor ทีหลัง
