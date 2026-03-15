# React Performance Review — Hideout PMS Frontend

> วันที่รีวิว: 15 มี.ค. 2569
> เครื่องมือ: react-best-practices skill (40+ rules)
> ขอบเขต: ทุกไฟล์ .tsx/.ts ใน src/ (26,898 บรรทัด, 50+ ไฟล์)

## สัญลักษณ์

- ⬜ ยังไม่แก้
- ✅ แก้แล้ว
- 🟢 ไม่มีปัญหา

---

## สรุปภาพรวม

| ไฟล์ | บรรทัด | Critical | High | Medium | สถานะ |
|------|--------|----------|------|--------|-------|
| DesktopOperationsPanel.tsx | 1548 | 1 | 2 | 2 | ✅ |
| OperationsDrawer.tsx | 896 | 0 | 1 | 3 | ✅ |
| BookingDetailPage.tsx | 1353 | 2 | 3 | 3 | ✅ |
| TimelinePage.tsx | 1077 | ~~4~~ ~~3~~ 1 | 5 | ~~4~~ 3 | ⬜ P2 partial |
| MobileTimelineList.tsx | 1271 | ~~1~~ 0 | 3 | ~~5~~ 4 | ⬜ P1 partial |
| useTimelineDrag.ts | 729 | ~~3~~ 0 | ~~4~~ 3 | 4 | ⬜ P2 partial |
| useTimelineDraw.ts | 258 | ~~1~~ 0 | ~~1~~ 0 | ~~1~~ 0 | ✅ |
| BookingBlock.tsx | 493 | ~~1~~ 0 | 0 | 1 | ⬜ P1 partial |
| RoomRow.tsx | 295 | 0 | ~~2~~ ~~1~~ 0 | 1 | ⬜ P1 partial |
| BookingContextMenu.tsx | 267 | 0 | 1 | 1 | ⬜ |
| CreateBookingPage.tsx | 444 | ~~1~~ 0 | 0 | ~~3~~ ~~1~~ 0 | ⬜ P1 partial |
| CreateReceiptPage.tsx | 492 | ~~2~~ 1 | ~~4~~ ~~3~~ 2 | 4 | ⬜ P2 partial |
| CalendarRangeModal.tsx | 683 | 0 | 0 | ~~3~~ ~~2~~ 1 | ⬜ P1 partial |
| AssignRoomBottomSheet.tsx | 649 | 0 | 1 | 3 | ⬜ |
| RoomTypeBookingBuilder.tsx | 613 | 0 | 1 | ~~4~~ ~~3~~ 2 | ⬜ P1 partial |
| EarlyCheckoutDialog.tsx | ~160 | ~~1~~ 0 | 0 | 1 | ⬜ P1 done (Critical ✅) |
| DateRangeFilter.tsx | 543 | 0 | ~~2~~ ~~1~~ 0 | 0 | ⬜ P1 done (High ✅) |
| ReceiptDateFilter.tsx | 460 | 0 | 1 | 1 | ⬜ |
| TimelineToolbar.tsx | 496 | 0 | ~~1~~ 0 | 1 | ⬜ P1 done (High ✅) |
| ReceiptHistoryPage.tsx | 342 | 0 | 2 | 1 | ⬜ |
| SearchableComboBox.tsx | 336 | 0 | 1 | 3 | ⬜ |
| DashboardPage.tsx | 335 | 0 | 0 | ~~4~~ ~~3~~ 2 | ⬜ P1 partial |
| InlineCheckIn.tsx | 334 | 0 | ~~2~~ ~~1~~ 0 | 2 | ⬜ P1 partial |
| OccupancyPressureChart.tsx | 347 | 1 | 0 | 3 | ⬜ |
| RevenueTrendChart.tsx | 294 | 0 | 0 | ~~3~~ ~~1~~ 0 | ⬜ P1 done (Medium ✅) |
| OccupancyTrendChart.tsx | 194 | 0 | 0 | ~~2~~ ~~1~~ 0 | ⬜ P1 done (Medium ✅) |
| TodayActionPanel.tsx | 239 | 0 | ~~1~~ 0 | ~~1~~ 0 | ✅ P1 done |
| PaymentPanel.tsx | 267 | 0 | 0 | 2 | ⬜ |
| Sidebar.tsx | 276 | 0 | ~~1~~ 0 | 0 | ✅ |
| CustomerModal.tsx | 229 | 0 | 2 | 0 | ⬜ |
| PendingAssignmentsPanel.tsx | 161 | 0 | ~~1~~ 0 | 0 | ✅ |
| AvailabilitySummary.tsx | 195 | 0 | 0 | 1 | ⬜ |
| AdminUsersPage.tsx | 247 | 0 | 0 | 1 | ⬜ |
| CustomersPage.tsx | 224 | 0 | 0 | 1 | ⬜ |
| BookingListPage.tsx | 420 | 0 | 0 | 2 | ⬜ |
| DateRangePicker.tsx | 261 | 0 | 0 | 1 | ⬜ |
| ThaiAddressPicker.tsx | 488 | 0 | 0 | 0 | 🟢 |
| AdminRoomsPage.tsx | 454 | 0 | 0 | 0 | 🟢 |
| ReceiptDetailPage.tsx | 325 | 0 | 0 | 0 | 🟢 |
| hooks/index.ts | 313 | 0 | 0 | 0 | 🟢 |
| api.ts | 251 | 0 | 0 | 0 | 🟢 |
| UserModal.tsx | 179 | 0 | 0 | 0 | 🟢 |
| useInfiniteTimeline.ts | 173 | 0 | 0 | 0 | 🟢 |
| **รวม** | **~17,000** | **18** | **42** | **68** | **3/43** |

