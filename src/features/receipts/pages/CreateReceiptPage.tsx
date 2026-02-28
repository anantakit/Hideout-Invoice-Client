import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { invoicesApi } from '../api';
import { customersApi } from '../../customers/api';
import { formatTHB, todayISO } from '../../../shared/utils';
import CustomerModal from '../../customers/components/CustomerModal';
import SearchableComboBox from '../../../shared/ui/SearchableComboBox';
import type { Customer } from '../../customers/types';

// ── Schema ────────────────────────────────────────────────────────────────────
const itemSchema = z.object({
  description: z.string().min(1, 'กรุณาระบุรายละเอียด'),
  quantity: z.coerce.number().gt(0, 'ต้องมากกว่า 0'),
  unit_price: z.coerce.number().gte(0, 'ต้องไม่ติดลบ'),
});

const receiptSchema = z.object({
  customer_id: z.string().uuid('กรุณาเลือกลูกค้า'),
  issue_date: z.string().min(1, 'กรุณาระบุวันที่ออกเอกสาร'),
  notes: z.string().max(1000),
  items: z.array(itemSchema).min(1, 'กรุณาเพิ่มรายการอย่างน้อย 1 รายการ'),
  // Hotel-specific (optional)
  check_in_date: z.string().optional(),
  check_out_date: z.string().optional(),
  nights: z.coerce.number().int().min(0).optional(),
  room_number: z.string().max(50).optional(),
  payment_method: z.string().max(50).optional(),
});

type ReceiptFormValues = z.infer<typeof receiptSchema>;

// Room type templates — typing helper only, not enforced
const ROOM_TYPE_TEMPLATES = {
  เตียงเดี่ยว: { description: 'ค่าห้องพัก', quantity: 1, unit_price: 500 },
  เตียงคู่: { description: 'ค่าห้องพัก', quantity: 1, unit_price: 650 },
} as const;

type RoomType = keyof typeof ROOM_TYPE_TEMPLATES | '';

