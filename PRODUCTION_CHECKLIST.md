# Production Checklist — Hideout Invoice Frontend

สรุปผลรีวิว frontend ก่อนขึ้น production แยกตาม severity และหมวด
วันที่รีวิว: 2026-03-21

---

## Critical (ต้องแก้ก่อน deploy)

### Security
- [x] **S1** — เพิ่ม Zod validation ใน UserModal สำหรับ password (min 8 chars + 1 digit)

### Data Integrity
- [x] **D1** — เพิ่ม decimal precision validation ใน PaymentPanel (max 2 ทศนิยม)

### UX & Accessibility
- [x] **U1** — ขยาย Pagination buttons เป็น 44px minimum touch target

### Deploy & Infrastructure
- [x] **I1** — เพิ่ม security headers ใน nginx.conf (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- [x] **I2** — สร้าง `.env.example` สำหรับ frontend

---

## High (ควรแก้ก่อน deploy)

### Security
- [x] **S2** — เปลี่ยน `innerHTML` เป็น `textContent` ใน splash screen
- [x] **S3** — เพิ่ม Content-Security-Policy header ใน nginx.conf
- [x] **S4** — แก้ Axios refresh token race condition → Promise-based lock

### Data Integrity
- [x] **D2** — เพิ่ม double-click guard บน Delete buttons (6 จุด: Customers, Users, Receipts, RoomTypes, Rooms, ReceiptDetail)
- [x] **D3** — แก้ receipt submit race condition → ใช้ `createMutation.isPending` เป็นหลัก
- [x] **D4** — เพิ่ม null-safe check บน deposit display
- [x] **D5** — เพิ่ม log ใน logout catch block

### UX & Accessibility
- [x] **U2** — เปลี่ยน `title` เป็น `aria-label` บน icon-only buttons (ทุก page)
- [x] **U3** — เพิ่ม `break-words` บน FormMessage component

### Performance
- [x] **P1** — Memoize timeline grid lines ด้วย `useMemo`
- [x] **P2** — Lazy-load Recharts components (4 chart components แยก chunk)
- [x] **P3** — bookingColorMap ตรวจแล้ว — useMemo อยู่แล้ว ไม่มีปัญหา

### Deploy & Infrastructure
- [x] **I3** — เพิ่ม `X-Forwarded-Proto` ใน nginx proxy
- [x] **I4** — ปิด source maps ใน production build
- [x] **I5** — เพิ่ม `Cache-Control: no-store` บน API responses + asset caching

---

## Medium (แก้ได้หลัง launch)

### Data Integrity
- [x] **D6** — Standardize money formatting ทั้ง codebase → `formatCompactNumber()` (25 จุด, 14 ไฟล์)
- [x] **D7** — Date comparison timezone safety — ยอมรับได้ (server/browser เป็น timezone ไทยทั้งคู่)

### UX & Accessibility
- [x] **U4** — เพิ่ม CTA ใน empty states (Receipts + Customers)
- [x] **U5** — เพิ่ม `break-all` สำหรับ Thai text truncation (BookingList + ReceiptHistory)
- [x] **U6** — เพิ่ม `ariaProps: { role: 'alert', 'aria-live': 'assertive' }` บน Toaster
- [x] **U7** — เพิ่ม isFetching indicator บน Timeline (opacity-60 ระหว่าง refetch)

### Performance
- [x] **P4** — เพิ่ม `gcTime: 2 นาที` ใน QueryProvider
- [x] **P5** — สร้าง `shared/constants/queryConfig.ts` กับ `STALE_TIMES` constants
- [x] **P6** — Grid lines memoize ด้วย useMemo (ทำรวมกับ P1)

### Code Quality
- [x] **C1** — แก้ `any` type ใน error handlers → สร้าง `getErrorMessage(err: unknown)` utility + แก้ 5 ไฟล์
- [x] **C2** — แก้ `errors: any` ใน ReceiptItemRow → `FieldErrors<ReceiptFormValues>`
- [x] **C3** — เพิ่ม page-level ErrorBoundary ครอบทุก route (9 pages)

### Deploy & Infrastructure
- [x] **I6** — เพิ่ม `ENV NODE_ENV=production` ใน Dockerfile
- [x] **I7** — เพิ่ม `build:analyze` script + `rollup-plugin-visualizer`

---

## Low (nice-to-have)

- [x] **C4** — สร้าง `window.d.ts` declare global → ลบ `(window as any)`
- [x] **P7** — ลด Google Fonts cache จาก 365 วัน → 60 วัน
- [x] **U8** — ขยาย pagination select font size จาก `text-xs h-8` → `text-sm h-9`

---

## ผ่านแล้ว (ไม่ต้องแก้)

- [x] Access token อยู่ใน memory เท่านั้น — ไม่มีใน localStorage/sessionStorage
- [x] ไม่มี `dangerouslySetInnerHTML` ใน React components
- [x] ไม่มี hardcoded credentials หรือ API keys
- [x] ไม่มี `console.log` หลงเหลือ
- [x] ไม่มี TODO/FIXME ที่ยังไม่ทำ
- [x] Route-level code splitting ทำแล้ว
- [x] Timeline virtualization ด้วย TanStack Virtual
- [x] React.memo บน BookingBlock, RoomRow, TimelineHeader
- [x] HoverContext ใช้ `useSyncExternalStore` ป้องกัน cascade re-render
- [x] PWA service worker ไม่ cache API calls
- [x] SPA routing fallback (try_files) ใน nginx
- [x] `withCredentials: true` สำหรับ httpOnly cookie
- [x] Feature-based folder structure ชัดเจน
- [x] File naming consistent (PascalCase components, kebab-case utils)
- [x] TypeScript compiles clean (`tsc --noEmit` ผ่าน)
- [x] Production build สำเร็จ ไม่มี source maps