---

## ✅ แก้ไขแล้ว

### DesktopOperationsPanel.tsx
- ✅ N+1 `useBooking()` ใน SingleRoomCheckInCard — ส่ง data จาก parent แทน
- ✅ Duplicated `THAI_MONTHS_SHORT`, `fmtShort`, `fmtShortISO` — import จาก utils
- ✅ `format(new Date())` → `todayISO()`
- ✅ Useless `useCallback` on `handleAutoAssign` — dependency เปลี่ยนทุก render
- ✅ Unused `format`, `addDays` imports

### OperationsDrawer.tsx
- ✅ Duplicated `THAI_DAYS`, `THAI_MONTHS_SHORT`, `fmtThaiDate`, `formatTHB`
- ✅ `format(new Date(), 'yyyy-MM-dd')` → `todayISO()` (2 จุด)
- ✅ `formatTHB()` → `formatTHBCurrency()` (ใช้ hoisted formatter)
- ✅ Unused `format` import

### BookingDetailPage.tsx
- ✅ Mutating `.sort()` on memoized arrays → `.slice().sort()`
- ✅ `format(new Date())` → `todayISO()` + `addDaysToISO()` helper (7 จุด)
- ✅ Duplicated room-group mapper → extracted `mapRoomGroups()`
- ✅ `ReceiptSection` receives `navigate` as prop → ใช้ `useNavigate()` เอง
- ✅ `transferDate` init with `format()` → `useState(todayISO)`
- ✅ Removed unused `format` import
- ✅ IIFE for date max in ReceiptSection → `addDaysToISO()` inline

---

## ⬜ ยังไม่แก้

---

### 1. TimelinePage.tsx (1077 lines)

#### CRITICAL

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| T1 | 400 | ✅ `todayStr` memoized with `[]` — ใช้ `format(startOfDay(new Date()))` แทน `todayISO()` และ stale หลังเที่ยงคืน | ใช้ `todayISO()` แทน |
| T2 | 632–640 | ✅ `getRoomTop` วน loop O(n) จาก index 0 ทุกครั้งที่ drag | Precompute cumulative heights array ใน useMemo |
| T3 | 346–357 | ⬜ `roomLayerCountMap` เรียก `computeRoomLayout` ทุก room ทุกครั้งที่ window shift | Cache by `(roomId, fromStr, toStr)` |
| T4 | 255–268 | ✅ Effect ปิด `exhaustive-deps` แต่อ่าน `selectedBooking` — stale closure risk | ใช้ functional setState updater |

