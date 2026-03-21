import { z } from 'zod'

// ─── Per-item schema (one room-type group) ─────────────────────────────────────

export const roomTypeBookingItemSchema = z
  .object({
    room_type_id: z.string().min(1, 'กรุณาเลือกประเภทห้อง'),
    quantity: z
      .number({ invalid_type_error: 'กรุณาระบุจำนวนห้อง' })
      .int()
      .min(1, 'จำนวนห้องต้องอย่างน้อย 1 ห้อง'),
    check_in: z.string().min(1, 'กรุณาเลือกวันเช็คอิน'),
    check_out: z.string().min(1, 'กรุณาเลือกวันเช็คเอาท์'),
    /** Physical room IDs pre-selected by staff. Length must be ≤ quantity. */
    assigned_room_ids: z.array(z.string()).default([]),
    /** Optional charged (discounted) price per night. */
    charged_price: z.number().positive().optional(),
  })
  .refine((d) => !d.check_in || !d.check_out || d.check_out > d.check_in, {
    message: 'วันเช็คเอาท์ต้องหลังวันเช็คอิน',
    path: ['check_out'],
  })
  .refine((d) => d.assigned_room_ids.length <= d.quantity, {
    message: 'จำนวนห้องที่เลือกต้องไม่เกินจำนวนที่จอง',
    path: ['assigned_room_ids'],
  })

// ─── Top-level booking schema ─────────────────────────────────────────────────

export const createBookingSchema = z
  .object({
    source: z.enum(['walk_in', 'advance']),
    guest_name: z
      .string()
      .min(1, 'กรุณาระบุชื่อผู้เข้าพัก')
      .max(200, 'ชื่อต้องไม่เกิน 200 ตัวอักษร'),
    guest_phone: z
      .string()
      .regex(/^\d*$/, 'กรุณากรอกเฉพาะตัวเลข')
      .refine((v) => v === '' || v.length === 10, 'เบอร์โทรศัพท์ต้องมี 10 หลัก')
      .optional()
      .default(''),
    customer_id: z.string().optional(),
    /** When true, all items share the dates from item 0. */
    same_dates: z.boolean(),
    items: z
      .array(roomTypeBookingItemSchema)
      .min(1, 'กรุณาเพิ่มรายการห้องพักอย่างน้อย 1 รายการ'),
    payment_mode: z.enum(['full', 'full_deposit', 'partial', 'reserve']),
    payment_amount: z.number().optional(),
    payment_method: z.enum(['CASH', 'TRANSFER']),
    key_deposit_amount: z.number().optional(),
  })
  .refine(
    (d) =>
      d.payment_mode === 'reserve' ||
      (d.payment_amount != null && d.payment_amount > 0),
    { message: 'กรุณาระบุยอดชำระ', path: ['payment_amount'] },
  )

export type CreateBookingFormValues = z.infer<typeof createBookingSchema>
export type RoomTypeBookingItemForm = z.infer<typeof roomTypeBookingItemSchema>
