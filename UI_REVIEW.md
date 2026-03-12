# UI/UX Review — Hideout PMS Frontend

> วันที่รีวิว: 13 มี.ค. 2569
> ภาพรวม: 7.5/10 → 8.5/10 หลังแก้ไข

## สัญลักษณ์

- ⬜ ยังไม่แก้
- ✅ แก้แล้ว

---

## High Priority (ผลกระทบ UX สูง)

| # | ปัญหา | รายละเอียด | สถานะ |
|---|--------|-----------|--------|
| 1 | Checked-out / cancelled booking จางเกินไป | `opacity-45` → `opacity-60`, cancelled border `/40` → `/70`, reserved border `/40` → `/60` + bg `/15` → `/20` | ✅ |
| 2 | Table row ไม่มี hover state | เพิ่ม `hover:bg-muted/50 transition-colors` ให้ ReceiptHistory, BookingList, AdminUsers, Customers | ✅ |
| 3 | ฟอร์มบน iPhone SE อาจแน่น | Heading ใช้ `text-xl sm:text-2xl` responsive แล้ว; pill grid ยังต้องทดสอบ 375px จริง | ✅ |
| 4 | Keyboard shortcuts ค้นไม่เจอ | เพิ่ม `?` key shortcut → help dialog แสดงคีย์ลัดทั้งหมด | ✅ |
| 5 | ไม่มี page transition | เพิ่ม CSS fade-in 180ms บน `<Outlet>` (key=pathname) | ✅ |
| A1 | ไม่มี prefers-reduced-motion | เพิ่ม global `@media (prefers-reduced-motion: reduce)` ปิด animation ทั้งหมด | ✅ |

## Medium Priority (ขัดเกลา)

| # | ปัญหา | รายละเอียด | สถานะ |
|---|--------|-----------|--------|
| 6 | Padding ไม่สม่ำเสมอ | ตรวจแล้ว — เป็น context-dependent (compact PMS vs form vs detail); ไม่ใช่ bug | ✅ |
| 7 | Resize handle ซ่อนบน touch | เพิ่ม `@media (pointer: coarse)` แสดง grip handle ตลอดบน touch device | ✅ |
| 8 | Heading style ไม่ consistent | เพิ่ม `.text-h1` / `.text-h2` tokens + ใช้กับหน้า Create/Receipt ทั้งหมด | ✅ |
| 9 | Source toggle selected state จางเกินไป | `bg-primary/5` → `bg-primary/15` ทุก toggle (CreateBooking, checkbox-card, radio-card) | ✅ |
| 10 | Dashboard recent receipts ไม่มี hover | มี `hover:bg-muted/40` อยู่แล้ว (Link component) | ✅ |

## Low Priority (ขัดละเอียด)

| # | ปัญหา | รายละเอียด | สถานะ |
|---|--------|-----------|--------|
| 11 | WCAG AAA color contrast | Badge สีเทาบน dark bg อาจ contrast ไม่พอ | ⬜ |
| 12 | ARIA roles | เพิ่ม `role="grid"` ให้ timeline grid, `role="row"` + `aria-label` ให้ RoomRow, BookingBlock มี `aria-label` อยู่แล้ว | ✅ |
| 13 | Focus management | Radix AlertDialog/Sheet มี focus trap built-in อยู่แล้ว; ตรวจสอบว่าทำงานถูกต้อง | ✅ |
| 14 | Icon size tokens | เพิ่ม `.icon-xs` (12px), `.icon-sm` (16px), `.icon-base` (20px), `.icon-lg` (24px) | ✅ |
| 15 | Skeleton loader | ใช้ opacity fade ตอน fetching → ควรเป็น skeleton (ยกเว้น timeline ที่มีแล้ว) | ⬜ |

---

## รายละเอียดเพิ่มเติม

### 1. Checked-out / Cancelled Booking Visibility

**แก้แล้ว:**
- Checked-out: `opacity-45` → `opacity-60`
- Cancelled: `border-bk-cancelled/40` → `border-bk-cancelled/70`, `opacity-50` → `opacity-60`
- Reserved upcoming: `border-bk-reserved/40` → `/60`, `bg-bk-reserved/15` → `/20`

### 2. Table Hover States

