/**
 * AssignRoomModal
 *
 * Displays a selectable list of rooms for the given stay's room type, with
 * per-room availability badges.  The parent owns the mutation via onConfirm —
 * typically wired to useStayActions(bookingId, stayId).assignRoom.
 *
 * Layout:
 *   Mobile  — full-screen (DialogContent built-in max-sm:h-screen behaviour)
 *   Desktop — centred max-w-md dialog, max-h-[82vh]
 *
 * Structure:
 *   fixed header  → room type name + date range
 *   scrollable    → skeleton | empty | room radio cards
 *   sticky footer → confirm button (disabled until selection + not loading)
 */

import { useState, useEffect } from 'react'
import { Loader2, BedDouble } from 'lucide-react'
import { cn } from '@/shared/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../shared/ui/dialog'
import { Button } from '../../../shared/ui/button'
import { Badge } from '../../../shared/ui/badge'
import { formatThaiDate } from '../../../shared/utils'
import { useRoomsWithAvailability } from '../hooks'
import type { RoomStayResponse } from '../types'
import type { RoomWithAvailability } from '../hooks'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AssignRoomModalProps {
  open: boolean
  onClose: () => void
  stay: RoomStayResponse
  /** Called with the selected roomId when the user confirms.
   *  Parent is responsible for running the mutation (e.g. via useStayActions). */
  onConfirm: (roomId: string) => void
  /** Mirror the parent mutation's loading state — disables the confirm button. */
  confirmLoading?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AssignRoomModal({
  open,
  onClose,
  stay,
  onConfirm,
  confirmLoading = false,
}: AssignRoomModalProps) {
  const [selectedRoomId, setSelectedRoomId] = useState('')

  const { rooms, isLoading, isError } = useRoomsWithAvailability(
    stay.room_type_id,
    stay.check_in,
    stay.check_out,
    open,
  )

  // Clear selection when modal opens for a (potentially different) stay.
  useEffect(() => {
    if (open) setSelectedRoomId('')
  }, [open, stay.id])

  function handleConfirm() {
    if (!selectedRoomId || confirmLoading) return
    onConfirm(selectedRoomId)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      {/*
       * DialogContent built-in responsive behaviour:
       *   max-sm: h-screen w-screen top-0 left-0 translate-0  → full-screen
       *   sm+:    centred, inherits max-w-lg
       *
       * We override to flex-col + sm:max-w-md + sm:max-h-[82vh] for the
       * sticky-header / scrollable-body / sticky-footer layout.
       */}
      <DialogContent className="flex flex-col gap-0 p-0 sm:max-w-md sm:max-h-[82vh]">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <DialogHeader className="pb-4 border-b border-border shrink-0">
          {/* pr-10: clear the built-in absolute X close button */}
          <div className="pr-10">
            <DialogTitle>เลือกห้องสำหรับ {stay.room_type_name}</DialogTitle>
            <DialogDescription className="mt-1.5 flex items-center gap-1.5">
              <BedDouble className="w-3.5 h-3.5 shrink-0" />
              {formatThaiDate(stay.check_in)} → {formatThaiDate(stay.check_out)}
              <span className="text-foreground/40">·</span>
              {stay.nights} คืน
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* ── Room list (scrollable) ───────────────────────────────────────── */}
        <div
          role="radiogroup"
          aria-label="เลือกห้องพัก"
          className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 py-4 space-y-2"
        >
          {isLoading ? (
            <>
              <RoomSkeleton />
              <RoomSkeleton />
              <RoomSkeleton />
            </>
          ) : isError ? (
            <ErrorState />
          ) : rooms.length === 0 ? (
            <EmptyState />
          ) : (
            rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                selected={selectedRoomId === room.id}
                onSelect={() => setSelectedRoomId(room.id)}
              />
            ))
          )}
        </div>

        {/* ── Footer (sticky) ─────────────────────────────────────────────── */}
        <DialogFooter className="border-t border-border shrink-0 sm:justify-end">
          <Button
            className="w-full sm:w-auto"
            disabled={!selectedRoomId || confirmLoading}
            onClick={handleConfirm}
          >
            {confirmLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            ยืนยัน
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}

// ─── RoomCard ─────────────────────────────────────────────────────────────────

function RoomCard({
  room,
  selected,
  onSelect,
}: {
  room: RoomWithAvailability
  selected: boolean
  onSelect: () => void
}) {
  const isMaintenance = room.status !== 'ACTIVE'
  const isBooked      = room.available === false && !room.availabilityLoading
  const isDisabled    = isMaintenance || isBooked || room.availabilityLoading

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={isDisabled}
      onClick={() => !isDisabled && onSelect()}
      className={cn(
        'w-full text-left rounded-xl border-2 p-4 min-h-[68px]',
        'flex items-center gap-4 transition-colors',
        selected  && 'border-primary bg-primary/5',
        !selected && !isDisabled && 'border-border hover:border-primary/40 hover:bg-muted/30',
        isDisabled && 'border-border bg-muted/20 opacity-60 cursor-not-allowed',
      )}
    >
      {/* Radio indicator */}
      <div
        className={cn(
          'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center',
          selected ? 'border-primary' : 'border-muted-foreground/30',
        )}
      >
        {selected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
      </div>

      {/* Room number */}
      <span className="flex-1 font-semibold text-sm">ห้อง {room.number}</span>

      {/* Availability badge */}
      <div className="shrink-0">
        {room.availabilityLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : isMaintenance ? (
          <Badge variant="amber">ปิดปรับปรุง</Badge>
        ) : room.available ? (
          <Badge variant="green">ว่าง</Badge>
        ) : (
          <Badge variant="gray">ไม่ว่าง</Badge>
        )}
      </div>
    </button>
  )
}

// ─── Skeleton / states ────────────────────────────────────────────────────────

function RoomSkeleton() {
  return (
    <div className="rounded-xl border-2 border-border p-4 min-h-[68px] flex items-center gap-4 animate-pulse">
      <div className="w-5 h-5 rounded-full bg-muted shrink-0" />
      <div className="flex-1 h-4 rounded-md bg-muted" />
      <div className="w-10 h-5 rounded-full bg-muted shrink-0" />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      ไม่มีห้องในประเภทนี้
    </div>
  )
}

function ErrorState() {
  return (
    <div className="py-12 text-center text-sm text-destructive/70">
      โหลดข้อมูลห้องไม่สำเร็จ
    </div>
  )
}
