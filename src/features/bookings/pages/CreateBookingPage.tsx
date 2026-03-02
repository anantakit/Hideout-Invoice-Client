import { useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import type { Control, FieldArrayWithId } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Plus, ChevronDown, Loader2, Pencil } from 'lucide-react'
import { differenceInDays, isValid } from 'date-fns'
import { cn, formatThaiDate, formatTHB } from '@/shared/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card'
import { BottomBar } from '../../../shared/ui/BottomBar'
import { Button } from '../../../shared/ui/button'
import { Badge } from '../../../shared/ui/badge'
import { Separator } from '../../../shared/ui/separator'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../shared/ui/form'
import { Input } from '../../../shared/ui/input'
import { useRoomTypes, useCreateBooking } from '../hooks'
import { StayCard } from '../components/StayCard'
import { WalkInRoomTypeSelector, type WalkInRoomEntry } from '../components/WalkInRoomTypeSelector'
import type { BookingFormValues, RoomTypeResponse } from '../types'
import { ROUTES } from '@/app/routes'

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getDateStr(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().split('T')[0]
}

function parseISO(iso: string): Date | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  return isValid(date) ? date : null
}

function calcNights(checkIn: string, checkOut: string): number {
  const ci = parseISO(checkIn)
  const co = parseISO(checkOut)
  if (!ci || !co) return 0
  return Math.max(0, differenceInDays(co, ci))
}

// ─── Walk-in schema ───────────────────────────────────────────────────────────

const walkInRoomEntrySchema = z.object({
  roomTypeId: z.string(),
  quantity: z.number().min(0),
})

const walkInSchema = z
  .object({
    guestName: z
      .string()
      .min(1, 'กรุณาระบุชื่อผู้เข้าพัก')
      .max(200, 'ชื่อต้องไม่เกิน 200 ตัวอักษร'),
    phone: z
      .string()
      .min(1, 'กรุณาระบุเบอร์โทรศัพท์')
      .max(20, 'เบอร์โทรต้องไม่เกิน 20 ตัวอักษร'),
    checkIn: z.string().min(1, 'กรุณาเลือกวันเช็คอิน'),
    checkOut: z.string().min(1, 'กรุณาเลือกวันเช็คเอาท์'),
    rooms: z
      .array(walkInRoomEntrySchema)
      .refine(
        (rooms) => rooms.reduce((sum, r) => sum + r.quantity, 0) > 0,
        { message: 'กรุณาเลือกห้องพักอย่างน้อย 1 ห้อง' },
      ),
  })
  .refine(
    (data) => !data.checkIn || !data.checkOut || data.checkOut > data.checkIn,
    { message: 'วันเช็คเอาท์ต้องหลังวันเช็คอิน', path: ['checkOut'] },
  )

type WalkInFormValues = z.infer<typeof walkInSchema>

// ─── Normal booking schema ────────────────────────────────────────────────────

const staySchema = z
  .object({
    room_type_id: z.string().min(1, 'กรุณาเลือกประเภทห้อง'),
    check_in: z.string().min(1, 'กรุณาเลือกวันเช็คอิน'),
    check_out: z.string().min(1, 'กรุณาเลือกวันเช็คเอาท์'),
  })
  .refine(
    (data) => !data.check_in || !data.check_out || data.check_out > data.check_in,
    { message: 'วันเช็คเอาท์ต้องหลังวันเช็คอิน', path: ['check_out'] },
  )

const bookingSchema = z.object({
  guest_name: z
    .string()
    .min(1, 'กรุณาระบุชื่อผู้เข้าพัก')
    .max(200, 'ชื่อต้องไม่เกิน 200 ตัวอักษร'),
  guest_phone: z
    .string()
    .min(1, 'กรุณาระบุเบอร์โทรศัพท์')
    .max(20, 'เบอร์โทรต้องไม่เกิน 20 ตัวอักษร'),
  stays: z.array(staySchema).min(1, 'กรุณาเพิ่มรายการห้องพักอย่างน้อย 1 รายการ'),
})

