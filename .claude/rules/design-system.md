---
description: "Design system — blue-gray SaaS surfaces, solid-fill booking blocks, brand gold accent, timeline UI conventions"
paths:
  - "**/*.tsx"
  - "**/*.css"
  - "src/shared/ui/**"
---

# Design System Rules

## Design Philosophy

> **Professional SaaS + instant readability**
> Blue-gray surfaces, vivid blue primary, solid color booking blocks.
> Brand gold used sparingly (logo, sidebar, today column).
> Designed for 8–12 hour front-desk use.

## Theme Architecture

All colors flow through CSS custom properties in `index.css :root` → `@theme inline` → Tailwind classes.
Dark mode = default, light mode via `.light` class.

## Color System

### Surface Tokens (cool blue-gray)

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--background` | `224 16% 10%` | `40 20% 97%` | Page background |
| `--card` | `224 18% 14%` | `0 0% 100%` | Card surfaces |
| `--sidebar` | `224 22% 11%` | `40 20% 94%` | Sidebar (darker than bg) |
| `--border` | `224 12% 26%` | `220 20% 88%` | Default borders |

### Primary (vivid blue — CTA, interaction)

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--primary` | `222 85% 64%` | `224 76% 48%` | Buttons, links, focus rings |

### Brand Accent (gold — logo, sidebar, today column only)

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--brand` | `32 35% 60%` | `32 35% 52%` | Gold accent elements |
| `--brand-strong` | `32 42% 52%` | `32 40% 45%` | Logo bracket stroke |
| `--brand-soft` | `32 30% 14%` | `32 30% 90%` | Soft gold tint |

### Text Tokens

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--foreground` | `218 16% 92%` | `220 20% 15%` | Primary text |
| `--muted-foreground` | `218 10% 60%` | `220 10% 40%` | Secondary/meta text |

## Booking Block System (solid color fills)

> **CRITICAL**: Booking blocks use **solid color fills** for instant status recognition.
> Front desk staff must identify status at a glance — color is the primary differentiator.
> Do NOT use accent-bar or subtle-tint approaches (tested and rejected by real users).

### Status Color Map

| Status | Dark | Light | Color | Meaning |
|--------|------|-------|-------|---------|
| Reserved/Assigned | `222 60% 55%` | `224 76% 48%` | **Blue** | Not yet here |
| Checked-in | `150 45% 44%` | `152 70% 28%` | **Green** | Currently staying |
| Checked-out | `218 10% 55%` | `215 14% 55%` | **Gray** | Past |
| No-show | `38 60% 50%` | `32 85% 35%` | **Amber** | Needs attention |
| Cancelled | `218 10% 50%/30` | `215 14% 65%/30` | **Gray dashed** | Cancelled |

### statusColors.ts

```typescript
CONFIRMED:   'bg-bk-reserved text-bk-reserved-foreground'
CHECKED_IN:  'bg-bk-checked-in text-bk-checked-in-foreground'
CHECKED_OUT: 'bg-bk-checked-out text-bk-checked-out-foreground'
NO_SHOW:     'bg-bk-no-show text-bk-no-show-foreground'
CANCELLED:   'bg-bk-cancelled/30 text-bk-cancelled-foreground'
```

### Special States (BookingBlock.tsx)

- **Past checkout** (`checkout <= today`): `opacity-60` — shows overdue/late checkout
- **Upcoming** (future check-in): dashed border, `bg-bk-reserved/20`
- **Hover dimming**: non-highlighted blocks → `opacity-10!` (important to prevent override)
- **Text**: inherits from `text-bk-*-foreground` (white on colored fills), NOT `text-foreground`

## Typography Hierarchy (3 levels)

> **Rule**: Never use same weight + size for different information levels.

| Level | Font | Weight | Color | Usage |
|-------|------|--------|-------|-------|
| Primary | `13px` | `medium` | inherited (white on fills) | Guest name (scan target) |
| Secondary | `11px` | `regular` | `opacity-80` | Room count, metadata |
| Decorative | — | — | `opacity-50-60` | Icons, indicators |

## Timeline UI Rules

### Grid
- Use `1px` dividers only — no heavy borders
- `--timeline-grid: 224 10% 30%` — subtle but scannable

### Today Column
- Background: `bg-timeline-today/12` (brand gold tint)
- Border left + right: `foreground/8`
- Today indicator line: `bg-timeline-today/70`
- Header: `bg-timeline-today/12 border-b-2 border-b-timeline-today/60`

### Row Density
- `--timeline-row-height: 3rem` — compact, see more rooms per screen
- Booking card: `px-2.5 py-1.5 gap-1`
- Max 2 lines per card, always truncate

## Sidebar Rules

- Background: darker than content area (`224 22% 11%`)
- Active item: `bg-foreground/6 text-foreground border-l-2 border-l-brand`
- Inactive: `text-muted-foreground hover:bg-accent hover:text-foreground`

## Logo System (bracket + H)

- Gold bracket `[` frames neutral `H` monogram
- Bracket: `stroke-brand-strong` (theme-aware), 2.5px stroke, taller than H
- H: `fill-foreground/85` (theme-aware)
- ViewBox: `0 0 54 64`

## Component Styling Rules

1. **Never hardcode colors** — always use CSS tokens via Tailwind classes
2. **No `bg-black` or `bg-white`** — use `bg-background`, `bg-card`
3. **Overlays**: `bg-background/60` (not `bg-black/50`)
4. **Hover**: `hover:shadow-md hover:brightness-105`
5. **Transitions**: always `≤ 150ms`
6. **Booking text on colored fills**: use `text-bk-*-foreground`, not `text-foreground`

## Global UX Principles

1. **Color = status**: solid fills for instant recognition (front desk tested)
2. **Hierarchy**: 1 card = 1 focus point (guest name), everything else = secondary
3. **Density**: compact but breathable — `3rem` row height, `13px/11px` text
4. **Readability > Beauty**: if it looks good but reads slow, it's wrong
5. **Consistency**: same colors in dark and light mode (blue=reserved, green=checked-in)

## Token vs Utility Layer Pitfall

`space-card`, `radius-card` etc. are `@layer components` — they lose specificity to Tailwind utilities.

```tsx
// ❌ space-card won't override Card's p-6
<CardContent className="space-card">

// ✅ Explicit utilities win
<CardContent className="px-4 py-3">
```

## shadcn/ui Usage

- Always check `@/shared/ui/` for existing components before building custom
- Extend via `className` prop — don't wrap in unnecessary container divs
- Toast: `react-hot-toast` (NOT sonner, NOT shadcn toast)
