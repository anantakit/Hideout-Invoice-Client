import { Fragment } from 'react'
import { ArrowLeft, Loader2, Check } from 'lucide-react'
import { cn } from '@/shared/utils'
import { Button } from '@/shared/ui/button'
import { Form, FormField, FormItem } from '@/shared/ui/form'
import { ToggleGroup } from '@/shared/ui/ToggleGroup'
import { BookingSummary } from '../create-booking/components/BookingSummary'
import { BookingGuestSection } from '../create-booking/components/BookingGuestSection'
import { BookingStaySection } from '../create-booking/components/BookingStaySection'
import { BookingPaymentSection } from '../create-booking/components/BookingPaymentSection'
import { useCreateBookingForm, SOURCE_OPTIONS } from '../create-booking/hooks/useCreateBookingForm'

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CreateBookingPage() {
  const {
    form, paymentMode, isSubmitting,
    hasGuest, hasValidItems, hasPayment, canSubmit,
    submitLabel, onSubmit,
    selectedCustomer, setSelectedCustomer,
    customerModalOpen, setCustomerModalOpen,
    handleCustomerSave, isCreatingCustomer, navigate,
  } = useCreateBookingForm()

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-10 space-y-5">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground mb-1"
          onClick={() => navigate('/bookings')}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          กลับ
        </Button>
        <h1 className="text-h1 text-xl sm:text-2xl">สร้างการจอง</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          จองห้องพักล่วงหน้า หรือเช็คอินทันทีสำหรับผู้เข้าพักที่เดินเข้ามา
        </p>
      </div>

      {/* Progress — sticky so it stays visible while scrolling */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2.5 bg-background backdrop-blur-sm">
        <div className="flex items-center gap-1 max-w-2xl mx-auto">
          {[
            { label: 'ผู้เข้าพัก', done: hasGuest },
            { label: 'ห้องพัก', done: hasValidItems },
            { label: 'ชำระเงิน', done: hasPayment },
          ].map((step, i, arr) => (
            <Fragment key={step.label}>
              {i > 0 && (
                <div className={cn('h-px flex-1', arr[i - 1].done ? 'bg-primary/50' : 'bg-border')} />
              )}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold transition-colors motion-reduce:transition-none',
                  step.done
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border text-muted-foreground',
                )}>
                  {step.done ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className={cn(
                  'text-xs',
                  step.done ? 'text-foreground font-medium' : 'text-muted-foreground',
                )}>
                  {step.label}
                </span>
              </div>
            </Fragment>
          ))}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-5" noValidate>

          {/* ── 1. Source toggle ──────────────────────────────────────── */}
          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem>
                <ToggleGroup
                  options={SOURCE_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormItem>
            )}
          />

          {/* ── 2. Guest info ────────────────────────────────────────── */}
          <BookingGuestSection
            selectedCustomer={selectedCustomer}
            setSelectedCustomer={setSelectedCustomer}
            customerModalOpen={customerModalOpen}
            setCustomerModalOpen={setCustomerModalOpen}
            handleCustomerSave={handleCustomerSave}
            isCreatingCustomer={isCreatingCustomer}
          />

          {/* ── 3. Room bookings ─────────────────────────────────────── */}
          <BookingStaySection />

          {/* ── 4. Payment ───────────────────────────────────────────── */}
          <BookingPaymentSection paymentMode={paymentMode} />

          {/* ── 5. Summary ───────────────────────────────────────────── */}
          <BookingSummary />

          {/* Submit */}
          <div className="pt-4 pb-6">
            <Button type="submit" disabled={!canSubmit} className="w-full touch-target md:w-auto md:min-w-36 md:float-right">
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin motion-reduce:animate-none" />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