const EMPTY_STAY = { room_type_id: '', check_in: '', check_out: '' }

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CreateBookingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isWalkIn = searchParams.get('mode') === 'walkin'

  const [checkInSuccess, setCheckInSuccess] = useState(false)
  const { data: roomTypes = [], isLoading: roomTypesLoading } = useRoomTypes()
  const createBooking = useCreateBooking()

  // ── Walk-in form ────────────────────────────────────────────────────────────
  const walkInForm = useForm<WalkInFormValues>({
    resolver: zodResolver(walkInSchema),
    mode: 'onBlur',
    defaultValues: {
      guestName: '',
      phone: '',
      checkIn: getDateStr(0),
      checkOut: getDateStr(1),
      rooms: [],
    },
  })

  // Always called unconditionally to satisfy rules-of-hooks.
  // Results are only used when isWalkIn is true.
  const walkInRooms    = useWatch({ control: walkInForm.control, name: 'rooms' })
  const walkInName     = useWatch({ control: walkInForm.control, name: 'guestName' })
  const walkInPhone    = useWatch({ control: walkInForm.control, name: 'phone' })
  const walkInCheckIn  = useWatch({ control: walkInForm.control, name: 'checkIn' })
  const walkInCheckOut = useWatch({ control: walkInForm.control, name: 'checkOut' })

  const walkInTotalQty = walkInRooms.reduce((sum, r) => sum + r.quantity, 0)

  // ── Normal booking form ─────────────────────────────────────────────────────
  const [guestInfoOpen, setGuestInfoOpen] = useState(true)
  const [stayAvailability, setStayAvailability] = useState<Record<number, boolean | null>>({})

  const bookingForm = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    mode: 'onBlur',
    defaultValues: {
      guest_name: '',
      guest_phone: '',
      stays: [{ ...EMPTY_STAY }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: bookingForm.control,
    name: 'stays',
  })

  const handleAvailabilityChange = useCallback(
    (index: number, available: boolean | null) => {
      setStayAvailability((prev) => {
        if (prev[index] === available) return prev
        return { ...prev, [index]: available }
      })
    },
    [],
  )

  const handleRemoveStay = useCallback(
    (index: number) => {
      remove(index)
      setStayAvailability((prev) => {
        const next: Record<number, boolean | null> = {}
        Object.entries(prev).forEach(([k, v]) => {
          const ki = Number(k)
          if (ki < index) next[ki] = v
          else if (ki > index) next[ki - 1] = v
        })
        return next
      })
    },
    [remove],
  )

  // ── Shared derived state ────────────────────────────────────────────────────
  const isSubmitting   = createBooking.isPending
  const anyStayFull    = fields.some((_, i) => stayAvailability[i] === false)

  const walkInSubmitDisabled =
    isSubmitting ||
    !walkInName.trim() ||
    !walkInPhone.trim() ||
    walkInTotalQty === 0 ||
    checkInSuccess

  const bookingSubmitDisabled = isSubmitting || anyStayFull

  // ── Submit handlers ─────────────────────────────────────────────────────────
  const onWalkInSubmit = walkInForm.handleSubmit((values) => {
    createBooking.mutate(
      {
        guest_name: values.guestName,
        guest_phone: values.phone,
        room_requests: values.rooms
          .filter((r) => r.quantity > 0)
          .map((r) => ({
            room_type_id: r.roomTypeId,
            quantity: r.quantity,
            check_in:  `${values.checkIn}T00:00:00Z`,
            check_out: `${values.checkOut}T00:00:00Z`,
          })),
      },
      {
        onSuccess: (booking) => {
          setCheckInSuccess(true)
          toast.success('เช็คอินกลุ่มสำเร็จ')
          setTimeout(() => navigate(ROUTES.bookings.detail(booking.id)), 800)
        },
        onError: (error: Error) => {
          toast.error(error.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
        },
      },
    )
  })

  const onBookingSubmit = bookingForm.handleSubmit((values) => {
    createBooking.mutate(
      {
        guest_name: values.guest_name,
        guest_phone: values.guest_phone,
        room_requests: values.stays.map((s) => ({
          room_type_id: s.room_type_id,
          quantity: 1,
          check_in:  `${s.check_in}T00:00:00Z`,
          check_out: `${s.check_out}T00:00:00Z`,
        })),
      },
      {
        onSuccess: (booking) => {
          toast.success(`สร้างการจอง #${booking.id.slice(0, 8)} สำเร็จ`)
          navigate(ROUTES.bookings.list)
        },
        onError: (error: Error) => {
          toast.error(error.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
        },
      },
    )
  })

  // ── Walk-in layout ──────────────────────────────────────────────────────────
  if (isWalkIn) {
    const walkInLabel = checkInSuccess
      ? 'เช็คอินกลุ่มสำเร็จ'
      : isSubmitting
      ? 'กำลังบันทึก...'
      : 'เช็คอินกลุ่มทันที'

    return (
      <>
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-32 md:pb-10 space-y-6">

          {/* ── Header ────────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-semibold tracking-tight">Walk-in Check-in</h1>
              <Badge variant="gray" className="border border-border">WALK-IN</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              เช็คอินทันทีสำหรับลูกค้าที่เดินเข้ามา — รองรับหลายห้องในครั้งเดียว
            </p>
          </div>

          <Form {...walkInForm}>
            <form onSubmit={onWalkInSubmit} className="space-y-6" noValidate>

              {/* 1: Room & Date ─────────────────────────────────────────── */}
              <WalkInRoomDateSection
                control={walkInForm.control}
                roomTypes={roomTypesLoading ? [] : roomTypes}
                roomTypesLoading={roomTypesLoading}
                checkIn={walkInCheckIn}
                checkOut={walkInCheckOut}
              />

              {/* 2: Guest Info ──────────────────────────────────────────── */}
              <WalkInGuestCard control={walkInForm.control} />

              {/* 3: Group Summary ───────────────────────────────────────── */}
              <WalkInGroupSummary
                rooms={walkInRooms}
                checkIn={walkInCheckIn}
                checkOut={walkInCheckOut}
                roomTypes={roomTypes}
              />

              {/* Desktop submit */}
              <div className="hidden md:flex md:justify-end md:pt-2">
                <SubmitButton
                  disabled={walkInSubmitDisabled}
                  isPending={isSubmitting}
                  label={walkInLabel}
                />
              </div>

            </form>
          </Form>
        </div>

        <BottomBar>
          <SubmitButton
            disabled={walkInSubmitDisabled}
            isPending={isSubmitting}
            label={walkInLabel}
            fullWidth
            onClick={onWalkInSubmit}
          />
        </BottomBar>
      </>
    )
  }

  // ── Normal booking layout ───────────────────────────────────────────────────
  const bookingLabel = anyStayFull
    ? 'บางห้องเต็ม — ไม่สามารถจองได้'
    : isSubmitting
    ? 'กำลังบันทึก...'
    : 'ยืนยันการจอง'

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-32 md:pb-10 space-y-6">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">สร้างการจอง</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            กรอกข้อมูลผู้เข้าพักและรายการห้องพัก
          </p>
        </div>

        <Form {...bookingForm}>
          <form onSubmit={onBookingSubmit} className="space-y-6" noValidate>

            <GuestInfoCard
              control={bookingForm.control}
              open={guestInfoOpen}
              onToggle={() => setGuestInfoOpen((v) => !v)}
            />

            <RoomStayList
              fields={fields}
              control={bookingForm.control}
              roomTypes={roomTypesLoading ? [] : roomTypes}
              onRemove={handleRemoveStay}
              onAvailabilityChange={handleAvailabilityChange}
            />

            {bookingForm.formState.errors.stays?.root?.message && (
              <p className="text-sm text-destructive">
                {bookingForm.formState.errors.stays.root.message}
              </p>
            )}

            <Separator />

            <AddStayButton onClick={() => append({ ...EMPTY_STAY })} />

            <BookingSummary control={bookingForm.control} roomTypes={roomTypes} />

            <div className="hidden md:flex md:justify-end md:pt-2">
              <SubmitButton
                disabled={bookingSubmitDisabled}
                isPending={isSubmitting}
                label={bookingLabel}
              />
            </div>

          </form>
        </Form>
      </div>

      <BottomBar>
        <SubmitButton
          disabled={bookingSubmitDisabled}
          isPending={isSubmitting}
          label={bookingLabel}
          fullWidth
          onClick={onBookingSubmit}
        />
      </BottomBar>
    </>
  )
}

