import { User } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import type { Dispatch } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────

type GuestAction =
  | { type: 'SET_GUEST_NAME'; value: string }
  | { type: 'SET_GUEST_PHONE'; value: string }

interface InlineGuestFieldsProps {
  guestName: string
  guestPhone: string
  dispatch: Dispatch<GuestAction>
}

// ── Component ────────────────────────────────────────────────────────────────

export function InlineGuestFields({ guestName, guestPhone, dispatch }: InlineGuestFieldsProps) {
  return (
    <div className="rounded-lg bg-muted/50 p-3 space-y-2">
      <p className="text-micro-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <User size={12} />
        ผู้เข้าพัก
      </p>
      <div className="grid grid-cols-5 gap-2">
        <div className="col-span-3">
          <Label htmlFor="drawer-guest-name" className="text-xs text-muted-foreground">ชื่อ</Label>
          <Input
            id="drawer-guest-name"
            value={guestName}
            onChange={(e) => dispatch({ type: 'SET_GUEST_NAME', value: e.target.value })}
            placeholder="สมชาย ใจดี"
            className="mt-0.5 h-9 text-sm"
            autoFocus
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="drawer-guest-phone" className="text-xs text-muted-foreground">เบอร์โทร</Label>
          <Input
            id="drawer-guest-phone"
            value={guestPhone}
            onChange={(e) => dispatch({ type: 'SET_GUEST_PHONE', value: e.target.value })}
            inputMode="numeric"
            maxLength={10}
            placeholder="0812345678"
            className="mt-0.5 h-9 text-sm"
          />
        </div>
      </div>
      {guestPhone.length > 0 && guestPhone.length !== 10 && (
        <p className="text-xs text-destructive">เบอร์โทรศัพท์ต้องมี 10 หลัก</p>
      )}
    </div>
  )
}