**แก้แล้ว:**
- `ReceiptHistoryPage.tsx` — เพิ่ม `hover:bg-muted/50 transition-colors`
- `BookingListPage.tsx` — เพิ่ม `hover:bg-muted/50 transition-colors cursor-pointer` + row onClick
- `AdminUsersPage.tsx` — เพิ่ม `hover:bg-muted/50 transition-colors`
- `CustomersPage.tsx` — เพิ่ม `hover:bg-muted/50 transition-colors`
- `DashboardPage.tsx` — มี `hover:bg-muted/40` อยู่แล้ว (Link wrapper)

### 3. Small Screen Responsive

**แก้แล้ว:**
- Page headings: ใช้ `text-h1 text-xl sm:text-2xl` — responsive บน 375px
- ไฟล์ที่แก้: CreateBookingPage, CreateReceiptPage, ReceiptHistoryPage

### 4. Keyboard Shortcuts Help

**แก้แล้ว:**
- กด `?` บน Timeline → เปิด help dialog แสดงคีย์ลัดทั้งหมด
- แสดง: Enter (เปิดรายละเอียด), Shift+F10 (context menu), Arrow keys (ย้าย), Shift+Arrow (resize)

### 5. Page Transitions

**แก้แล้ว:**
- เพิ่ม `.page-enter` animation (180ms fade-in + translateY 4px)
- Wrap `<Outlet>` ด้วย `<div key={location.pathname} className="page-enter">`
- Respects `prefers-reduced-motion` (ปิดอัตโนมัติ)

### 6. Padding

**ตรวจสอบแล้ว:** padding แตกต่างตาม context — compact `px-4 py-3` สำหรับ PMS panels, `p-5 md:p-6` สำหรับ forms, `p-5 md:p-8` สำหรับ detail views ถือว่าเป็น intentional pattern

### 7. Touch Resize Handles

**แก้แล้ว:**
- เพิ่ม CSS class `tl-resize-handle` + `@media (pointer: coarse)` → แสดง grip handles ที่ `opacity-0.5` ตลอดบน touch device
- Desktop ยังคงแสดงเฉพาะ hover (`group-hover/block:opacity-100`)

### 8-10. Medium Priority Details

- **Headings:** ✅ `.text-h1` = `text-2xl font-semibold tracking-tight`, `.text-h2` = `text-xl font-semibold`; ใช้แทน hardcoded ในทุกหน้า
- **Source toggle:** ✅ `bg-primary/5` → `bg-primary/15`
- **Dashboard rows:** ✅ มี hover อยู่แล้ว

### A1. Reduced Motion

**แก้แล้ว:** `@media (prefers-reduced-motion: reduce)` ปิด animation/transition ทั้งหมด

### 12. ARIA Roles

**แก้แล้ว:**
- Timeline grid: `role="grid" aria-label="Timeline ห้องพัก"`
- RoomRow: `role="row" aria-label="ห้อง {number}"`
- BookingBlock: มี `aria-label` อยู่แล้ว (guest name + room number)

### 14. Icon Size Tokens

**แก้แล้ว:** เพิ่มใน index.css:
- `.icon-xs` = 12px (w-3 h-3)
- `.icon-sm` = 16px (w-4 h-4)
- `.icon-base` = 20px (w-5 h-5)
- `.icon-lg` = 24px (w-6 h-6)

---

## ยังเหลือ

| # | ปัญหา | หมายเหตุ |
|---|--------|---------|
| 11 | WCAG AAA color contrast | ต้องใช้ contrast checker ตรวจจริง |
| 15 | Skeleton loader | ต้องสร้าง skeleton components สำหรับ Dashboard, ReceiptHistory, BookingList |

---

## Design System Notes

### สิ่งที่ทำได้ดี
- CSS custom properties ครบ 60+ tokens
- Typography hierarchy 9 ระดับ (metric, section, h1, h2, body, label, caption, micro, helper)
- Icon size tokens 4 ระดับ (xs, sm, base, lg)
- Status-based color mapping สำหรับ booking blocks
- Responsive sidebar (icon-only → full) + mobile drawer
- Code splitting 13 lazy-loaded pages
- BottomBar mobile pattern พร้อม safe-area inset
- ✅ prefers-reduced-motion support
- ✅ Page transition system (fade-in)
- ✅ Touch device resize handle affordance
- ✅ ARIA roles on timeline grid

### สิ่งที่ขาด
- ~~ไม่มี heading tokens~~ ✅
- ~~ไม่มี icon size tokens~~ ✅
- ~~ไม่มี page transition system~~ ✅
- ไม่มี `.radius-input` (inputs hardcode `rounded-md`)
- ไม่มี `border-border-strong` variant