// ─── WalkInRoomDateSection ────────────────────────────────────────────────────

function WalkInRoomDateSection({
  control,
  roomTypes,
  roomTypesLoading,
  checkIn,
  checkOut,
}: {
  control: Control<WalkInFormValues>
  roomTypes: RoomTypeResponse[]
  roomTypesLoading: boolean
  checkIn: string
  checkOut: string
}) {
  const [showDateEdit, setShowDateEdit] = useState(false)
  const checkInLabel  = checkIn  ? formatThaiDate(checkIn)  : '—'
  const checkOutLabel = checkOut ? formatThaiDate(checkOut) : '—'

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">ห้องพักและวันที่</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">

        {/* ── Compact date summary ────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-foreground">
            <span className="text-muted-foreground">เช็คอิน: </span>
            <span className="font-medium">{checkInLabel}</span>
            <span className="mx-2 text-muted-foreground">→</span>
            <span className="text-muted-foreground">เช็คเอาท์: </span>
            <span className="font-medium">{checkOutLabel}</span>
          </p>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto shrink-0 gap-1 p-0 text-xs"
            onClick={() => setShowDateEdit((v) => !v)}
          >
            <Pencil className="w-3 h-3" />
            {showDateEdit ? 'ซ่อน' : 'แก้ไขวันที่'}
          </Button>
        </div>

        {/* ── Editable date inputs ────────────────────────────────────── */}
        {showDateEdit && (
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={control}
              name="checkIn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>เช็คอิน</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="checkOut"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>เช็คเอาท์</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* ── Room type multi-select ──────────────────────────────────── */}
        <FormField
          control={control}
          name="rooms"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>เลือกประเภทห้องพัก</FormLabel>
              <FormControl>
                <WalkInRoomTypeSelector
                  roomTypes={roomTypes}
                  checkIn={checkIn}
                  checkOut={checkOut}
                  selectedRooms={field.value}
                  onChange={field.onChange}
                  loading={roomTypesLoading}
                  autoFocusFirst
                />
              </FormControl>
              {/* Handles the array-level refine error */}
              {(fieldState.error?.message ??
                (fieldState.error as { root?: { message?: string } } | undefined)?.root?.message) && (
                <p className="text-xs text-destructive">
                  {fieldState.error?.message ??
                    (fieldState.error as { root?: { message?: string } })?.root?.message}
                </p>
              )}
            </FormItem>
          )}
        />

      </CardContent>
    </Card>
  )
}

