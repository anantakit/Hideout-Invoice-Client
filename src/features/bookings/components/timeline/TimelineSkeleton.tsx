import React from 'react'

// ─── Constants (must match useInfiniteTimeline) ─────────────────────────────────

/** Must match TOTAL_DAYS in useInfiniteTimeline so scroll width is identical. */
const TOTAL_DAYS = 42
/** Visible columns rendered in the header (full buffer). */
const HEADER_COLS = TOTAL_DAYS

// ─── Deterministic booking-block layout ─────────────────────────────────────────
// Pre-computed to mimic realistic booking density across the full 42-day buffer.
// Each block: { offset: days from buffer start, span: duration in days }

const ROOM_ROWS = [
  { w1: 'w-7', w2: 'w-10', blocks: [{ o: 1, s: 3 }, { o: 6, s: 5 }, { o: 16, s: 3 }, { o: 22, s: 4 }, { o: 32, s: 6 }] },
  { w1: 'w-6', w2: 'w-14', blocks: [{ o: 0, s: 4 }, { o: 9, s: 7 }, { o: 20, s: 5 }, { o: 30, s: 3 }, { o: 36, s: 4 }] },
  { w1: 'w-7', w2: 'w-10', blocks: [{ o: 3, s: 2 }, { o: 8, s: 4 }, { o: 15, s: 6 }, { o: 25, s: 3 }, { o: 34, s: 5 }] },
  { w1: 'w-6', w2: 'w-12', blocks: [{ o: 12, s: 5 }, { o: 28, s: 4 }] },
  { w1: 'w-7', w2: 'w-14', blocks: [{ o: 2, s: 6 }, { o: 11, s: 3 }, { o: 18, s: 4 }, { o: 26, s: 7 }, { o: 37, s: 4 }] },
  { w1: 'w-6', w2: 'w-10', blocks: [{ o: 0, s: 5 }, { o: 8, s: 2 }, { o: 14, s: 3 }, { o: 20, s: 5 }, { o: 30, s: 6 }] },
  { w1: 'w-7', w2: 'w-12', blocks: [{ o: 5, s: 4 }, { o: 13, s: 3 }, { o: 24, s: 5 }] },
  { w1: 'w-6', w2: 'w-14', blocks: [{ o: 1, s: 3 }, { o: 7, s: 6 }, { o: 17, s: 4 }, { o: 25, s: 3 }, { o: 33, s: 5 }] },
  { w1: 'w-7', w2: 'w-10', blocks: [{ o: 4, s: 5 }, { o: 12, s: 3 }, { o: 19, s: 6 }, { o: 29, s: 4 }, { o: 38, s: 3 }] },
  { w1: 'w-6', w2: 'w-12', blocks: [{ o: 0, s: 3 }, { o: 10, s: 4 }, { o: 21, s: 5 }, { o: 31, s: 3 }] },
]

// ─── Component ──────────────────────────────────────────────────────────────────

const TimelineSkeleton = React.memo(function TimelineSkeleton() {
  const gridWidth = `calc(var(--timeline-room-col-width) + ${TOTAL_DAYS} * var(--timeline-cell-width))`

  return (
    <div className="tl-skeleton" style={{ minWidth: gridWidth }}>
      {/* ── Month row (sticky room col + day placeholder) ────── */}
      <div className="flex border-b border-white/[0.04] bg-[hsl(224,20%,12%)] sticky top-0 z-10">
        <div
          className="shrink-0 border-r border-white/[0.04] sticky left-0 z-10 bg-[hsl(224,20%,12%)]"
          style={{ width: 'var(--timeline-room-col-width)' }}
        />
        <div className="flex items-center h-5 px-3">
          <div className="h-2.5 w-24 rounded tl-shimmer" />
        </div>
      </div>

      {/* ── Day header row ─────────────────────────────────── */}
      <div className="flex border-b border-white/[0.04] bg-[hsl(224,20%,12%)] sticky top-5 z-10">
        <div
          className="shrink-0 border-r border-white/[0.04] flex items-center px-3 sticky left-0 z-10 bg-[hsl(224,20%,12%)]"
          style={{ width: 'var(--timeline-room-col-width)' }}
        >
          <div className="h-3 w-12 rounded tl-shimmer" />
        </div>
        {Array.from({ length: HEADER_COLS }).map((_, i) => (
          <div
            key={i}
            className="shrink-0 flex flex-col items-center justify-center gap-1 border-r border-white/[0.04] py-2"
            style={{ width: 'var(--timeline-cell-width)' }}
          >
            <div className="h-2.5 w-5 rounded tl-shimmer" />
            <div className="h-3.5 w-4 rounded tl-shimmer" />
          </div>
        ))}
      </div>

      {/* ── Room rows ──────────────────────────────────────── */}
      {ROOM_ROWS.map((room, rowIdx) => (
        <div
          key={rowIdx}
          className="flex border-b border-white/[0.04]"
          style={{
            height: 'var(--timeline-row-height)',
            '--row-idx': rowIdx,
          } as React.CSSProperties}
        >
          {/* Room label — sticky left */}
          <div
            className="shrink-0 border-r border-white/[0.04] flex items-center gap-2.5 px-3 sticky left-0 z-[1] bg-[hsl(224,16%,10%)]"
            style={{ width: 'var(--timeline-room-col-width)' }}
          >
            <div className="h-2 w-2 rounded-full tl-shimmer shrink-0" />
            <div className="flex flex-col gap-1.5">
              <div className={`h-3 ${room.w1} rounded tl-shimmer`} />
              <div className={`h-2 ${room.w2} rounded tl-shimmer opacity-60`} />
            </div>
          </div>

          {/* Grid area */}
          <div className="relative" style={{ width: `calc(${TOTAL_DAYS} * var(--timeline-cell-width))` }}>
            {/* Vertical day separators */}
            {Array.from({ length: TOTAL_DAYS }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-r border-white/[0.03]"
                style={{ left: `calc(${i + 1} * var(--timeline-cell-width))` }}
              />
            ))}

            {/* Booking block skeletons */}
            {room.blocks.map((b, bIdx) => (
              <div
                key={bIdx}
                className="absolute top-1/2 -translate-y-1/2 tl-shimmer-block rounded-lg"
                style={{
                  left: `calc(${b.o} * var(--timeline-cell-width) + 3px)`,
                  width: `calc(${b.s} * var(--timeline-cell-width) - 6px)`,
                  height: 'calc(var(--timeline-row-height) * 0.64)',
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
})

export default TimelineSkeleton
