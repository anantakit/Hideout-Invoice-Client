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

## Known Issues (Refactoring Targets)

- `TimelinePage.tsx` is 916 lines — should extract:
  - Timeline state management → `useTimelineState` hook
  - Keyboard shortcuts → `useTimelineKeyboard` hook
  - Mobile date strip → separate component
  - Draw-to-create logic → `useTimelineDraw` hook
- 13+ props drilled through TimelinePage → RoomRow → BookingBlock — consider context
- Error message mapping (server → Thai) embedded in drag handler — extract to utility