// ── Component ─────────────────────────────────────────────────────────────────
export default function CreateInvoice() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [roomType, setRoomType] = useState<RoomType>('');

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      customer_id: '',
      issue_date: todayISO(),
      notes: '',
      items: [{ description: 'ค่าห้องพัก', quantity: 1, unit_price: 0 }],
      // Task 2: default check-in date to today
      check_in_date: todayISO(),
      room_number: '',
      payment_method: '',
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'items',
  });

  // Real-time total
  const watchedItems = watch('items');
  const total = watchedItems.reduce(
    (sum, item) =>
      sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
    0,
  );

  const createMutation = useMutation({
    mutationFn: invoicesApi.create,
    onSuccess: (invoice) => {
      toast.success(`สร้างใบเสร็จ ${invoice.invoice_number} สำเร็จ`);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      navigate(`/invoices/${invoice.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const onSubmit = (values: ReceiptFormValues) => {
    createMutation.mutate({
      customer_id: values.customer_id,
      issue_date: new Date(values.issue_date).toISOString(),
      notes: values.notes,
      items: values.items.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
      })),
      check_in_date: values.check_in_date
        ? new Date(values.check_in_date).toISOString()
        : undefined,
      check_out_date: values.check_out_date
        ? new Date(values.check_out_date).toISOString()
        : undefined,
      nights: values.nights || undefined,
      room_number: values.room_number || undefined,
      payment_method: values.payment_method || undefined,
    });
  };

  // Task 3: room type helper — pre-fills items, user can modify afterward
  const handleRoomTypeChange = useCallback(
    (type: RoomType) => {
      setRoomType(type);
      if (type && ROOM_TYPE_TEMPLATES[type]) {
        replace([{ ...ROOM_TYPE_TEMPLATES[type] }]);
      }
    },
    [replace],
  );

  const handleCustomerCreated = useCallback(
    (customer: Customer) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setSelectedCustomer(customer);
      setValue('customer_id', customer.id, { shouldValidate: true });
      setCustomerModalOpen(false);
    },
    [queryClient, setValue],
  );

  return (
    <>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">สร้างใบเสร็จใหม่</h1>
          <p className="text-gray-500 text-sm mt-1">
            กรอกรายละเอียดด้านล่างเพื่อออกใบเสร็จรับเงิน
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-6">
            {/* ── Receipt Meta ─────────────────────────────── */}
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">
                รายละเอียดใบเสร็จ
              </h2>
              <div>
                <label className="label">วันที่ออกเอกสาร</label>
                <input
                  type="date"
                  className="input"
                  {...register('issue_date')}
                />
                {errors.issue_date && (
                  <p className="field-error">{errors.issue_date.message}</p>
                )}
              </div>
            </div>

            {/* ── Customer ─────────────────────────────────── */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">
                  ผู้ชำระเงิน
                </h2>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setCustomerModalOpen(true)}
                >
                  + เพิ่มลูกค้าใหม่
                </button>
              </div>

              {/* Task 1: Searchable ComboBox — API-based, debounced 300ms */}
              <Controller
                name="customer_id"
                control={control}
                render={({ field }) => (
                  <SearchableComboBox<Customer>
                    value={field.value}
                    onChange={(id) => field.onChange(id)}
                    onSelectItem={(item) => setSelectedCustomer(item)}
                    fetchFunction={(params) => customersApi.list(params)}
                    labelKey="name"
                    valueKey="id"
                    displayValue={selectedCustomer?.name}
                    placeholder="ค้นหาลูกค้า…"
                    error={!!errors.customer_id}
                  />
                )}
              />
              {errors.customer_id && (
                <p className="field-error">{errors.customer_id.message}</p>
              )}

              {selectedCustomer && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 space-y-1 border border-gray-100">
                  <p className="font-semibold text-gray-900">
                    {selectedCustomer.name}
                  </p>
                  {selectedCustomer.address && (
                    <p>{selectedCustomer.address}</p>
                  )}
                  {selectedCustomer.phone && (
                    <p>โทร: {selectedCustomer.phone}</p>
                  )}
                  {selectedCustomer.tax_id && (
                    <p>เลขผู้เสียภาษี: {selectedCustomer.tax_id}</p>
                  )}
                </div>
              )}
            </div>

            {/* ── Hotel Info ────────────────────────────────── */}
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">
                รายละเอียดการเข้าพัก
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">เลขห้อง</label>
                  <input
                    type="text"
                    placeholder="101"
                    className="input"
                    {...register('room_number')}
                  />
                </div>
                <div>
                  <label className="label">วิธีชำระเงิน</label>
                  <select className="input" {...register('payment_method')}>
                    <option value="">เลือกวิธีชำระเงิน…</option>
                    <option value="เงินสด">เงินสด</option>
                    <option value="โอนเงิน">โอนเงิน</option>
                    <option value="บัตรเครดิต">บัตรเครดิต</option>
                    <option value="บัตรเดบิต">บัตรเดบิต</option>
                  </select>
                </div>

                {/* Task 2: check_in_date defaults to today (set in defaultValues) */}
                <div>
                  <label className="label">วันที่เข้าพัก</label>
                  <input
                    type="date"
                    className="input"
                    {...register('check_in_date')}
                  />
                </div>
                <div>
                  <label className="label">วันที่ออก</label>
                  <input
                    type="date"
                    className="input"
                    {...register('check_out_date')}
                  />
                </div>
                {/* Task 3: Room type helper — auto-fills items template, user can edit */}
                <div className="md:col-span-2">
                  <label className="label">ประเภทห้องพัก (ไม่บังคับ)</label>
                  <select
                    className="input"
                    value={roomType}
                    onChange={(e) =>
                      handleRoomTypeChange(e.target.value as RoomType)
                    }
                  >
                    <option value="">
                      เลือกประเภทห้อง (ใส่รายการอัตโนมัติ)…
                    </option>
                    {Object.keys(ROOM_TYPE_TEMPLATES).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    เลือกเพื่อใส่รายการสินค้าตัวอย่างอัตโนมัติ — แก้ไขได้ภายหลัง
                  </p>
                </div>
                <div>
                  <label className="label">จำนวนคืน</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="1"
                    className="input"
                    {...register('nights')}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    หากระบุวันเข้า-ออก ระบบจะคำนวณให้อัตโนมัติ
                  </p>
                </div>
              </div>
            </div>

            {/* ── Line Items ───────────────────────────────── */}
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">
                รายการสินค้า
              </h2>

              {/* Table header */}
              <div className="hidden md:grid grid-cols-[1fr_100px_120px_100px_40px] gap-2 mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide px-1">
                <span>รายละเอียด</span>
                <span className="text-center">จำนวน</span>
                <span className="text-right">ราคาต่อหน่วย</span>
                <span className="text-right">รวมเงิน</span>
                <span />
              </div>

              <div className="space-y-2">
                {fields.map((field, index) => {
                  const qty = Number(watchedItems[index]?.quantity) || 0;
                  const price = Number(watchedItems[index]?.unit_price) || 0;
                  const lineTotal = qty * price;

                  return (
                    <div
                      key={field.id}
                      className="grid grid-cols-1 md:grid-cols-[1fr_100px_120px_100px_40px] gap-2 items-start p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <div>
                        <label className="label md:hidden">รายละเอียด</label>
                        <textarea
                          rows={2}
                          placeholder="ชื่อสินค้า/บริการ…"
                          className={`input resize-none ${errors.items?.[index]?.description ? 'input-error' : ''}`}
                          {...register(`items.${index}.description`)}
                        />
                        {errors.items?.[index]?.description && (
                          <p className="field-error">
                            {errors.items[index]!.description!.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="label md:hidden">จำนวน</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="1"
                          className={`input text-center ${errors.items?.[index]?.quantity ? 'input-error' : ''}`}
                          {...register(`items.${index}.quantity`)}
                        />
                        {errors.items?.[index]?.quantity && (
                          <p className="field-error">
                            {errors.items[index]!.quantity!.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="label md:hidden">ราคาต่อหน่วย</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className={`input text-right ${errors.items?.[index]?.unit_price ? 'input-error' : ''}`}
                          {...register(`items.${index}.unit_price`)}
                        />
                        {errors.items?.[index]?.unit_price && (
                          <p className="field-error">
                            {errors.items[index]!.unit_price!.message}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-end">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatTHB(lineTotal)}
                        </span>
                      </div>

                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                          className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="ลบรายการ"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {errors.items?.root && (
                <p className="field-error mt-2">{errors.items.root.message}</p>
              )}

              <button
                type="button"
                onClick={() =>
                  append({ description: '', quantity: 1, unit_price: 0 })
                }
                className="btn-secondary mt-3 text-sm"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                เพิ่มรายการ
              </button>
            </div>

            {/* ── Notes ────────────────────────────────────── */}
            <div className="card p-6">
              <label className="label">หมายเหตุ (ไม่บังคับ)</label>
              <textarea
                rows={3}
                placeholder="หมายเหตุเพิ่มเติม…"
                className="input resize-none"
                {...register('notes')}
              />
            </div>

            {/* ── Summary ──────────────────────────────────── */}
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">
                สรุปยอด
              </h2>
              <div className="max-w-xs ml-auto">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-900">
                    ยอดชำระทั้งหมด
                  </span>
                  <span className="font-bold text-lg text-brand-700">
                    {formatTHB(total)}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Actions ──────────────────────────────────── */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-secondary"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting || createMutation.isPending}
                className="btn-primary"
              >
                {createMutation.isPending ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    กำลังสร้าง…
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    สร้างใบเสร็จ
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      <CustomerModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onCreated={handleCustomerCreated}
      />
    </>
  );
}
