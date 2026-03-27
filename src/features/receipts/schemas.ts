import { z } from 'zod'

export const itemSchema = z.object({
  description: z.string().min(1, 'กรุณาระบุรายละเอียด'),
  quantity: z.coerce.number().gt(0, 'ต้องมากกว่า 0'),
  unit_price: z.coerce.number().gte(0, 'ต้องไม่ติดลบ'),
})

export const receiptSchema = z.object({
  customer_id: z.string().uuid('กรุณาเลือกลูกค้า'),
  issue_date: z.string().min(1, 'กรุณาระบุวันที่ออกเอกสาร'),
  notes: z.string().max(1000),
  items: z.array(itemSchema).min(1, 'กรุณาเพิ่มรายการอย่างน้อย 1 ห้อง'),
  check_in_date: z.string().optional(),
  payment_method: z.string().max(50).optional(),
})

export type ReceiptFormValues = z.infer<typeof receiptSchema>

export const METHOD_MAP: Record<string, string> = { CASH: 'เงินสด', TRANSFER: 'โอนเงิน' }
