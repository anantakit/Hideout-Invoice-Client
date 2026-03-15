import React, { useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  LogIn,
  LogOut,
  ExternalLink,
  XCircle,
  CalendarRange,
  ArrowRightLeft,
} from 'lucide-react'
import { startOfDay, parseISO } from 'date-fns'
import { cn } from '@/shared/utils'
import type { TimelineBooking } from '../../types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContextMenuState {
  booking: TimelineBooking
  roomId: string
  roomNumber: string
  x: number
  y: number
}

interface BookingContextMenuProps {
  state: ContextMenuState
  onClose: () => void
  onCheckIn: (booking: TimelineBooking, roomId: string) => void
  onCheckOut: (booking: TimelineBooking) => void
  onEarlyCheckout?: (booking: TimelineBooking) => void
  onOpenDetail: (booking: TimelineBooking) => void
  onCancel: (booking: TimelineBooking) => void
  onTransfer: (booking: TimelineBooking, roomId: string) => void
}

// ─── Menu Item ────────────────────────────────────────────────────────────────

interface MenuItemProps {
  icon: React.ElementType
  label: string
  onClick: () => void
  variant?: 'default' | 'destructive'
  disabled?: boolean
}

function MenuItem({ icon: Icon, label, onClick, variant = 'default', disabled }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 text-left text-body',
        'transition-colors radius-button',
        'focus-visible:outline-none',
        disabled && 'opacity-40 cursor-not-allowed',
        !disabled && variant === 'default' && 'text-foreground hover:bg-muted focus-visible:bg-muted',
        !disabled && variant === 'destructive' && 'text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10',
      )}
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) onClick()
      }}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </button>
  )
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

const BookingContextMenu = React.memo(function BookingContextMenu({
  state,
  onClose,
  onCheckIn,
  onCheckOut,
  onEarlyCheckout,
  onOpenDetail,
  onCancel,
  onTransfer,
}: BookingContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const { booking, roomId, roomNumber } = state
  const status = booking.status

  // Adjust position to keep menu within viewport
  const posRef = useRef({ x: state.x, y: state.y })
  useEffect(() => {
    const el = menuRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    let { x, y } = posRef.current
    if (x + rect.width > window.innerWidth - 8) x = window.innerWidth - rect.width - 8
    if (y + rect.height > window.innerHeight - 8) y = window.innerHeight - rect.height - 8
    if (x < 8) x = 8
    if (y < 8) y = 8
    el.style.left = `${x}px`
    el.style.top = `${y}px`
  }, [])
  posRef.current = { x: state.x, y: state.y }

  // Close on click outside or escape
  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    },
    [onClose],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [onClose],
  )

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside, true)
    document.addEventListener('keydown', handleKeyDown, true)
    // Also close on scroll to avoid stale position
    const scrollEl = document.querySelector('.flex-1.overflow-auto')
    const onScroll = () => onClose()
    scrollEl?.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true)
      document.removeEventListener('keydown', handleKeyDown, true)
      scrollEl?.removeEventListener('scroll', onScroll)
    }
  }, [handleClickOutside, handleKeyDown, onClose])

  // Focus first item on mount
  useEffect(() => {
    const first = menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
    first?.focus()
  }, [])

  // Keyboard navigation within menu
  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
    if (!items?.length) return

    const current = document.activeElement as HTMLButtonElement
    const idx = Array.from(items).indexOf(current)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[(idx + 1) % items.length].focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[(idx - 1 + items.length) % items.length].focus()
    }
  }, [])

  const { canCheckIn, canCheckOut, canEarlyCheckout, canTransfer, canCancel, isTerminal } = useMemo(() => {
    const today = startOfDay(new Date())
    const stayCheckIn = startOfDay(parseISO(booking.check_in))
    const stayCheckOut = startOfDay(parseISO(booking.check_out))
    return {
      canCheckIn: (status === 'RESERVED' || status === 'ASSIGNED') && stayCheckIn <= today,
      canCheckOut: status === 'CHECKED_IN',
      canEarlyCheckout: status === 'CHECKED_IN' && today < stayCheckOut,
      canTransfer: status === 'CHECKED_IN' || status === 'ASSIGNED',
      canCancel: status === 'RESERVED' || status === 'ASSIGNED' || status === 'CHECKED_IN',
      isTerminal: status === 'CHECKED_OUT' || status === 'CANCELLED',
    }
  }, [booking.check_in, booking.check_out, status])

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      onKeyDown={handleMenuKeyDown}
      className={cn(
        'fixed z-50 min-w-[200px]',
        'bg-card border border-border rounded-lg shadow-lg',
        'p-1',
        'animate-in fade-in-0 zoom-in-95 duration-100',
      )}
      style={{
        left: `${state.x}px`,
        top: `${state.y}px`,
      }}
    >
      {/* Header */}
      <div className="px-3 py-1.5 select-none">
        <p className="text-label text-foreground truncate">
          {booking.guest_name}
        </p>
        <p className="text-micro text-muted-foreground">
          ห้อง {roomNumber} · {booking.check_in} → {booking.check_out}
        </p>
      </div>

      <div className="h-px bg-border mx-1 my-0.5" />

      {/* Primary actions */}
      {canCheckIn && (
        <MenuItem
          icon={LogIn}
          label="เช็คอิน"
          onClick={() => { onCheckIn(booking, roomId); onClose() }}
        />
      )}

      {canCheckOut && (
        <MenuItem
          icon={LogOut}
          label={canEarlyCheckout ? 'เช็คเอาท์ (ก่อนกำหนด)' : 'เช็คเอาท์'}
          onClick={() => {
            if (canEarlyCheckout && onEarlyCheckout) {
              onEarlyCheckout(booking)
            } else {
              onCheckOut(booking)
            }
            onClose()
          }}
        />
      )}

      {canTransfer && (
        <MenuItem
          icon={ArrowRightLeft}
          label="ย้ายห้อง"
          onClick={() => { onTransfer(booking, roomId); onClose() }}
        />
      )}

      {(canCheckIn || canCheckOut || canTransfer) && (
        <div className="h-px bg-border mx-1 my-0.5" />
      )}

      {/* Open detail */}
      <MenuItem
        icon={ExternalLink}
        label="เปิดรายละเอียด"
        onClick={() => { onOpenDetail(booking); onClose() }}
      />

      {!isTerminal && (
        <MenuItem
          icon={CalendarRange}
          label="แก้ไขการจอง"
          onClick={() => { onOpenDetail(booking); onClose() }}
        />
      )}

      {/* Destructive */}
      {canCancel && (
        <>
          <div className="h-px bg-border mx-1 my-0.5" />
          <MenuItem
            icon={XCircle}
            label="ยกเลิกการจอง"
            variant="destructive"
            onClick={() => { onCancel(booking); onClose() }}
          />
        </>
      )}
    </div>,
    document.body,
  )
})

export default BookingContextMenu
