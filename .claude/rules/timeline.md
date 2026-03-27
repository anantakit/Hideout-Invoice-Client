---
description: "Timeline drag, resize, virtualization, and rendering patterns"
paths:
  - "src/features/bookings/pages/TimelinePage.tsx"
  - "src/features/bookings/timeline/**"
  - "src/shared/components/timeline/**"
---

# Timeline Rules

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

## Current Architecture (Post Phase 3 Split)

`TimelinePage.tsx` was split into custom hooks:
- `useTimelineState.ts` — centralized state (zoom, dates, selection, drag/draw modes, dialogs)
- `useTimelineDrag.ts` — drag/resize logic
- `useTimelineKeyboard.ts` — keyboard shortcuts
- `useTimelineActions.ts` — booking mutations
- `useTimelineDrawCreate.ts` — draw-to-create booking
- `useInfiniteTimeline.ts` — buffer management

Hover state uses `useSyncExternalStore` in `HoverContext.tsx` — avoids parent re-renders on hover.

## Remaining Issues

### Prop Drilling (Critical)

`useTimelineState` returns all state to `TimelinePage`, which passes **~35 props** to `TimelineContent`, which distributes to children:

- `TimelineContent → RoomRow → BookingBlock`: drag/keyboard/context-menu callbacks through 3 levels
- `TimelineContent → MobileSection → MobileTimelineList`: MobileSection is pure pass-through (zero logic)
- `RoomRow` receives 18 props, most passed to BookingBlock untouched

**Fix**: Introduce `TimelineContext` (data) + `TimelineCallbackContext` (callbacks) as providers at `TimelinePage` level. Children consume via `useTimelineContext()` / `useTimelineCallbacks()` hooks.

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