#### HIGH

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| T5 | 520–524 | ⬜ `handleDrawerCheckIn` สร้างใหม่ทุกครั้งที่ `allRooms` เปลี่ยน | ใช้ ref สำหรับ room lookup |
| T6 | 216–217 | ⬜ `availFrom`/`availTo` format chain ทำให้ `useAvailabilityGrouped` อาจ fetch ซ้ำ | รวม date formatting ใน useMemo เดียว |
| T7 | 336–344 | ⬜ `bookingColorMap` iterate ทุก booking ทุกครั้งที่มี mutation | Incremental update หรือ entry-level cache |
| T8 | 826–831 | ⬜ Inline arrow function ใน onClick สร้างใหม่ทุก render เมื่อ drawer เปิด | Extract เป็น useCallback |
| T9 | 417–432 | ⬜ `todayPendingCheckinCount` nested loop นับ booking ซ้ำ | ใช้ Set deduplicate |

#### MEDIUM

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| T10 | 288–314 | ⬜ สร้าง 3 maps แยกกัน ใน 3 useMemo | รวมเป็น useMemo เดียว |
| T11 | 109–150 | ⬜ MobileDateStrip ไม่ memo แต่ละปุ่มวัน (21 ปุ่ม re-render) | Extract DateButton + React.memo |
| T12 | 364–367 | ⬜ `mobileDays` array reference เปลี่ยนทุก render | Memoize mobileDays derivation |
| T13 | 400 | ✅ ไม่ใช้ `todayISO()` utility (ซ้ำกับ utils) | Import `todayISO()` |

---

### 2. MobileTimelineList.tsx (1271 lines)

#### CRITICAL

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| M1 | 507 | ✅ ใช้ `format(new Date(), 'yyyy-MM-dd')` แทน `todayISO()` | Import `todayISO()` |

#### HIGH

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| M2 | 811–812 | ⬜ `pendingStays`/`doneStays` filter ใน checkout map ทุก render | ย้ายเข้า useMemo |
| M3 | 698–788 | ⬜ Check-in cards ไม่มี React.memo | Extract memoized CheckInCard |
| M4 | 1121–1141 | ⬜ Filter chip list สร้างใหม่ทุก render | Memoize `chipList` + `chipCounts` |

#### MEDIUM

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| M5 | 867, 912, 1222, 1251 | ✅ `.toLocaleString()` แทน `formatTHBCurrency()` | ใช้ shared formatter |
| M6 | 350 | ⬜ `Array.from(byType.entries()).map()` intermediate array | ใช้ `Array.from(byType, ([k, v]) => ...)` |
| M7 | 545–561 | ⬜ `rangeEntries` spread clone ทุก entry | Memoize range classification |
| M8 | 283–482 | ⬜ 2 mega-useMemo blocks (75+ บรรทัด) | แยก checkins vs checkouts |
| M9 | 1115 | ⬜ IIFE สำหรับ filter chip rendering | Extract component หรือ useMemo |

---

### 3. useTimelineDrag.ts (729 lines)

#### CRITICAL

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| D1 | 199–208 | ✅ Room search O(n) ทุก pointermove (60+ ครั้ง/วินาที) | ใช้ `getRoomAtY` binary search O(log n) |
| D2 | 246 | ✅ `snapToGrid` dependency chain — สร้างใหม่ทุกครั้งที่ rooms เปลี่ยน | ใช้ roomMapRef + stable callbacks |
| D3 | 147 | ✅ `checkConflict` O(n×m) rooms×bookings search ทุก snap | ใช้ roomMapRef.get() O(1) lookup |

#### HIGH

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| D4 | 326, 503 | ⬜ String allocation สำหรับ `snapKey` ทุก pointermove | Compare fields directly |
| D5 | 331–338, 507–517 | ⬜ Object spread สร้าง DragState ใหม่ 60+ ครั้ง/วินาที | ใช้ refs แทน state |
| D6 | 347 | ⬜ `runAutoScroll` dependency on `snapToGrid` — RAF restart | Extract stable function |
| D7 | 163 | ✅ `isMaintenanceRoom` linear search ทุก conflict check | ใช้ roomMapRef.get() O(1) |

#### MEDIUM

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| D8 | 261–262 | ⬜ `getRoomTop`/`getRoomHeight` เรียกแยก 2 ครั้ง | สร้าง `getRoomMetrics()` |
| D9 | 218, 226, 232 | ⬜ Date parsing 3-4 ครั้งต่อ snap | Pre-parse dates ใน handleDragStart |
| D10 | 592–593 | ⬜ Event handler wrappers สร้างใหม่ทุก dependency change | useCallback |
| D11 | 137–141 | ⬜ `roomIndexMap` ไม่ memo | Wrap ใน useMemo |

