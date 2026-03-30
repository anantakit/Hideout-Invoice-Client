---
description: "Design system — neutral-first with brand gold accent, dark/light theme tokens, timeline UI conventions"
paths:
  - "**/*.tsx"
  - "**/*.css"
  - "src/shared/ui/**"
---

# Design System Rules

## Design Philosophy

> **"Neutral-first, Brand-accent only"**
> 90% neutral gray + 10% gold accent. Calm, readable, pro SaaS.
> Designed for 8–12 hour front-desk readability.

## Theme Architecture

All colors flow through CSS custom properties in `index.css :root` → `@theme inline` → Tailwind classes.
Dark mode = default, light mode via `.light` class.

## Color System

### Surface Tokens (cool blue-gray — professional SaaS)

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--background` | `224 16% 10%` | `40 20% 97%` | Page background |
| `--card` | `224 18% 14%` | `0 0% 100%` | Card surfaces |
| `--sidebar` | `224 22% 11%` | `40 20% 94%` | Sidebar (darker than bg) |
| `--border` | `224 12% 26%` | `220 20% 88%` | Default borders |

### Brand Accent (gold — accent only, never fills)

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--brand` | `32 35% 60%` | `32 35% 52%` | Gold accent elements |
| `--brand-soft` | `32 30% 14%` | `32 30% 90%` | Soft gold tint |

### Text Tokens

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--foreground` | `218 16% 92%` | `220 20% 15%` | Primary text |
| `--muted-foreground` | `218 10% 60%` | `220 10% 40%` | Secondary/meta text |

### Primary (interaction only — blue, reduced role)

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--primary` | `222 60% 55%` | `222 60% 45%` | Buttons, links, focus rings |

## Booking Block System (accent-bar approach)

> **CRITICAL**: Booking blocks use neutral background + left accent bar.
> Never use solid color fills for booking blocks.

### How It Works

```
┌─────────────────────┐
│▌ Guest Name          │  ← 3px inset accent bar (left)
│  2 ห้อง              │  ← neutral bg (white/7%)
└─────────────────────┘
```

### CSS Classes

| Class | Effect |
|-------|--------|
| `bk-block` | Neutral bg (`white/7%`) + border (`white/10%`) + elevation shadow |
| `bk-accent-reserved` | Gold left accent bar (`--bk-reserved`) |
| `bk-accent-checked-in` | Green left accent bar (`--bk-checked-in`) |
| `bk-accent-checked-out` | Gray left accent bar |
| `bk-accent-no-show` | Amber left accent bar |

### Status Color Map (statusColors.ts)

```typescript
CONFIRMED:   'bk-block bk-accent-reserved text-foreground'
CHECKED_IN:  'bk-block bk-accent-checked-in text-foreground'
CHECKED_OUT: 'bk-block bk-accent-checked-out text-foreground'
NO_SHOW:     'bk-block bk-accent-no-show text-foreground'
CANCELLED:   'bk-block text-muted-foreground'
```

## Typography Hierarchy (3 levels)

> **Rule**: Never use same weight + size for different information levels.

| Level | Font | Weight | Color | Usage |
|-------|------|--------|-------|-------|
| Primary | `13px` | `medium` | `foreground/92` | Guest name (scan target) |
| Secondary | `11px` | `regular` | `foreground/55` | Room count, metadata |
| Decorative | — | — | `opacity-50-60` | Icons, indicators |

## Timeline UI Rules

### Grid
- Use `1px` dividers only — no heavy borders
- `--timeline-grid`: subtle, visible enough to scan columns

### Today Column
- Background: `bg-timeline-today/12` (brand gold tint)
- Subtle border left + right (`foreground/8`)
- Today indicator line: `bg-timeline-today/70`
- Bookings inside today = full opacity

### Row Density
- `--timeline-row-height: 3rem` — compact, see more rooms per screen
- Booking card: `px-2.5 py-1.5 gap-1`
- Max 2 lines per card, always truncate

## Sidebar Rules

- Background: darker than content area for contrast
- Active item: `bg-foreground/6 text-foreground border-l-2 border-l-brand`
- Inactive: `text-muted-foreground hover:bg-accent hover:text-foreground`

## Component Styling Rules

1. **Never hardcode colors** — always use CSS tokens via Tailwind classes
2. **No `bg-black` or `bg-white`** — use `bg-background`, `bg-card`
3. **Overlays**: `bg-background/60` (not `bg-black/50`)
4. **Card must float** from background — use border + subtle elevation shadow
5. **Hover**: lift + brighten (`bg increase ~2-3%`, border increase ~4%`)
6. **Transitions**: always `≤ 150ms`, use `transition-all duration-150`

## Logo System (bracket + H)

- Gold bracket `[` frames neutral `H` monogram
- Bracket: thin stroke (2.5px), taller than H = clear hierarchy
- H: neutral fill (`#E6E6E6`), inside bracket space
- ViewBox: `0 0 54 64`

## Global UX Principles

1. **Contrast**: card must always "float" above background
2. **Hierarchy**: 1 card = 1 focus point (guest name). Everything else = secondary
3. **Density**: "แน่นแต่ไม่อึดอัด" — tight vertical rhythm, consistent spacing
4. **Motion**: hover ≤ 150ms, no flashy animations
5. **Readability > Beauty**: UI that reads fast is better than UI that looks fancy

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

## AI / Team Prompt

When generating UI for this project:

```
Design a hotel timeline (calendar-style) UI using a dark SaaS style.

STRICT RULES:
- Cool blue-gray background (224 16% 10%)
- Cards: subtle elevation via border + soft background (rgba white 4-7%)
- 1px dividers only, no heavy borders
- Typography hierarchy: Primary (medium) > Secondary (muted) > Icons (dimmed)
- Max 2 lines per booking card, always truncate
- "Today" column: soft gold tint, subtly brighter
- Sidebar: dark, active = left gold accent border
- Style: calm, minimal, professional (Linear / Stripe)
- No gradients, no loud colors, no visual noise
- Brand gold (#C8A97E) as accent ONLY — never as fills

DO NOT:
- Use bright/solid color backgrounds for booking blocks
- Use thick borders
- Mix too many font weights
- Break visual hierarchy
```
