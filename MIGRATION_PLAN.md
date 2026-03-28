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

## Phase 4 — React → 19.x ✅

ecosystem พร้อม, code clean

- [x] อ่าน React 19 migration guide
- [x] `npm install react@latest react-dom@latest` (19.2.4)
- [x] `npm install -D @types/react@latest @types/react-dom@latest` (19.2.14 / 19.2.3)
- [x] fix `forwardRef` → ref as prop (18 shadcn/ui components + 2 timeline RefObject types)
- [x] ตรวจ 3rd party compatibility: react-hot-toast, recharts, @react-pdf/renderer, cmdk — all compatible
- [x] `npx tsc --noEmit`
- [x] `npm run test` (55 files, 790 tests passed)
- [x] `npm run build`
- [ ] commit

---

## Phase 5 — React Router → 7.x

มี v6 compat mode, low risk

- [ ] อ่าน React Router v7 migration guide
- [ ] `npm install react-router-dom@latest` (หรือ `react-router@latest` ถ้า v7 เปลี่ยนชื่อ package)
- [ ] เปิด v6 compat mode ก่อน — ยืนยันว่าทุกอย่างทำงาน
- [ ] ตรวจ `useNavigate`, `useParams`, `useSearchParams`, `<Link>`, `<Route>`, `<Outlet>`
- [ ] `npx tsc --noEmit`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] commit
- [ ] (optional) migrate จาก compat mode → v7 native patterns ทีหลัง

---

## Phase 6 — ESLint → 9.x + flat config

dev-only, ไม่กระทบ runtime

- [ ] `npm install -D eslint@9 @typescript-eslint/eslint-plugin@latest @typescript-eslint/parser@latest`
- [ ] `npm install -D eslint-plugin-react-hooks@latest eslint-plugin-react-refresh@latest`
- [ ] ลบ `.eslintrc.*` → สร้าง `eslint.config.js` (flat config)
- [ ] แก้ script `lint` ใน package.json (flat config ไม่ใช้ `--ext`)
- [ ] `npm run lint`
- [ ] commit

---

## Parked (รอ stable)

| Package | Current | Reason |
|---|---|---|
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
