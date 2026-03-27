import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone, User, Receipt, CreditCard, Pencil } from 'lucide-react'
import { Skeleton } from '@/shared/ui/skeleton'
import toast from 'react-hot-toast'
import { todayISO } from '@/shared/utils'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Separator } from '@/shared/ui/separator'
import { formatThaiDate, formatTHB, formatPhone } from '@/shared/utils'
import ErrorPage from '@/shared/components/ErrorPage'
import { useBooking, useUpdateBooking } from '../hooks'
import { InlineCheckIn } from '../shared/components/InlineCheckIn'
import { PaymentPanel } from '../booking-detail/components/PaymentPanel'
import { StayCardOperational } from '../booking-detail/components/StayCardOperational'
import { ReceiptSection } from '../booking-detail/components/ReceiptSection'
import { EventTimeline } from '../booking-detail/components/EventTimeline'
import { AddStayPanel } from '../booking-detail/components/AddStayPanel'
import { BookingEditForm } from '../booking-detail/components/BookingEditForm'
import { bookingStatusVariant } from '../booking-detail/utils/bookingStatusHelpers'
import { getStatusLabel } from '../types'

export default function BookingDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: booking, isLoading, isError } = useBooking(id)

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editDiscount, setEditDiscount] = useState('')
  const [editCustomerId, setEditCustomerId] = useState<string | undefined>(undefined)
  const [editCustomerLabel, setEditCustomerLabel] = useState<string | undefined>(undefined)
  const updateBooking = useUpdateBooking(id)

  const bd = useMemo(() => {
    if (!booking) return null
    const active = booking.room_stays.filter((s) => s.status !== 'CANCELLED')
    return { active, pending: active.filter((s) => s.status === 'RESERVED' || s.status === 'ASSIGNED') }
  }, [booking])

  function startEdit() {
    if (!booking) return
    setEditName(booking.guest_name); setEditPhone(booking.guest_phone)
    setEditDiscount(String(booking.discount_amount || 0))
    setEditCustomerId(booking.customer_id ?? undefined); setEditCustomerLabel(booking.customer_name ?? undefined)
    setEditing(true)
  }

  function saveEdit() {
    if (!booking) return
    const payload: Record<string, unknown> = {}
    if (editName !== booking.guest_name) payload.guest_name = editName
    if (editPhone !== booking.guest_phone) payload.guest_phone = editPhone
    const disc = parseFloat(editDiscount) || 0
    if (disc !== booking.discount_amount) payload.discount_amount = disc
    if (editCustomerId !== (booking.customer_id ?? undefined)) {
      if (editCustomerId) payload.customer_id = editCustomerId
      else payload.clear_customer = true
    }
    if (Object.keys(payload).length === 0) { setEditing(false); return }
    updateBooking.mutate(payload as Parameters<typeof updateBooking.mutate>[0], {
      onSuccess: () => { toast.success('บันทึกการแก้ไขเรียบร้อย'); setEditing(false) },
      onError: (err) => { toast.error((err as Error).message || 'เกิดข้อผิดพลาด') },
    })
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-3"><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-24 rounded-xl" /></div>
        <Skeleton className="h-40 rounded-xl" /><Skeleton className="h-32 rounded-xl" />
      </div>
    )
  }

  if (isError || !booking || !bd) {
    return <ErrorPage variant="error" title="ไม่พบข้อมูลการจอง" description="รายการจองนี้อาจถูกลบไปแล้ว หรือเกิดข้อผิดพลาดในการโหลดข้อมูล" />
  }

  const todayStr = todayISO()
  const checkInPendingStays = bd.pending.filter((s) => s.check_in.slice(0, 10) <= todayStr)

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-10 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => navigate('/bookings')}>
          <ArrowLeft className="w-4 h-4 mr-1" />รายการจอง
        </Button>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-section">#{booking.id.slice(0, 8).toUpperCase()}</h1>
                  <Badge variant={bookingStatusVariant(booking.status)}>{getStatusLabel(booking.status)}</Badge>
                  <Badge variant="outline" className="text-micro">{booking.source === 'walk_in' ? 'วอล์คอิน' : booking.source === 'online' ? 'ออนไลน์' : 'จองล่วงหน้า'}</Badge>
                </div>
                <p className="text-helper mt-1">สร้างเมื่อ {formatThaiDate(booking.created_at)}</p>
              </div>
              {!editing && booking.status !== 'CHECKED_OUT' && booking.status !== 'CANCELLED' && (
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground shrink-0" onClick={startEdit}>
                  <Pencil className="w-3.5 h-3.5 mr-1" />แก้ไข
                </Button>
              )}
            </div>
            <Separator className="my-3" />
            {editing ? (
              <BookingEditForm
                editName={editName} setEditName={setEditName}
                editPhone={editPhone} setEditPhone={setEditPhone}
                editDiscount={editDiscount} setEditDiscount={setEditDiscount}
                editCustomerId={editCustomerId} setEditCustomerId={setEditCustomerId}
                editCustomerLabel={editCustomerLabel} setEditCustomerLabel={setEditCustomerLabel}
                isPending={updateBooking.isPending}
                onCancel={() => setEditing(false)} onSave={saveEdit}
              />
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 shrink-0 text-muted-foreground" /><span className="text-body font-medium">{booking.guest_name}</span></div>
                  <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 shrink-0 text-muted-foreground" /><span className="text-body">{formatPhone(booking.guest_phone)}</span></div>
                </div>
                {booking.customer_name && (
                  <div className="flex items-center gap-2"><CreditCard className="w-3.5 h-3.5 shrink-0 text-muted-foreground" /><span className="text-body text-muted-foreground">ผู้ชำระเงิน: {booking.customer_name}</span></div>
                )}
                {booking.discount_amount > 0 && (
                  <div className="flex items-center gap-2"><Receipt className="w-3.5 h-3.5 shrink-0 text-muted-foreground" /><span className="text-body text-muted-foreground">ส่วนลด: {formatTHB(booking.discount_amount)}</span></div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {checkInPendingStays.length > 0 && <InlineCheckIn bookingId={id} pendingStays={checkInPendingStays} />}

      <div className="space-y-4">
        <h2 className="text-section">รายการห้องพัก<span className="ml-2 text-body font-normal text-muted-foreground">{booking.room_stays.length} ห้อง</span></h2>
        {booking.room_stays.map((stay) => <StayCardOperational key={stay.id} bookingId={booking.id} stay={stay} booking={booking} />)}
        {booking.status !== 'CANCELLED' && booking.status !== 'CHECKED_OUT' && <AddStayPanel bookingId={id} />}
      </div>

      <PaymentPanel booking={booking} />
      <ReceiptSection bookingId={id} booking={booking} stays={bd.active} />
      {booking.events && booking.events.length > 0 && <EventTimeline events={booking.events} />}
    </div>
  )
}
