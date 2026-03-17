import { useState, useMemo } from 'react'
import { Plus, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/shared/utils'
import { formatTHB, todayISO, addDaysISO } from '@/shared/utils'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { DateRangePicker } from '../../shared/components/DateRangePicker'
import type { DateRange } from '../../shared/components/DateRangePicker'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/shared/ui/select'
import { useRoomTypes, useAvailabilityGrouped, useAddStays } from '../../hooks'

interface AddStayPanelProps {
  bookingId: string
}

export function AddStayPanel({ bookingId }: AddStayPanelProps) {
  const [open, setOpen] = useState(false)
  const [checkIn, setCheckIn] = useState(todayISO)
  const [checkOut, setCheckOut] = useState(() => addDaysISO(1))
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState('')
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)

  const { data: roomTypes } = useRoomTypes()
  const addStays = useAddStays(bookingId)

  const datesValid = checkIn && checkOut && checkOut > checkIn
  const nights = datesValid
    ? Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 0

  const { data: availability, isLoading: availLoading } = useAvailabilityGrouped(
    checkIn,
    checkOut,
    open && !!datesValid && !!selectedRoomTypeId,
  )

  const availableRooms = useMemo(() => {
    if (!availability || !selectedRoomTypeId) return []
    const rt = availability.room_types.find((t) => t.room_type_id === selectedRoomTypeId)
    if (!rt) return []
    return rt.rooms.filter((r) => r.available)
  }, [availability, selectedRoomTypeId])

  const selectedRoomType = useMemo(
    () => roomTypes?.find((rt) => rt.id === selectedRoomTypeId),
    [roomTypes, selectedRoomTypeId],
  )
  const pricePerNight = selectedRoomType?.price_per_night ?? 0
  const totalPrice = pricePerNight * nights

  const canSubmit = datesValid && selectedRoomTypeId && !addStays.isPending

  function reset() {
    setCheckIn(todayISO())
    setCheckOut(addDaysISO(1))
    setSelectedRoomTypeId('')
    setSelectedRoomId(null)
  }

  function handleSubmit() {
    if (!canSubmit) return
    addStays.mutate(
      {
        stays: [{
          room_type_id: selectedRoomTypeId,
          room_id: selectedRoomId || undefined,
          check_in: checkIn,
          check_out: checkOut,
        }],
      },
      {
        onSuccess: () => {
          toast.success('เพิ่มห้องพักสำเร็จ')
          reset()
          setOpen(false)
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error || err.message || 'เกิดข้อผิดพลาด'
          toast.error(msg)
        },
      },
    )
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        <Plus className="w-4 h-4 mr-1.5" />
        เพิ่มห้องพัก
      </Button>
    )
  }

  return (
    <Card>
      <CardContent className="px-4 py-3 space-y-4">
        {/* ── Header ────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <p className="text-body font-medium">เพิ่มห้องพัก</p>
          <button
            type="button"
            onClick={() => { setOpen(false); reset() }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Dates ─────────────────────────────────────────── */}
        <div>
          <label className="text-caption block mb-1">วันเข้าพัก — วันออก</label>
          <DateRangePicker
            value={{ checkIn, checkOut }}
            onChange={(range: DateRange) => {
              setCheckIn(range.checkIn)
              setCheckOut(range.checkOut)
              setSelectedRoomId(null)
            }}
          />
        </div>

        {/* ── Room type ─────────────────────────────────────── */}
        <div>
          <label className="text-caption block mb-1">ประเภทห้อง</label>
          <Select
            value={selectedRoomTypeId}
            onValueChange={(v) => { setSelectedRoomTypeId(v); setSelectedRoomId(null) }}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกประเภทห้อง" />
            </SelectTrigger>
            <SelectContent>
              {roomTypes?.map((rt) => (
                <SelectItem key={rt.id} value={rt.id}>
                  {rt.name} — {formatTHB(rt.price_per_night ?? 0)}/คืน
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Room picker (optional) ────────────────────────── */}
        {selectedRoomTypeId && datesValid && (
          <div>
            <label className="text-caption block mb-1">
              เลือกห้อง <span className="text-micro text-muted-foreground">(ไม่บังคับ)</span>
            </label>
            {availLoading ? (
              <div className="flex items-center gap-1.5 text-caption text-muted-foreground py-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                กำลังโหลด...
              </div>
            ) : availableRooms.length === 0 ? (
              <p className="text-caption text-muted-foreground py-1">ไม่มีห้องว่างในประเภทนี้</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {availableRooms.map((room) => (
                  <button
                    key={room.room_id}
                    type="button"
                    onClick={() =>
                      setSelectedRoomId(selectedRoomId === room.room_id ? null : room.room_id)
                    }
                    className={cn(
                      'radius-card border px-3 py-1.5 text-body font-semibold tabular-nums transition-colors',
                      selectedRoomId === room.room_id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-foreground hover:bg-accent/60',
                    )}
                  >
                    {room.room_number}
                  </button>
                ))}
              </div>
            )}
            {selectedRoomId === null && availableRooms.length > 0 && (
              <p className="text-micro text-muted-foreground mt-1">
                ไม่เลือก = RESERVED (มอบหมายทีหลัง)
              </p>
            )}
          </div>
        )}

        {/* ── Price preview ─────────────────────────────────── */}
        {selectedRoomTypeId && datesValid && nights > 0 && (
          <div className="flex items-center justify-between text-body">
            <span className="text-muted-foreground">{formatTHB(pricePerNight)} × {nights} คืน</span>
            <span className="font-semibold tabular-nums">{formatTHB(totalPrice)}</span>
          </div>
        )}

        {/* ── Actions ───────────────────────────────────────── */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={addStays.isPending}
            onClick={() => { setOpen(false); reset() }}
          >
            ยกเลิก
          </Button>
          <Button
            size="sm"
            className="flex-1"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {addStays.isPending ? 'กำลังบันทึก…' : 'เพิ่มห้องพัก'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
