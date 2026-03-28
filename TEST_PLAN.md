# Frontend Test Plan

## Strategy

- **Framework**: Vitest + React Testing Library + happy-dom
- **Approach**: ทีละ feature, เริ่มจาก pure functions (ROI สูงสุด) → hooks → components
- **ไม่รวม E2E** ในแผนนี้ — unit + component tests เพียงพอสำหรับ phase แรก

---

## Phase 0 — Foundation

Setup test infrastructure ก่อนเขียน test ใดๆ

- [x] ติดตั้ง dependencies: `vitest`, `@vitest/ui`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/user-event`, `happy-dom`
- [x] สร้าง `vitest.config.ts` (extend จาก vite.config.ts, ใช้ happy-dom)
- [x] เพิ่ม scripts ใน `package.json`: `test`, `test:ui`, `test:coverage`
- [x] สร้าง `src/test/setup.ts` สำหรับ global test setup
- [x] สร้าง `src/test/helpers.ts` สำหรับ shared test utilities (renderWithProviders, mock query client)

---

## Phase 1 — Shared Utils

`src/shared/utils.ts` — ใช้ทุก feature, pure functions ทั้งหมด

- [x] `formatTHB(amount)` / `formatCurrency(amount)` — format เงินบาท
- [x] `formatTHBCurrency(amount)` — format พร้อมสัญลักษณ์ ฿
- [x] `formatCompactNumber(n)` / `formatCompact(n)` / `formatKPI(n)` — ย่อตัวเลข
- [x] `formatThaiDate(dateString)` / `formatDate(dateString)` — วันที่ภาษาไทย (พ.ศ.)
- [x] `fmtShort(d)`, `fmtShortWithYear(d)`, `fmtShortISO(iso)` — short date formats
- [x] `fmtThaiDate(iso)`, `fmtShortBE(iso)`, `fmtLongBE(iso)` — Buddhist Era formats
- [x] `formatDateInput(dateString)` — format สำหรับ input field
- [x] `todayISO()`, `addDaysISO(days)` — ISO date helpers
- [x] `formatPhone(phone)` — format เบอร์โทร (รวม null/undefined)
- [x] `getErrorMessage(err, fallback?)` — extract error message
- [x] `cn(...inputs)` — class name merge (tailwind-merge)
- [x] `isMobileDevice()` — mobile detection

`src/shared/utils/addressUtils.ts`

- [x] `parseAddressToThaiAddr(address)` — parse ที่อยู่ไทย
- [x] `buildAddressString(detail, thai)` — สร้าง string ที่อยู่

---

## Phase 2 — Booking

Feature ใหญ่ที่สุด, core business logic

### Utils (pure functions)

`create-booking/utils/bookingCalc.ts`

- [x] `calcNights(checkIn, checkOut)` — คำนวณจำนวนคืน
- [x] `calcLineTotal(price, qty, nights)` — คำนวณยอดรวมต่อรายการ
- [x] `calcKeyDeposit(totalRooms)` — คำนวณค่ามัดจำกุญแจ

`create-booking/utils/bookingSummaryCalc.ts`

- [x] `calcLineItems(items, priceMap, nameMap)` — สร้าง line items สำหรับ summary
- [x] `calcDepositSplit(paymentMode, totalRooms)` — แบ่งมัดจำตาม payment mode
- [x] `calcTotalRooms(items)` — นับจำนวนห้องทั้งหมด

`create-booking/utils/expandGroupedStays.ts`

- [x] `expandGroupedStays(items)` — แปลง grouped room types → individual stay payloads

`create-booking/utils/roomAssignment.ts`

- [x] `proximityAutoAssignAll(items, availData)` — auto-assign ห้องด้วย proximity scoring
  - test: Manhattan distance calculation
  - test: same-side bonus
  - test: tiebreak logic
  - test: ไม่มีห้องว่าง → ไม่ assign

`shared/utils/bookingStatusHelpers.ts`

- [x] `bookingStatusVariant(status)` — map status → badge variant
- [x] `stayStatusVariant(status)` — map stay status → badge variant
- [x] `mapRoomGroups(source, stayRoomTypeId, excludeRoomId?)` — จัดกลุ่มห้อง
- [x] `addDaysToISO(iso, n)` — เพิ่มวันใน ISO string
- [x] `calcNights(checkIn, checkOut)` — คำนวณคืน (duplicate ของ bookingCalc)
- [x] `isCheckInToday(checkIn)` — เช็ควันนี้เป็นวัน check-in ไหม
- [x] `isCheckInOverdue(checkIn)` — เช็ค check-in เลยกำหนด

`shared/utils/paymentUtils.ts`

- [x] `filterPaymentsByType(payments, types)` — filter payments ตาม type

`shared/availabilityCalc.ts`

- [x] `calcAvailableCount(physicalAvail, unassignedCount)` — คำนวณห้องว่างจริง

`booking-list/utils/bookingListUtils.ts`

- [x] `getRoomInfo(booking)` — สรุปข้อมูลห้องจาก booking
- [x] `getStayRange(booking)` — หา check-in/check-out range จาก booking

### Hooks

- [x] `useCreateBookingForm` — form state management + validation
- [x] `useTotalAmount` — คำนวณยอดรวม reactive
- [x] `useBookingListFilters` — filter state + URL sync

---

## Phase 3 — Payment & Receipt

เรื่องเงิน — ห้ามพลาด

### Receipt

- [x] `useReceiptPrefill` — prefill receipt จาก booking data
- [x] `useCreateReceipt` — mutation + optimistic update
- [x] `useDeleteReceipt` — mutation + confirmation flow

### Payment

- [x] `usePaymentPanel` — payment state + calculations
- [x] `useReceiptBillingState` — billing state derivation

---

## Phase 4 — Dashboard

Read-only analytics, medium complexity

`utils/dashboardCalc.ts`

- [x] `calcYTDCumulative(data)` — สะสมยอดรายเดือน
- [x] `calcYoYPercent(current, previous)` — คำนวณ % เทียบปีก่อน (รวม edge: previous = 0)
- [x] `calcPressureKPI(data)` — คำนวณ occupancy pressure
- [x] `getTopInsights(data, limit)` — เรียง top insights

`utils/heatmapCalc.ts`

- [x] `getIntensityClass(amount, max)` — map ค่า → CSS class
- [x] `buildCalendarGrid(year, monthIdx, data)` — สร้าง grid ปฏิทิน

---

## Phase 5 — Timeline

ใหญ่ที่สุด (11K LOC) แต่ส่วนใหญ่เป็น UI — focus ที่ computation utils

`utils/bookingLayout.ts`

- [x] `computeRoomLayout(bookings, windowStart, windowEnd)` — คำนวณ layout layers

`utils/classifyRooms.ts`

- [x] `overlapsRange(stay, rangeStart, rangeEnd)` — เช็ค date overlap
- [x] `classifyRooms(rooms, dateStr, roomTypeNameMap)` — จำแนกสถานะห้อง

`utils/computeDateKPI.ts`

- [x] `computeDateKPI(rooms, unassignedStays, dateStr, roomTypeNameMap)` — KPI รายวัน

`utils/computeDateOps.ts`

- [x] `computeDateOps(rooms, unassignedStays, selectedDateStr, roomTypeNameMap)` — checkin/checkout lists

`utils/operationTypes.ts`

- [x] `toDateStr(s)` — extract date string
- [x] `formatNightsLabel(ci)` — format "N คืน" label

`utils/shareOperations.ts`

- [x] `computeStayingGuests(rooms, dateStr)` — หา guests ที่ยังอยู่
- [x] `buildShareText(...)` — สร้าง text สำหรับ share ประจำวัน

`utils/statusColors.ts`

- [x] `getStatusColorClass(status)` — map status → color class

`utils/tokens.ts`

- [x] `getCellWidthPx()`, `computeRowHeight(layerCount)` — layout calculations

---

## Phase 6 — Simple Features

ขนาดเล็ก, เสริมความครบถ้วน

### Rooms

- [x] `useRoomMutations` — CRUD mutations
- [x] `useUpdateRoomStatus` — status update mutation

### Customers

- [x] `addressUtils.ts` (ถ้ายังไม่ได้ test ใน Phase 1)
- [x] `useCreateCustomer`, `useUpdateCustomer`, `useDeleteCustomer`

### Auth / Users

- [ ] Login form validation
- [x] `useCreateUser`, `useUpdateUser`, `useDeleteUser`

---

## Shared Hooks (ตัดขวาง — ทำเมื่อ test feature ที่ใช้งาน)

- [x] `usePaginatedQuery` — pagination + query integration
- [x] `useDataTable` — sort + pagination state
- [x] `useDebounce` — debounce timing
- [x] `useIsMobile` — responsive detection

---

## Definition of Done (per phase)

1. Tests pass (`npm run test`)
2. ไม่มี test ที่ skip หรือ todo ค้าง
3. Pure function tests ครอบคลุม edge cases (null, empty, boundary values)
4. Hook tests ใช้ `renderHook` + mock API responses
