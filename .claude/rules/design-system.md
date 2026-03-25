---
description: "Dark theme design system — CSS tokens, color system, component styling conventions"
paths:
  - "**/*.tsx"
  - "**/*.css"
  - "src/shared/ui/**"
---

# Design System Rules

## Theme Architecture

All colors flow through CSS custom properties in `index.css :root` → Tailwind config → components.
Designed for future light/brand theme support (swap `:root` values).

## Key Surface Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | #0F1115 | Page background |
| `--sidebar` | #151821 | Sidebar, table headers |
| `--card` | #1B1F2A | Card surfaces |
| `--timeline-bg` | #12141A | Timeline background |
| `--input` | #12141A | Input fields |
| `--border` | #2F3542 | Default borders |
| `--border-soft` | #242933 | Subtle dividers |
| `--primary` | #5B7CFA | Accent / interactive |

## Booking Block Colors (Status-Based)

- `--bk-reserved` (blue), `--bk-checked-in` (green), `--bk-checked-out` (gray, 0.45 opacity)
- `--bk-no-show` (amber), `--bk-cancelled` (dashed border, 0.5 opacity)
- Color map keyed by `room_stay_id` (NOT `booking_id`)

## Room Status Dots

- `--room-clean` (green), `--room-dirty` (orange), `--room-ooo` (red)

## Component Styling Rules

1. **Never hardcode colors** — always use CSS tokens via Tailwind classes (`bg-card`, `border-border`, `text-primary`)
2. **No `bg-black` or `bg-white`** — use `bg-background`, `bg-card`, `bg-sidebar`
3. **Overlays**: `bg-background/60` (not `bg-black/50`)
4. **Sidebar active**: `border-l-2 border-l-primary bg-primary/15`
5. **Table header**: `bg-sidebar`, row hover: `bg-accent/60`
6. **Input focus**: border changes from `--border` to `--primary`

## Token vs Utility Layer Pitfall

`space-card`, `radius-card` etc. are `@layer components` — they **LOSE specificity** to Tailwind utility classes (`@layer utilities`).

```tsx
// ❌ space-card won't override Card's p-6
<CardContent className="space-card">

// ✅ Explicit utilities win
<CardContent className="px-4 py-3">
```

`space-card` works on plain `<div>` elements but not on shadcn Card/CardContent/CardHeader.

## shadcn/ui Usage

- Always check `@/shared/ui/` for existing components before building custom
- Extend via `className` prop — don't wrap in unnecessary container divs
- Toast: `react-hot-toast` (NOT sonner, NOT shadcn toast)
