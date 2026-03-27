---
description: "Timeline drag, resize, virtualization, and rendering patterns"
paths:
  - "src/features/timeline/**"
  - "src/shared/components/timeline/**"
---

# Timeline Rules

> **Note:** Timeline is a top-level feature at `features/timeline/`. It imports booking types, hooks, and shared components from `@/features/bookings/` (see `feature-structure.md` for boundary rules).

## Drag & Resize System

- `useTimelineDrag` hook: 3 modes — `move`, `resize-left`, `resize-right`
- Pointer-based drag with grid snapping (`TIMELINE_CELL_WIDTH_PX` per day, room rows vertically)
- Client-side conflict detection before API call (checks room booking overlap + maintenance status)
- Keyboard: arrow keys (left/right = ±1 day, up/down = change room)
- Backend: `PATCH /bookings/:id/stays/:stayID/move` — `MoveStayRequest{room_id, check_in, check_out}`

## Rendering

- `DragPreview` component: dashed border preview at drop target
- `BookingBlock`: resize handles on hover (left/right edges), `cursor-grab`/`cursor-col-resize`
- `HoverContext.tsx`: external store via `useSyncExternalStore` — avoids RoomRow re-renders
- Timeline entry includes `room_stay_id` (color map keyed by stay ID, not booking ID)
- Today indicator: `--timeline-today` (cyan #22D3EE) vertical line

## Performance

- Virtualized rows (only visible rooms rendered)
- Cumulative height precomputation for binary search room lookup (`getRoomAtY`)
- `useMemo` for booking color map and room count map
- `useCallback` for all drag/keyboard handlers to prevent RoomRow re-renders

## Architecture

`TimelinePage.tsx` orchestrates 4 context providers:

- `TimelineContext` — data: bookingColorMap, roomTypeNameMap, days, rooms, unassigned stays, zoom
- `TimelineCallbackContext` — callbacks: onSelectBooking, onDragStart, onDrawStart, onContextMenu, onKeyboardMove/Resize
- `DrawerContext` — drawer state: mode (ops/booking-detail/create-booking), selectedBooking, prefill
- `DragStateContext` — drag state: dragState, previewPos, isDragging, drawPreview

Core hooks:
- `useTimelineState.ts` — centralized state (zoom, dates, selection, drag/draw modes, dialogs)
- `useTimelineDrag.ts` — drag/resize logic
- `useTimelineKeyboard.ts` — keyboard shortcuts
- `useTimelineActions.ts` — booking mutations
- `useTimelineDrawCreate.ts` — draw-to-create booking
- `useInfiniteTimeline.ts` — buffer management

Hover state uses `useSyncExternalStore` in `HoverContext.tsx` — avoids parent re-renders on hover.

## Remaining Issues

### Oversized Components

| File | Lines | Fix |
|------|-------|-----|
| `AssignRoomBottomSheet.tsx` | 607 | Extract RoomPickerGrid + AssignConfirmDialog |
| `MobileTimelineList.tsx` | 587 | Extract filter state to useReducer + sub-components |
| `InlineCreateBookingForm.tsx` | 509 | Extract form state to useReducer or react-hook-form |
| `BookingBlock.tsx` | 493 | Extract content + tooltip + drag handles |
| `TimelineToolbar.tsx` | 479 | Extract ZoomControl + DateNavigation + KPIStrip + RoomTypeFilter |
| `DesktopOperationsPanel.tsx` | 432 | Extract section components |
| `PendingAssignmentsSection.tsx` | 431 | Extract list + card components |