---

### 4. useTimelineDraw.ts (258 lines)

#### CRITICAL

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| DR1 | 156–157 | ✅ `format(addDays())` called per pointermove | Cache formatted strings |

#### HIGH

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| DR2 | 79–87 | ✅ `rooms.find()` + booking scan per move — N+1 pattern | roomMapRef.get() O(1) lookup |

#### MEDIUM

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| DR3 | 77 | ✅ `isCellEmpty` callback re-creation on rooms change | Stable via roomMapRef (empty deps) |

---

### 5. BookingBlock.tsx (493 lines)

#### CRITICAL

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| BB1 | 307 | ✅ `format(startOfDay(new Date()))` ใน className ทุก render | Pre-compute ด้วย useMemo หรือรับเป็น prop |

#### MEDIUM

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| BB2 | 193 | ⬜ Nested ternary ใน key handler | ใช้ map object แทน |

---

### 6. RoomRow.tsx (295 lines)

#### HIGH

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| RR1 | 61 | ✅ `format(startOfDay(new Date()))` ใน `deriveDisplayStatus()` ทุก render | ย้าย todayStr เข้า useMemo |
| RR2 | 106 | ⬜ `displayStatus` ไม่ memo | Wrap ใน `useMemo([room])` |

#### MEDIUM

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| RR3 | 219 | ⬜ Grid line array สร้างใหม่ทุก render | `useMemo([windowDays])` |

---

### 7. BookingContextMenu.tsx (267 lines)

#### HIGH

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| CM1 | 161–163 | ⬜ Date parsing/normalization ทุก render (startOfDay, parseISO ×3) | Memoize flags ใน `useMemo([booking])` |

#### MEDIUM

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| CM2 | 128 | ⬜ `onScroll` callback inline ใน effect — fragile | Define outside effect |

---

### 8. CreateBookingPage.tsx (444 lines)

#### CRITICAL

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| B1 | 83–88 | ⬜ 5 `useWatch()` ที่ top level — re-render ทุก keystroke | ย้าย watch ไป leaf components |
#### MEDIUM

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| B2 | 36–41 | ✅ Duplicate `todayStr()`/`tomorrowStr()` | Extract to shared utils |
| B3 | 401 | ✅ `.toLocaleString()` ทุก render | ใช้ `formatCompactNumber()` |
| B4 | 193–206 | ⬜ Inline `.map()` สร้าง function instances | Extract constants |

---

### 9. CreateReceiptPage.tsx (492 lines)

#### CRITICAL

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| R1 | 123 | ✅ Missing `selectedCustomer` ใน effect deps — stale closure | เพิ่มใน dependency array |
| R2 | 139, 146 | ⬜ `new Date(values.issue_date).toISOString()` sync parse | String concat |

#### HIGH

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| R3 | 319–384 | ⬜ Field array items re-render เมื่อ sibling เปลี่ยน | Extract memoized ReceiptItemRow |
| R4 | 98–99 | ✅ `methodMap` สร้างใหม่ใน effect | Hoist module-level constant |
| R5 | 117–122 | ⬜ Customer fetch waterfall — no abort | ใช้ separate useQuery |
| R6 | 152–160 | ⬜ `useCallback` deps อาจไม่ stable | ตรวจสอบ form stability |

#### MEDIUM

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| R7 | 57, 91 | ⬜ `prefilled` flag ซ้ำซ้อน | Remove, rely on query cache |
| R8 | 175–190 | ⬜ IIFE สำหรับ coverage | Extract useMemo/component |
| R9 | 83–87 | ⬜ `watchedItems` total ไม่ memo | Wrap useMemo |
| R10 | 333–360 | ⬜ Duplicated error access 3 ครั้งต่อ row | Destructure ครั้งเดียว |

---

### 10. EarlyCheckoutDialog.tsx (~160 lines)

#### CRITICAL

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| EC1 | 28 | ✅ `format(addDays(new Date(), 1))` ทุก render | ใช้ `addDaysISO(1)` จาก utils |

#### MEDIUM

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| EC2 | 36–41 | ⬜ Pricing calculations ไม่ memo | Wrap `useMemo([booking, stay])` |

