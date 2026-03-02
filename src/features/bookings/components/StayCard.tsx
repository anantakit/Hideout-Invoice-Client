import { useEffect } from 'react'
import { useWatch, useController } from 'react-hook-form'
import type { Control } from 'react-hook-form'
import { Trash2, Loader2 } from 'lucide-react'
import { differenceInDays, isValid } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '../../../shared/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../shared/ui/select'
import { DateRangePicker } from './DateRangePicker'
import { Button } from '../../../shared/ui/button'
import { Badge } from '../../../shared/ui/badge'
import { useAvailability } from '../hooks/useAvailability'
import type { AvailabilityStatus as AvailStatus } from '../hooks/useAvailability'
import type { BookingFormValues, RoomTypeResponse } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Availability status badge ────────────────────────────────────────────────

interface AvailStatusProps {
  status: AvailStatus
  remaining: number
  loading: boolean
  roomTypeSelected: boolean
  datesSelected: boolean
}

function AvailabilityStatus({ status, remaining, loading, roomTypeSelected, datesSelected }: AvailStatusProps) {
  if (roomTypeSelected && !datesSelected) return <Badge variant="gray">ยังไม่ได้เลือกวันที่</Badge>
  if (status === 'idle') return null
  if (loading) return (
    <Badge variant="gray" className="gap-1">
      <Loader2 className="w-3 h-3 animate-spin" />
      กำลังตรวจสอบ
    </Badge>
  )
  if (status === 'full')      return <Badge variant="red">ห้องเต็ม</Badge>
  if (status === 'limited')   return <Badge variant="amber">เหลือ {remaining} ห้อง</Badge>
  return <Badge variant="green">ว่าง {remaining} ห้อง</Badge>
}

// ─── StayCard ─────────────────────────────────────────────────────────────────

export interface StayCardProps {
  index: number
  totalStays: number
  control: Control<BookingFormValues>
  roomTypes: RoomTypeResponse[]
  onRemove: () => void
  /** Called when this stay's availability status changes.
   *  `true` = has rooms, `false` = full, `null` = unknown / loading. */
  onAvailabilityChange: (index: number, available: boolean | null) => void
}

export function StayCard({
  index,
  totalStays,
  control,
  roomTypes,
  onRemove,
  onAvailabilityChange,
}: StayCardProps) {
  // Room type (watch only — handled by FormField below).
  const roomTypeId = useWatch({ control, name: `stays.${index}.room_type_id` })

  // Date range — combine two fields into one DateRangePicker.
  const {
    field: checkInField,
    fieldState: { error: checkInError },
  } = useController({ control, name: `stays.${index}.check_in` })

  const {
    field: checkOutField,
    fieldState: { error: checkOutError },
  } = useController({ control, name: `stays.${index}.check_out` })

  const checkIn  = checkInField.value
  const checkOut = checkOutField.value

  const roomTypeSelected = Boolean(roomTypeId)
  const datesSelected    = Boolean(checkIn && checkOut)
  const nights           = calcNights(checkIn, checkOut)
  const { status, remaining, loading } = useAvailability({ roomTypeId, checkIn, checkOut })

  // Propagate availability to parent to gate the submit button.
  useEffect(() => {
    if (status === 'idle' || loading) {
      onAvailabilityChange(index, null)
    } else {
      onAvailabilityChange(index, status !== 'full')
    }
  }, [status, loading, index, onAvailabilityChange])

  const dateError = checkInError?.message ?? checkOutError?.message

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            ห้องพัก {index + 1}
          </CardTitle>

          <div className="flex items-center gap-2">
            <AvailabilityStatus
              status={status}
              remaining={remaining}
              loading={loading}
              datesSelected={datesSelected}
              roomTypeSelected={roomTypeSelected}
            />
            {totalStays > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={onRemove}
              >
                <Trash2 className="w-4 h-4" />
                <span className="sr-only">ลบห้อง {index + 1}</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Room type */}
        <FormField
          control={control}
          name={`stays.${index}.room_type_id`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>ประเภทห้อง</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกประเภทห้อง" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {roomTypes.length === 0 ? (
                    <SelectItem value="_empty" disabled>
                      ไม่พบประเภทห้อง
                    </SelectItem>
                  ) : (
                    roomTypes.map((rt) => (
                      <SelectItem key={rt.id} value={rt.id}>
                        {rt.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date range picker */}
        <FormItem>
          <FormLabel>
            วันเช็คอิน → เช็คเอาท์
            {datesSelected && nights > 0 && (
              <span className="ml-2 font-normal text-muted-foreground">
                ({nights} คืน)
              </span>
            )}
          </FormLabel>
          <DateRangePicker
            value={{ checkIn, checkOut }}
            onChange={({ checkIn: ci, checkOut: co }) => {
              checkInField.onChange(ci)
              checkOutField.onChange(co)
            }}
            disabled={!roomTypeSelected}
            placeholder={
              !roomTypeSelected
                ? 'เลือกประเภทห้องก่อน'
                : 'เลือกวันเช็คอิน → เช็คเอาท์'
            }
          />
          {dateError && (
            <p className="text-sm font-medium text-destructive">{dateError}</p>
          )}
        </FormItem>
      </CardContent>
    </Card>
  )
}
