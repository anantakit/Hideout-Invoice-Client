# Frontend Dependency Migration Plan

> 1 conversation = 1 phase, commit ทีละ phase, รัน test ทุกรอบ

## Pre-flight (ทำก่อนเริ่ม Phase 1) ✅

- [x] สร้าง branch `feat/deps-upgrade`
- [x] รัน `npm run test` — บันทึกจำนวน test ผ่าน (baseline)
- [x] รัน `npm run build` — บันทึก build size (baseline)

---

## Phase 1 — lucide-react → 1.x ✅

isolated, ไม่กระทบ logic, failure = compile error

- [x] `npm install lucide-react@latest`
- [x] grep icon imports ทั้งหมด — ตรวจ icon ที่ถูก rename/remove
- [x] `npx tsc --noEmit`
- [x] `npm run test`
- [x] `npm run build`
- [x] commit

---

## Phase 2 — date-fns → 4.x ✅

pure function, มี test ครอบอยู่

- [x] อ่าน changelog/migration guide ของ date-fns 4
- [x] `npm install date-fns@latest`
- [x] grep ทุกไฟล์ที่ import date-fns — ตรวจ API ที่เปลี่ยน
- [x] ตรวจ `formatThaiDate`, `formatDate` และ helpers ที่ใช้ date-fns
- [x] `npx tsc --noEmit`
- [x] `npm run test`
- [x] `npm run build`
- [x] commit

---

## Phase 3 — Tailwind CSS → 4.x (PR แยก) ✅

งานเยอะสุด — visual debt ยิ่งรอยิ่งหนัก

- [x] อ่าน Tailwind v4 upgrade guide
- [x] `npm install tailwindcss@latest @tailwindcss/vite`
- [x] ลบ/แปลง `tailwind.config.js` → CSS `@theme` directive
- [x] จัดการ `tailwindcss-animate` → `tw-animate-css` (v4-compatible)
- [x] จัดการ `postcss.config.js` / `autoprefixer` (ลบทั้งคู่ — Tailwind 4 ไม่ต้องใช้ PostCSS)
- [x] อัพเดท `vite.config.ts` — เพิ่ม `@tailwindcss/vite` plugin
- [x] ตรวจ shadcn/ui components ทุกตัว — ไม่ต้อง re-generate
- [x] ตรวจ class names ที่ deprecated/เปลี่ยน — ไม่มีที่ต้องแก้
- [x] `npx tsc --noEmit`
- [x] `npm run test` (55 files, 790 tests passed)
- [x] `npm run build`
- [x] visual test: เปิดทุกหน้าหลักตรวจ UI ด้วยตา
- [ ] commit → เปิด PR แยก

---

## Phase 4 — React Router → 7.x ✅

v7 ไม่มี breaking changes ถ้าเปิด future flags แล้ว (เปิดอยู่แล้ว)

- [x] อ่าน React Router v7 migration guide
- [x] `npm install react-router@latest` + `npm uninstall react-router-dom` (v7 รวม package เป็น `react-router`)
- [x] เปลี่ยน import ทุกไฟล์ (33 source + 5 test) จาก `react-router-dom` → `react-router`
- [x] ลบ v7 future flags จาก `BrowserRouter` (เป็น default แล้วใน v7)
- [x] `npx tsc --noEmit`
- [x] `npm run test` (55 files, 790 tests passed)
- [x] `npm run build`
- [ ] commit

---

## Phase 5 — ESLint → 9.x

dev-only, ไม่กระทบ runtime (flat config ย้ายมาแล้วใน Phase 3.5)

- [ ] `npm install -D eslint@9 @typescript-eslint/eslint-plugin@latest @typescript-eslint/parser@latest`
- [ ] `npm install -D eslint-plugin-react-hooks@latest eslint-plugin-react-refresh@latest`
- [ ] อัพเดท `eslint.config.js` ตาม ESLint 9 API changes
- [ ] `npm run lint`
- [ ] commit

---

## Parked (รอ stable)

| Package | Current | Reason |
|---|---|---|
| React | 18.3 | เคยลอง 19.2 แล้ว — Radix UI `compose-refs` ทำให้ infinite loop (`Maximum update depth exceeded`), รอ Radix ออก fix ก่อน |
| Vite | 5.4 | v8 เพิ่งออก, plugin ecosystem ยังไม่นิ่ง |
| TypeScript | 5.9 | v6 เพิ่ง release, DefinitelyTyped ยังไม่ตาม |
| Zod | 3.x | v4 เพิ่งออก, hookform/resolvers ยังไม่รองรับ |
| @hookform/resolvers | 3.x | ผูกกับ Zod — รอ Zod 4 ก่อน |

---

## Post-flight (หลังจบทุก Phase)

- [ ] รัน full test suite `npm run test`
- [ ] รัน `npm run build` — เทียบ build size กับ baseline
- [ ] visual regression: เปิดทุกหน้าหลักตรวจ UI
- [ ] ทดสอบ PWA (service worker registration)
- [ ] review & merge
