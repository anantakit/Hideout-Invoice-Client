# Frontend Test Plan

## Strategy

- **Framework**: Vitest + React Testing Library + happy-dom
- **Approach**: ทีละ feature, เริ่มจาก pure functions (ROI สูงสุด) → hooks → components
- **ไม่รวม E2E** ในแผนนี้ — unit + component tests เพียงพอสำหรับ phase แรก

---

## Phase 0 — Foundation

Setup test infrastructure ก่อนเขียน test ใดๆ

- [ ] ติดตั้ง dependencies: `vitest`, `@vitest/ui`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/user-event`, `happy-dom`
- [ ] สร้าง `vitest.config.ts` (extend จาก vite.config.ts, ใช้ happy-dom)
- [ ] เพิ่ม scripts ใน `package.json`: `test`, `test:ui`, `test:coverage`
- [ ] สร้าง `src/test/setup.ts` สำหรับ global test setup
- [ ] สร้าง `src/test/helpers.ts` สำหรับ shared test utilities (renderWithProviders, mock query client)

---

## Phase 1 — Shared Utils

`src/shared/utils.ts` — ใช้ทุก feature, pure functions ทั้งหมด

- [ ] `formatTHB(amount)` / `formatCurrency(amount)` — format เงินบาท
- [ ] `formatTHBCurrency(amount)` — format พร้อมสัญลักษณ์ ฿
- [ ] `formatCompactNumber(n)` / `formatCompact(n)` / `formatKPI(n)` — ย่อตัวเลข
- [ ] `formatThaiDate(dateString)` / `formatDate(dateString)` — วันที่ภาษาไทย (พ.ศ.)
- [ ] `fmtShort(d)`, `fmtShortWithYear(d)`, `fmtShortISO(iso)` — short date formats
- [ ] `fmtThaiDate(iso)`, `fmtShortBE(iso)`, `fmtLongBE(iso)` — Buddhist Era formats
- [ ] `formatDateInput(dateString)` — format สำหรับ input field
- [ ] `todayISO()`, `addDaysISO(days)` — ISO date helpers
- [ ] `formatPhone(phone)` — format เบอร์โทร (รวม null/undefined)
- [ ] `getErrorMessage(err, fallback?)` — extract error message
- [ ] `cn(...inputs)` — class name merge (tailwind-merge)
- [ ] `isMobileDevice()` — mobile detection

`src/shared/utils/addressUtils.ts`

- [ ] `parseAddressToThaiAddr(address)` — parse ที่อยู่ไทย
- [ ] `buildAddressString(detail, thai)` — สร้าง string ที่อยู่

---

## Phase 2 — Booking

Feature ใหญ่ที่สุด, core business logic

### Utils (pure functions)

`create-booking/utils/bookingCalc.ts`

- [ ] `calcNights(checkIn, checkOut)` — คำนวณจำนวนคืน
- [ ] `calcLineTotal(price, qty, nights)` — คำนวณยอดรวมต่อรายการ
- [ ] `calcKeyDeposit(totalRooms)` — คำนวณค่ามัดจำกุญแจ

`create-booking/utils/bookingSummaryCalc.ts`

- [ ] `calcLineItems(items, priceMap, nameMap)` — สร้าง line items สำหรับ summary
- [ ] `calcDepositSplit(paymentMode, totalRooms)` — แบ่งมัดจำตาม payment mode
- [ ] `calcTotalRooms(items)` — นับจำนวนห้องทั้งหมด

`create-booking/utils/expandGroupedStays.ts`

- [ ] `expandGroupedStays(items)` — แปลง grouped room types → individual stay payloads

`create-booking/utils/roomAssignment.ts`

- [ ] `proximityAutoAssignAll(items, availData)` — auto-assign ห้องด้วย proximity scoring
  - test: Manhattan distance calculation
  - test: same-side bonus
  - test: tiebreak logic
  - test: ไม่มีห้องว่าง → ไม่ assign

`shared/utils/bookingStatusHelpers.ts`

- [ ] `bookingStatusVariant(status)` — map status → badge variant
- [ ] `stayStatusVariant(status)` — map stay status → badge variant
- [ ] `mapRoomGroups(source, stayRoomTypeId, excludeRoomId?)` — จัดกลุ่มห้อง
- [ ] `addDaysToISO(iso, n)` — เพิ่มวันใน ISO string
- [ ] `calcNights(checkIn, checkOut)` — คำนวณคืน (duplicate ของ bookingCalc)
- [ ] `isCheckInToday(checkIn)` — เช็ควันนี้เป็นวัน check-in ไหม
- [ ] `isCheckInOverdue(checkIn)` — เช็ค check-in เลยกำหนด

`shared/utils/paymentUtils.ts`

- [ ] `filterPaymentsByType(payments, types)` — filter payments ตาม type

`shared/availabilityCalc.ts`

- [ ] `calcAvailableCount(physicalAvail, unassignedCount)` — คำนวณห้องว่างจริง

`booking-list/utils/bookingListUtils.ts`

- [ ] `getRoomInfo(booking)` — สรุปข้อมูลห้องจาก booking
- [ ] `getStayRange(booking)` — หา check-in/check-out range จาก booking

### Hooks (ถ้ามีเวลา)

- [ ] `useCreateBookingForm` — form state management + validation
- [ ] `useTotalAmount` — คำนวณยอดรวม reactive
- [ ] `useBookingListFilters` — filter state + URL sync

---

## Phase 3 — Payment & Receipt

เรื่องเงิน — ห้ามพลาด

### Receipt

- [ ] `useReceiptPrefill` — prefill receipt จาก booking data
- [ ] `useCreateReceipt` — mutation + optimistic update
- [ ] `useDeleteReceipt` — mutation + confirmation flow

### Payment

- [ ] `usePaymentPanel` — payment state + calculations
- [ ] `useReceiptBillingState` — billing state derivation

---

## Phase 4 — Dashboard

Read-only analytics, medium complexity

`utils/dashboardCalc.ts`

- [ ] `calcYTDCumulative(data)` — สะสมยอดรายเดือน
- [ ] `calcYoYPercent(current, previous)` — คำนวณ % เทียบปีก่อน (รวม edge: previous = 0)
- [ ] `calcPressureKPI(data)` — คำนวณ occupancy pressure
- [ ] `getTopInsights(data, limit)` — เรียง top insights

`utils/heatmapCalc.ts`

- [ ] `getIntensityClass(amount, max)` — map ค่า → CSS class
- [ ] `buildCalendarGrid(year, monthIdx, data)` — สร้าง grid ปฏิทิน

---

## Phase 5 — Timeline

ใหญ่ที่สุด (11K LOC) แต่ส่วนใหญ่เป็น UI — focus ที่ computation utils

`utils/bookingLayout.ts`

- [ ] `computeRoomLayout(bookings, windowStart, windowEnd)` — คำนวณ layout layers

`utils/classifyRooms.ts`

- [ ] `overlapsRange(stay, rangeStart, rangeEnd)` — เช็ค date overlap
- [ ] `classifyRooms(rooms, dateStr, roomTypeNameMap)` — จำแนกสถานะห้อง

`utils/computeDateKPI.ts`

- [ ] `computeDateKPI(rooms, unassignedStays, dateStr, roomTypeNameMap)` — KPI รายวัน

`utils/computeDateOps.ts`

- [ ] `computeDateOps(rooms, unassignedStays, selectedDateStr, roomTypeNameMap)` — checkin/checkout lists

`utils/operationTypes.ts`

- [ ] `toDateStr(s)` — extract date string
- [ ] `formatNightsLabel(ci)` — format "N คืน" label

`utils/shareOperations.ts`

- [ ] `computeStayingGuests(rooms, dateStr)` — หา guests ที่ยังอยู่
- [ ] `buildShareText(...)` — สร้าง text สำหรับ share ประจำวัน

`utils/statusColors.ts`

- [ ] `getStatusColorClass(status)` — map status → color class

`utils/tokens.ts`

- [ ] `getCellWidthPx()`, `computeRowHeight(layerCount)` — layout calculations

---

## Phase 6 — Simple Features

ขนาดเล็ก, เสริมความครบถ้วน

### Rooms

- [ ] `useRoomMutations` — CRUD mutations
- [ ] `useUpdateRoomStatus` — status update mutation

### Customers

- [ ] `addressUtils.ts` (ถ้ายังไม่ได้ test ใน Phase 1)
- [ ] `useCreateCustomer`, `useUpdateCustomer`, `useDeleteCustomer`

### Auth / Users

- [ ] Login form validation
- [ ] `useCreateUser`, `useUpdateUser`, `useDeleteUser`

---

## Shared Hooks (ตัดขวาง — ทำเมื่อ test feature ที่ใช้งาน)

- [ ] `usePaginatedQuery` — pagination + query integration
- [ ] `useDataTable` — sort + pagination state
- [ ] `useDebounce` — debounce timing
- [ ] `useIsMobile` — responsive detection

---

## Definition of Done (per phase)

1. Tests pass (`npm run test`)
2. ไม่มี test ที่ skip หรือ todo ค้าง
3. Pure function tests ครอบคลุม edge cases (null, empty, boundary values)
4. Hook tests ใช้ `renderHook` + mock API responses
