# Refactor Plan — Large Component Files

> วิเคราะห์จาก react-best-practices: re-render optimization, bundle size, maintainability

## สรุปขนาดไฟล์

| # | File | Lines | Sub-components ภายใน | ปัญหาหลัก |
|---|------|------:|---------------------|-----------|
| 1 | DesktopOperationsPanel.tsx | 1,469 | 8 sub-components | inline sub-components ทั้งหมด ไม่แยกไฟล์ |
| 2 | BookingDetailPage.tsx | 1,358 | 3 sub-components | StayCardOperational 654 บรรทัด มี 2 modal ซ้อนอยู่ |
| 3 | MobileTimelineList.tsx | 1,257 | 4 sub-components | classifyRooms 100+ บรรทัด + duplicate types กับ Desktop |
| 4 | TimelinePage.tsx | 1,086 | 1 sub-component | state/hooks/handlers 300+ บรรทัดก่อนถึง JSX |

---

## Priority 1 — BookingDetailPage.tsx (1,358 lines)

**ทำไมก่อน:** StayCardOperational (654 บรรทัด) มี transfer modal + extend modal ซ้อนอยู่ — ทุกครั้งที่ booking detail re-render จะ re-evaluate modal ทั้งหมดแม้ไม่ได้เปิด

### แยกออก:
| Component/Hook | Lines | คำอธิบาย |
|---------------|------:|----------|
| `StayCardOperational.tsx` | ~300 | card หลัก + action buttons + mini timeline |
| `TransferStayModal.tsx` | ~200 | date picker + conflict resolution 2-step modal |
| `ExtendStayModal.tsx` | ~200 | extend checkout date modal |
| `ReceiptSection.tsx` | ~200 | invoice management + stay selection |
| `EventTimeline.tsx` | ~50 | audit log display |
| `bookingStatusHelpers.ts` | ~30 | status→badge variant, date helpers |

**ผลลัพธ์:** BookingDetailPage เหลือ ~400 บรรทัด (header + tabs + delegation)

---

## Priority 2 — DesktopOperationsPanel.tsx (1,469 lines)

**ทำไมก่อน:** มี 8 sub-components อัดรวมในไฟล์เดียว — แก้ไขยาก, Vite HMR ช้า

### แยกออก:
| Component/Hook | Lines | คำอธิบาย |
|---------------|------:|----------|
| `PendingAssignmentsSection.tsx` | ~200 | จัดกลุ่ม unassigned stays + auto-assign |
| `InlineCheckInPanel.tsx` | ~300 | multi-room check-in expansion panel |
| `InlineRoomPicker.tsx` | ~120 | room assignment picker |
| `CheckOutCards.tsx` | ~200 | SingleRoomCheckOutCard + MultiRoomCheckOutRow + CheckOutAllButton |
| `SingleRoomCheckInCard.tsx` | ~70 | compact check-in card |

**ผลลัพธ์:** DesktopOperationsPanel เหลือ ~500 บรรทัด (KPI + checkin/checkout list + delegation)

---

## Priority 3 — MobileTimelineList.tsx (1,257 lines)

**ทำไมก่อน:** classifyRooms + shared types ซ้ำกับ Desktop — แก้ที่เดียวลืมอีกที่

### แยกออก:
| Component/Hook | Lines | คำอธิบาย |
|---------------|------:|----------|
| `classifyRooms.ts` | ~120 | pure function + RoomEntry/RoomCounts types — ใช้ร่วม Desktop ได้ |
| `RoomCard.tsx` | ~100 | memoized room status card |
| `operationTypes.ts` | ~40 | CheckinBooking, CheckoutStay, CheckoutBooking — shared กับ Desktop |
| `CheckOutCardMobile.tsx` | ~100 | mobile checkout card variants |

**ผลลัพธ์:** MobileTimelineList เหลือ ~800 บรรทัด (KPI + room list + operations)

---

## Priority 4 — TimelinePage.tsx (1,086 lines)

**ทำไมต่ำ:** ส่วนใหญ่เป็น orchestration (state + hooks + handlers) ไม่ใช่ UI ซ้ำ — แยก component ไม่ช่วยเรื่อง re-render เท่า P1-P3

### แยกออก:
| Component/Hook | Lines | คำอธิบาย |
|---------------|------:|----------|
| `useTimelineState.ts` | ~100 | zoom, drawer, date range, mobile anchor state |
| `useTimelineDerivedData.ts` | ~150 | roomTypeNameMap, bookingColorMap, unassigned filter |
| `MobileDateStrip.tsx` | ~60 | date slider component (อยู่ inline แล้ว) |
| `TimelineDesktopView.tsx` | ~200 | desktop grid + virtualizer (optional, ถ้ามีเวลา) |

**ผลลัพธ์:** TimelinePage เหลือ ~600 บรรทัด (hooks + mobile/desktop branching)

---

## Shared Extractions (ทำระหว่าง P2-P3)

| File | ใช้โดย | คำอธิบาย |
|------|--------|----------|
| `operationTypes.ts` | Desktop + Mobile | CheckinBooking, CheckoutStay interfaces |
| `classifyRooms.ts` | Mobile (+ Desktop ถ้า refactor) | room status classification |
| `toDateStr.ts` | Desktop + Mobile | `s.slice(0,10)` — ซ้ำ 2 ที่ |

---

## หลักการ

1. **แยก sub-component ก่อน** — ไม่กระทบ logic, แค่ย้ายไฟล์ + export
2. **แยก shared types/utils ต่อ** — ลด duplication
3. **แยก hooks ทีหลัง** — ต้องระวังเรื่อง dependency chain
4. **ทำทีละ Priority** — commit แยก, test ทุกครั้ง
5. **ไม่เปลี่ยน behavior** — pure refactor, ไม่แก้ logic