---

### 11. CalendarRangeModal.tsx (683 lines)

#### MEDIUM

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| C1 | 268 | ⬜ `buildWeeks(month)` ไม่ memo | useMemo keyed on month |
| C2 | 96–100 | ✅ Duplicate `THAI_MONTHS` full array | Export จาก shared utils |
| C3 | 270–271 | ⬜ `parseISO()` ทุก render | Memoize parsed dates |

---

### 12. AssignRoomBottomSheet.tsx (649 lines)

#### HIGH

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| A1 | 236–247 | ⬜ `.sort()` อาจ mutate ใน useMemo chain | ตรวจสอบ/ใช้ `.slice().sort()` |

#### MEDIUM

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| A2 | 250 | ⬜ `.find()` หลัง useMemo — ควรรวม | รวมใน useMemo เดียว |
| A3 | 444, 455, 488 | ⬜ `Array.from(entries).map()` ซ้อน | Memoize; extract memo component |
| A4 | 71–234 | ⬜ 5 useMemo blocks dependency graph ซับซ้อน | รวม related computations |

---

### 13. RoomTypeBookingBuilder.tsx (613 lines)

#### HIGH

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| RB1 | 198–201, 331–335 | ⬜ Multiple `useWatch()` parent+child | ย้าย watch ไป child only |

#### MEDIUM

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| RB2 | 31–36 | ✅ Duplicate `todayStr()`/`tomorrowStr()` | Extract to shared utils |
| RB3 | 78 | ⬜ `.sort()` in-place อาจ mutate source | `.slice().sort()` |
| RB4 | 577–600 | ⬜ Room picker `.filter().map()` ไม่ memo | Extract memo sub-component |
| RB5 | 229–237 | ⬜ useEffect ปิด `exhaustive-deps` | เพิ่ม deps ที่ถูกต้อง |

---

### 14. DateRangeFilter.tsx (543 lines)

#### HIGH

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| DF1 | 19–23 | ✅ Duplicate `THAI_MONTHS_FULL` array locally | ใช้ shared constant |
| DF2 | 424–426 | ⬜ `preset.getRange()` เรียกทุก render เพื่อเช็ค isActive | Memoize preset comparison |

---

### 15. ReceiptDateFilter.tsx (460 lines)

#### HIGH

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| RF1 | 244–251 | ⬜ IIFE + `preset.getRange()` ทุก render สำหรับ activePresetLabel | Memoize with useMemo |

#### MEDIUM

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| RF2 | 45–46 | ⬜ `formatShort()` ซ้ำ logic กับ imported THAI_MONTHS_SHORT | ใช้ shared utility |

---

### 16. TimelineToolbar.tsx (496 lines)

#### HIGH

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| TT1 | 42–45 | ✅ Duplicate `THAI_MONTHS_FULL` array | Import shared constant |

#### MEDIUM

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| TT2 | 215–226 | ⬜ `monthOptions` useMemo with `[]` deps — correct but noted | ไม่ต้องแก้ |

---

### 17. ReceiptHistoryPage.tsx (342 lines)

#### HIGH

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| RH1 | 232–255, 289–311 | ⬜ AlertDialog markup ซ้ำ 2 ที่ (desktop + mobile) | Extract `DeleteReceiptDialog` |
| RH2 | 215–230, 276–287 | ⬜ Download button + spinner ซ้ำ 2 ที่ | Extract `ReceiptActionButtons` |

#### MEDIUM

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| RH3 | 82 | ⬜ Query invalidation scope อาจกว้างเกินไป | Ensure proper queryKey scope |

---

### 18. SearchableComboBox.tsx (336 lines)

#### HIGH

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| SC1 | 61–82 | ⬜ 3 useEffects จัดการ state transitions คล้ายกัน | Consolidate เป็น chain เดียว |

#### MEDIUM

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| SC2 | 122–197 | ⬜ `renderItems()` สร้างใหม่ทุก render | Move outside หรือ useCallback |
| SC3 | 78–80 | ⬜ RAF + useEffect scroll ซ้อน | ใช้ callback ref แทน |
| SC4 | 84–98 | ⬜ searchTerm query re-fires on trivial changes | Ensure debounced queryKey |

---

