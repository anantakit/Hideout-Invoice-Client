import React from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import { cn } from '@/shared/utils'
import type { DragState, DragPreviewPosition } from './useTimelineDrag'

interface DragPreviewProps {
  dragState: DragState
  position: DragPreviewPosition
}

const DragPreview = React.memo(function DragPreview({
  dragState,
  position,
}: DragPreviewProps) {
  const spanDays = differenceInDays(
    parseISO(dragState.newCheckOut),
    parseISO(dragState.newCheckIn),
  )
  const isInvalid = dragState.hasConflict || dragState.isMaintenanceRoom

  return (
    <div
      className={cn(
        'absolute pointer-events-none z-30',
        'rounded-[10px] border-2 border-dashed',
        'flex items-center justify-center',
        'transition-[left,top,width] duration-75 ease-out',
        isInvalid
          ? 'border-destructive/60 bg-destructive/10 opacity-70'
          : 'border-primary/50 bg-primary/8 opacity-50',
      )}
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
        width: `${position.width}px`,
        height: `${position.height}px`,
      }}
    >
      <div
        className={cn(
          'text-[10px] font-medium px-2 py-0.5 rounded',
          isInvalid
            ? 'text-destructive'
            : 'text-foreground/80',
        )}
      >
        {isInvalid ? (
          dragState.isMaintenanceRoom ? 'ห้องปิดซ่อม' : 'ห้องไม่ว่าง'
        ) : (
          <>
            {dragState.newCheckIn} → {dragState.newCheckOut}
            {' · '}
            {spanDays} คืน
          </>
        )}
      </div>
    </div>
  )
})

export default DragPreview
