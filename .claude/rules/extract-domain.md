---
description: "Conventions for extracting business logic from hooks into pure domain functions"
paths:
  - "**/hooks/**"
  - "**/domain/**"
---

# Extract Domain — Conventions

## เมื่อไหร่ที่ต้อง extract

Hook มี business logic ที่ **ไม่พึ่ง React** → ย้ายออกเป็น pure function

สัญญาณ:
- คำนวณราคา, จำนวนคืน, conflict detection
- Build payload จาก form values
- Transform/map API response → UI model
- Validate data, filter/sort collections
- Geometry math (snap-to-grid, scroll position)

**ไม่ต้อง extract:**
- Thin mutation wrappers (useCreateX, useDeleteX)
- State management (useReducer, useState orchestration)
- Side effects (useEffect ที่เรียก API)

## โครงสร้างไฟล์

```
features/<feature>/
  hooks/useXxx.ts           ← hook: state + effects + orchestration
  domain/xxxLogic.ts        ← pure functions (NO React imports)
  domain/xxxLogic.test.ts   ← tests: input → output, no mocks
```

Cross-feature logic:
```
shared/domain/roomAvailability.ts   ← ใช้ใน 2+ features
```

## กฎของ Domain File

1. **ห้าม import React** — ไม่มี useState, useEffect, useMutation
2. **ห้าม import API layer** — ไม่เรียก axios, fetch
3. **Pure functions เท่านั้น** — same input → same output, no side effects
4. **Export แยกทุก function** — ไม่ใช้ default export, ไม่ bundle เป็น object
5. **Types ไว้ในไฟล์เดียวกันได้** — ถ้า type ใช้แค่ใน domain file นี้

```typescript
// ✅ ถูก
export function buildEditPayload(original: Payment, values: FormValues): Partial<Payment> | null {
  const changes: Record<string, unknown> = {}
  if (values.amount !== original.amount) changes.amount = values.amount
  return Object.keys(changes).length ? changes : null
}

// ❌ ผิด — ใช้ React
export function usePaymentCalc() {
  const [total, setTotal] = useState(0)  // ← ห้าม
}
```

## กฎของ Hook หลัง extract

1. **Import domain functions** แล้วเรียกใน useMemo/useCallback/handler
2. **Public interface ห้ามเปลี่ยน** — consumer ไม่ต้องแก้อะไร
3. **Hook เหลือแค่ orchestration:**
   - จัดการ React state
   - เรียก domain function
   - ส่งผลไป mutation/form

```typescript
// ✅ Hook หลัง extract
function usePaymentPanel() {
  const onEdit = (id: string, original: Payment, values: FormValues) => {
    const payload = buildEditPayload(original, values)  // ← domain
    if (!payload) { cancelEdit(); return }
    updateMutation.mutate({ id, payload })
  }
}
```

## กฎของ Test

### Domain tests (pure)
- ไม่มี mock, ไม่มี provider, ไม่มี renderHook
- Test input → output, edge cases, boundary values
- ตั้งชื่อ: `domain/xxxLogic.test.ts`

### Hook tests (wiring)
- Mock API layer (ไม่ mock domain functions)
- Verify outcome ไม่ใช่ implementation details:
  - ❌ `expect(buildEditPayload).toHaveBeenCalledWith(...)`
  - ✅ `expect(mutation.mutate).toHaveBeenCalledWith({ id, payload: { amount: 500 } })`
- ถ้า hook test เดิม assert implementation details → simplify หลัง extract

## Naming Conventions

| สิ่งที่ extract | ชื่อ domain file | ตัวอย่าง functions |
|----------------|-----------------|-------------------|
| Payload building | `xxxPayload.ts` | `buildCreatePayload`, `buildEditPayload` |
| Calculations | `xxxCalc.ts` | `calculateTotal`, `calculateNights` |
| Data transformation | `xxxTransform.ts` | `mapPrefillToForm`, `partitionByStatus` |
| Validation | `xxxValidation.ts` | `validateDrafts`, `isValidSelection` |
| Geometry/layout | `xxxGeometry.ts` | `snapToGrid`, `getDayIndex` |
| Mixed (หลายอย่าง) | `xxxLogic.ts` | ใช้เมื่อ hook มี logic หลายแบบรวมกัน |

## ลำดับการทำ

ดู `frontend/EXTRACT_DOMAIN_PLAN.md` สำหรับ priority matrix:
- **Phase A**: Timeline (critical — geometry + conflict detection)
- **Phase B**: Bookings (high — pricing + room assignment)
- **Phase C**: Payment & Receipt (medium)
- **Phase D**: Shared (low)

ใช้ `/extract-domain` skill เพื่อ execute ทีละ hook