### 19. DashboardPage.tsx (335 lines)

#### MEDIUM

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| DA1 | 248–264 | ⬜ IIFE booking pace calculation | Extract useMemo |
| DA2 | 21–27 | ⬜ `currentMonth()` เรียกซ้ำ | Store ใน state ครั้งเดียว |
| DA3 | 31–34 | ✅ `formatKPI()` shadow `formatCompactNumber` | ใช้ shared utility |
| DA4 | 184–204 | ⬜ TooltipProvider wrap deep content ทุก render | ย้ายขึ้น top level |

---

### 20. InlineCheckIn.tsx (334 lines)

#### HIGH

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| IC1 | 205–209 | ✅ IIFE room label lookup ซ้ำกับ `getRoomLabel()` ที่มีอยู่แล้ว | ใช้ `getRoomLabel(stay)` |
| IC2 | 165–168 vs 206–208 | ✅ Duplicate room lookup logic ในไฟล์เดียวกัน | Remove IIFE, ใช้ function ที่มี |

#### MEDIUM

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| IC3 | 107–114 | ⬜ `selectedRoomIds` Set สร้างใหม่ทุก selection change | Stable ref |
| IC4 | 175 | ⬜ `differenceInDays()` + parseISO ×2 per stay ใน map | Precompute nights ใน useMemo |

---

### 21. OccupancyPressureChart.tsx (347 lines)

#### CRITICAL

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| OP1 | 309 | ⬜ `[...data].filter().sort()` ทุก render | Wrap ใน useMemo |

#### MEDIUM

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| OP2 | 96, 312 | ⬜ `new Date(label)` ใน tooltip ทุก render | Memoize tooltip |
| OP3 | 72, 99, 137 | ⬜ Duplicated lookup fallback pattern | Extract helper |
| OP4 | 145–152, 319–326 | ⬜ Duplicated CSS class ternary | Extract `getRiskClass()` |

---

### 22. RevenueTrendChart.tsx (294 lines)

#### MEDIUM

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| RT1 | 21–31 | ✅ THAI_SHORT_MONTHS / THAI_FULL_MONTHS ซ้ำ locally | Import จาก shared utils |
| RT2 | 77–88 | ⬜ `YoYLabel` inline function ทุก render | Move outside component |
| RT3 | 92 | ⬜ `.map()` spread into Math.max() ทุก render | Memoize max values |

---

### 23. OccupancyTrendChart.tsx (194 lines)

#### MEDIUM

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| OT1 | 23–27 | ✅ `formatCompact()` ซ้ำกับ TodayActionPanel | Extract shared utility |
| OT2 | 81–93 | ⬜ Multiple array traversals (map + 2 reduces) | Combine ใน single pass |

---

### 24. TodayActionPanel.tsx (239 lines)

#### HIGH

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| TA1 | 88 | ✅ Mutable `.sort()` ใน `buildActionItems()` | `[...items].sort()` |

#### MEDIUM

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| TA2 | 11–14 | ✅ `formatCompact()` ซ้ำกับ OccupancyTrendChart | Extract shared utility |

---

### 25. PaymentPanel.tsx (267 lines)

#### MEDIUM

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| PP1 | 115–119 | ⬜ Payment method check ซ้ำ 2 ที่ (icon + label) | Extract helper |
| PP2 | 165 | ⬜ `.toFixed(2)` ทุก render | Memoize placeholder |

---

### 26. Sidebar.tsx (276 lines)

#### HIGH

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| SB1 | 223–225 | ✅ `section.items.filter()` RBAC ทุก render | Memoize `visibleSections` keyed on `user?.role` |

---

### 27. CustomerModal.tsx (229 lines)

#### HIGH

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| CU1 | 92–98 | ⬜ `handleThaiAddrChange` useCallback deps on `syncAddress` | Inline form.setValue |
| CU2 | 85–90 | ⬜ `syncAddress` useCallback depends on unstable `form` object | Extract form.setValue as stable ref |

---

### 28. PendingAssignmentsPanel.tsx (161 lines)

#### HIGH

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| PA1 | 68 | ✅ `handleAutoAssign` useCallback has `autoAssign` mutation in deps | ใช้ `[autoAssign.mutate]` (stable ref) |

---

### 29. AvailabilitySummary.tsx (195 lines)

