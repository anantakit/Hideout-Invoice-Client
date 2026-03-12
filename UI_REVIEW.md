# UI/UX Review — Hideout PMS Frontend

> วันที่รีวิว: 13 มี.ค. 2569
> ภาพรวม: 7.5/10 — พื้นฐานดีมาก มี rough edges ที่แก้แล้วจะขึ้นมาก

## สัญลักษณ์

- ⬜ ยังไม่แก้
- ✅ แก้แล้ว

---

## High Priority (ผลกระทบ UX สูง)

| # | ปัญหา | รายละเอียด | สถานะ |
|---|--------|-----------|--------|
| 1 | Checked-out / cancelled booking จางเกินไป | `opacity-45` แทบมองไม่เห็น, dashed border contrast ต่ำ → เพิ่มเป็น `opacity-60`, border opacity เพิ่ม | ⬜ |
| 2 | Table row ไม่มี hover state | Dashboard, ReceiptHistory — กดได้แต่ไม่มี feedback → เพิ่ม `hover:bg-muted/50` | ⬜ |
| 3 | ฟอร์มบน iPhone SE อาจแน่น | CreateBookingPage ปุ่ม pill 3 คอลัมน์, text wrap → ทดสอบ + responsive sizing | ⬜ |
| 4 | Keyboard shortcuts ค้นไม่เจอ | Timeline drag/resize มี hotkey แต่ไม่มีที่บอก → เพิ่ม help dialog หรือ onboard hint | ⬜ |
| 5 | ไม่มี page transition | Route เปลี่ยนทันที ไม่มี fade → เพิ่ม animation | ⬜ |

## Medium Priority (ขัดเกลา)

| # | ปัญหา | รายละเอียด | สถานะ |
|---|--------|-----------|--------|
| 6 | Padding ไม่สม่ำเสมอ | Card content บางที่ `p-4` บางที่ `p-6` → standardize | ⬜ |
| 7 | Resize handle ซ่อนบน touch | มือถือ hover ไม่ได้ ไม่รู้ว่า resize ได้ → แสดง grip icon ตลอด | ⬜ |
| 8 | Heading style ไม่ consistent | บางหน้าใช้ `text-section text-2xl` บางหน้า hardcode → สร้าง `.text-h1` token | ⬜ |
| 9 | Source toggle selected state จางเกินไป | `bg-primary/5` บน dark theme แทบไม่เห็น → เพิ่มเป็น `bg-primary/15` | ⬜ |
| 10 | Dashboard recent receipts ไม่มี hover | Row กดได้แต่ไม่มี visual feedback | ⬜ |

## Low Priority (ขัดละเอียด)

| # | ปัญหา | รายละเอียด | สถานะ |
|---|--------|-----------|--------|
| 11 | WCAG AAA color contrast | Badge สีเทาบน dark bg อาจ contrast ไม่พอ | ⬜ |
| 12 | ARIA roles | Timeline grid + booking blocks ขาด role/aria-label | ⬜ |
| 13 | Focus management | เมื่อเปิด/ปิด modal ควร trap focus + return focus | ⬜ |
| 14 | Icon size tokens | ไม่มี `.icon-xs`/`.icon-sm`/`.icon-base` → ขนาด icon ไม่ consistent | ⬜ |
| 15 | Skeleton loader | ใช้ opacity fade ตอน fetching → ควรเป็น skeleton | ⬜ |

---

## รายละเอียดเพิ่มเติม

### 1. Checked-out / Cancelled Booking Visibility

**ปัจจุบัน:**
- Checked-out: `opacity-45` — จางจนแทบมองไม่เห็นบนหน้าจอความสว่างต่ำ
- Cancelled: `border-dashed border-bk-cancelled/40 opacity-50` — contrast ต่ำ
- Upcoming (reserved): `border-dashed border-bk-reserved/40 bg-bk-reserved/15`

**แนะนำ:**
- Checked-out: เพิ่มเป็น `opacity-60`
- Cancelled: border เพิ่มเป็น `border-bk-cancelled/70`
- Reserved upcoming: border เพิ่มเป็น `border-bk-reserved/60`, bg เป็น `bg-bk-reserved/20`

### 2. Table Hover States

**ไฟล์ที่ต้องแก้:**
- `DashboardPage.tsx` — recent receipts table rows
- `ReceiptHistoryPage.tsx` — receipt table rows
- `BookingListPage.tsx` — ตรวจสอบว่ามี hover แล้วหรือยัง

**แนะนำ:** เพิ่ม `hover:bg-muted/50 transition-colors` ให้ `TableRow`

### 3. Small Screen Form Sizing

**จุดเสี่ยง:**
- CreateBookingPage: payment mode pills `grid-cols-3` — "ชำระบางส่วน" อาจ wrap
- Source toggle: `grid-cols-2` — ปลอดภัยกว่า
- Page header: `text-2xl` อาจใหญ่เกิน → ใช้ `text-xl sm:text-2xl`

**แนะนำ:** ทดสอบบน 375px viewport, ปรับ responsive ตามจำเป็น

### 4. Keyboard Shortcuts Discoverability

**Shortcuts ที่มีอยู่แล้ว (Timeline):**
- Arrow keys: ย้าย booking
- Shift+Arrow: extend/shrink
- Shift+F10: context menu

**แนะนำ:** เพิ่ม `?` shortcut เปิด help dialog หรือ tooltip hint ตอน hover booking ครั้งแรก

### 5. Page Transitions

**ปัจจุบัน:** Route เปลี่ยนทันที ไม่มี animation
**แนะนำ:** Wrap `<Outlet>` ใน fade transition (CSS หรือ framer-motion)

### 6-10. Medium Priority Details

- **Padding:** Card filter sections ใช้ `p-4`, card content อื่นใช้ `p-6 pt-0` → กำหนด pattern ชัดเจน
- **Resize handles:** เพิ่ม touch affordance (grip dots) ที่แสดงตลอดบน touch device
- **Headings:** สร้าง `.text-h1` = `text-2xl font-semibold tracking-tight`, `.text-h2` = `text-xl font-semibold`
- **Source toggle:** `bg-primary/5` → `bg-primary/15` สำหรับ selected state
- **Dashboard rows:** เพิ่ม hover state เหมือน table pages อื่น

### 11-15. Low Priority Details

- **WCAG:** ใช้ WebAIM contrast checker ตรวจ badge สีเทา (`hsl(218 10% 55%)`) บน dark bg
- **ARIA:** เพิ่ม `role="grid"` ให้ timeline, `role="button" aria-label` ให้ booking blocks
- **Focus:** ตรวจ focus trap ใน AlertDialog/Sheet, return focus เมื่อปิด
- **Icon sizes:** กำหนด `.icon-xs` (12px), `.icon-sm` (16px), `.icon-base` (20px), `.icon-lg` (24px)
- **Skeleton:** แทน opacity fade ด้วย skeleton loader สำหรับ table/card ตอน loading

---

## Design System Notes

### สิ่งที่ทำได้ดี
- CSS custom properties ครบ 60+ tokens
- Typography hierarchy 7 ระดับ (metric, section, body, label, caption, micro, helper)
- Status-based color mapping สำหรับ booking blocks
- Responsive sidebar (icon-only → full) + mobile drawer
- Code splitting 13 lazy-loaded pages
- BottomBar mobile pattern พร้อม safe-area inset

### สิ่งที่ขาด
- ไม่มี heading tokens (`.text-h1`, `.text-h2`)
- ไม่มี icon size tokens
- ไม่มี `.radius-input` (inputs hardcode `rounded-md`)
- ไม่มี `border-border-strong` variant
- ไม่มี page transition system