// ─── WalkInGuestCard ──────────────────────────────────────────────────────────

function WalkInGuestCard({ control }: { control: Control<WalkInFormValues> }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">ข้อมูลผู้เข้าพัก</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <FormField
          control={control}
          name="guestName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ชื่อผู้เข้าพัก</FormLabel>
              <FormControl>
                <Input {...field} placeholder="เช่น สมชาย ใจดี" />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>เบอร์โทรศัพท์</FormLabel>
              <FormControl>
                <Input {...field} type="tel" placeholder="เช่น 081-234-5678" />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}

// ─── WalkInGroupSummary ───────────────────────────────────────────────────────

function WalkInGroupSummary({
  rooms,
  checkIn,
  checkOut,
  roomTypes,
}: {
  rooms: WalkInRoomEntry[]
  checkIn: string
  checkOut: string
  roomTypes: RoomTypeResponse[]
}) {
  const nights      = calcNights(checkIn, checkOut)
  const activeRooms = rooms.filter((r) => r.quantity > 0)

  if (activeRooms.length === 0 || nights === 0) return null

  const roomTypeMap = Object.fromEntries(roomTypes.map((rt) => [rt.id, rt]))

  const lines = activeRooms.map((r) => {
    const rt       = roomTypeMap[r.roomTypeId]
    const subtotal =
      rt?.price_per_night != null ? rt.price_per_night * r.quantity * nights : null
    return {
      name:         rt?.name ?? '—',
      quantity:     r.quantity,
      pricePerNight: rt?.price_per_night,
      subtotal,
    }
  })

  const grandTotal = lines.every((l) => l.subtotal != null)
    ? lines.reduce((sum, l) => sum + (l.subtotal ?? 0), 0)
    : null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">สรุปการเข้าพักแบบกลุ่ม</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">

        {lines.map((l, i) => (
          <div key={i} className="space-y-0.5">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{l.name}</span>
              <span className="text-muted-foreground shrink-0">{l.quantity} ห้อง</span>
            </div>
            {l.pricePerNight != null && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  ฿{l.pricePerNight.toLocaleString()} × {l.quantity} ห้อง × {nights} คืน
                </span>
                {l.subtotal != null && <span>{formatTHB(l.subtotal)}</span>}
              </div>
            )}
          </div>
        ))}

        <Separator />

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">จำนวนคืน</span>
          <span className="font-medium">{nights} คืน</span>
        </div>

        {grandTotal != null && (
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">รวมทั้งหมด</span>
            <span className="text-base font-semibold text-primary">{formatTHB(grandTotal)}</span>
          </div>
        )}

      </CardContent>
    </Card>
  )
}