#### MEDIUM

| # | Line(s) | ปัญหา | แก้ไข |
|---|---------|-------|-------|
| AS1 | 45–47 | ⬜ 3 separate `reduce()` ทับ roomTypes | Combine single pass |

---

### 30. Small Files — Minor Issues

| ไฟล์ | Line(s) | ปัญหา | Level |
|------|---------|-------|-------|
| AdminUsersPage.tsx | 100, 236 | ⬜ Identical inline callback ×2 | MEDIUM |
| CustomersPage.tsx | 87, 208 | ⬜ Identical inline callback ×2 | MEDIUM |
| BookingListPage.tsx | 77–81 | ⬜ Date range reduce ไม่ memo | MEDIUM |
| BookingListPage.tsx | 59 | ⬜ `formatDateShort` ซ้ำกับ shared util | MEDIUM |
| DateRangePicker.tsx | 139 | ⬜ `.find()` per Select change | MEDIUM |

---

### 🟢 ไม่มีปัญหา (7 ไฟล์)

- ThaiAddressPicker.tsx (488 lines) — well-structured memoization
- AdminRoomsPage.tsx (454 lines) — proper TanStack Query usage
- ReceiptDetailPage.tsx (325 lines) — simple fetch + display
- hooks/index.ts (313 lines) — clean hook definitions
- api.ts (251 lines) — pure API layer
- UserModal.tsx (179 lines) — no issues
- useInfiniteTimeline.ts (173 lines) — clean infinite query

---

## ลำดับแนะนำการแก้ไข

### Phase 1: Quick Wins — `format(new Date())` + duplicates ✅ DONE
1. ✅ **T1, T13** — `todayISO()` ใน TimelinePage
2. ✅ **M1** — `todayISO()` ใน MobileTimelineList
3. ✅ **BB1, RR1** — `todayISO()` ใน BookingBlock + RoomRow
4. ✅ **DR1** — Cache formatted dates ใน useTimelineDraw
5. ✅ **EC1** — `addDaysISO()` ใน EarlyCheckoutDialog
6. ✅ **B2, RB2** — Deduplicate `todayStr()`/`tomorrowStr()`
7. ✅ **M5, B3** — `.toLocaleString()` → shared formatter
8. ✅ **R4** — Hoist `methodMap` to module level
9. ✅ **DF1, TT1, C2, RT1** — Deduplicate THAI_MONTHS arrays
10. ✅ **OT1, TA2, DA3** — Deduplicate `formatCompact()`
11. ✅ **IC1, IC2** — Remove duplicate room lookup IIFE
12. ✅ **TA1** — `.sort()` → `[...items].sort()`

### Phase 2: High-Impact Fixes — hot paths + stale closures (7/8 done)
13. ✅ **D1, D2, D3** — useTimelineDrag: roomMapRef O(1) + getRoomAtY binary search + stable callbacks
14. ✅ **DR2** — useTimelineDraw: roomMapRef O(1) + stable isCellEmpty
15. ✅ **T2** — Precompute cumulative row heights (O(1) getRoomTop)
16. ✅ **T4** — Fix stale closure via functional setState updater
17. ✅ **R1** — Fix prefill effect missing selectedCustomer dependency
18. ⬜ **B1, RB1** — Move useWatch() to leaf components (deferred — needs form restructure)
19. ✅ **SB1** — Memoize RBAC filter in Sidebar
20. ✅ **PA1** — Fix useCallback deps on mutation

### Phase 3: Component Extraction + memoization
21. **R3** — Extract memoized ReceiptItemRow
22. **M3** — Extract memoized CheckInCard
23. **RH1, RH2** — Extract shared dialog/buttons in ReceiptHistory
24. **T10** — Combine 3 map-building useMemos
25. **D5, D6** — Stabilize drag state + RAF loop
26. **CM1, RR2** — Memoize date flags in context menu + RoomRow

### Phase 4: Architecture
27. **T3** — Cache `computeRoomLayout` per room
28. **T7** — Incremental `bookingColorMap` update
29. **R5** — Refactor customer fetch to useQuery
30. **M8** — Split mega-useMemo blocks
31. **SC1** — Consolidate SearchableComboBox useEffects
32. **CU1, CU2** — Stabilize CustomerModal callbacks