// ─── GuestInfoCard (normal booking) ──────────────────────────────────────────

function GuestInfoCard({
  control,
  open,
  onToggle,
}: {
  control: Control<BookingFormValues>
  open: boolean
  onToggle: () => void
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">ข้อมูลผู้เข้าพัก</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden -mr-2 h-8 w-8"
            aria-label={open ? 'ซ่อนข้อมูล' : 'แสดงข้อมูล'}
            onClick={onToggle}
          >
            <ChevronDown
              className={cn('w-4 h-4 transition-transform duration-200', open && 'rotate-180')}
            />
          </Button>
        </div>
      </CardHeader>
      <div className={cn('md:block', !open && 'hidden')}>
        <CardContent className="space-y-4 pt-0">
          <FormField
            control={control}
            name="guest_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ชื่อผู้เข้าพัก</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="เช่น สมชาย ใจดี" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="guest_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>เบอร์โทรศัพท์</FormLabel>
                <FormControl>
                  <Input {...field} type="tel" placeholder="เช่น 081-234-5678" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </CardContent>
      </div>
    </Card>
  )
}

// ─── RoomStayList ─────────────────────────────────────────────────────────────

function RoomStayList({
  fields,
  control,
  roomTypes,
  onRemove,
  onAvailabilityChange,
}: {
  fields: FieldArrayWithId<BookingFormValues, 'stays'>[]
  control: Control<BookingFormValues>
  roomTypes: RoomTypeResponse[]
  onRemove: (index: number) => void
  onAvailabilityChange: (index: number, available: boolean | null) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">รายการห้องพัก</h2>
        <span className="text-xs text-muted-foreground">{fields.length} ห้อง</span>
      </div>
      {fields.map((field, index) => (
        <StayCard
          key={field.id}
          index={index}
          totalStays={fields.length}
          control={control}
          roomTypes={roomTypes}
          onRemove={() => onRemove(index)}
          onAvailabilityChange={onAvailabilityChange}
        />
      ))}
    </div>
  )
}

// ─── AddStayButton ────────────────────────────────────────────────────────────

function AddStayButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="outline" className="w-full md:w-auto" onClick={onClick}>
      <Plus className="w-4 h-4 mr-2" />
      เพิ่มห้องพัก
    </Button>
  )
}

// ─── BookingSummary (normal booking) ─────────────────────────────────────────

function BookingSummary({
  control,
  roomTypes,
}: {
  control: Control<BookingFormValues>
  roomTypes: RoomTypeResponse[]
}) {
  const stays = useWatch({ control, name: 'stays' })
  const completeStays = stays.filter(
    (s) => s.room_type_id && s.check_in && s.check_out && s.check_out > s.check_in,
  )
  if (completeStays.length === 0) return null

  const roomTypeMap = Object.fromEntries(roomTypes.map((rt) => [rt.id, rt.name]))
  const totalNights = completeStays.reduce(
    (sum, s) => sum + calcNights(s.check_in, s.check_out),
    0,
  )

  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">สรุปการจอง</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {completeStays.map((s, i) => {
          const nights = calcNights(s.check_in, s.check_out)
          return (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {roomTypeMap[s.room_type_id] ?? 'ห้องพัก'}
              </span>
              <span>{nights} คืน</span>
            </div>
          )
        })}
        <Separator className="my-1" />
        <div className="flex justify-between text-sm font-medium">
          <span>รวม {completeStays.length} ห้อง</span>
          <span>{totalNights} คืน</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── SubmitButton ─────────────────────────────────────────────────────────────

interface SubmitButtonProps {
  disabled: boolean
  isPending: boolean
  label: string
  fullWidth?: boolean
  onClick?: () => void
}

function SubmitButton({ disabled, isPending, label, fullWidth, onClick }: SubmitButtonProps) {
  return (
    <Button
      type={onClick ? 'button' : 'submit'}
      disabled={disabled}
      className={cn(fullWidth && 'w-full')}
      onClick={onClick}
    >
      {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {label}
    </Button>
  )
}
