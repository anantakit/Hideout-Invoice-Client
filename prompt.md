# Frontend Design System — Code Generation Guide

This document describes the exact design system used in this project.
All AI-generated code **must** follow these conventions. No hardcoded colors, radii, or spacing values.

---

## Tech Stack

| Layer | Library |
|---|---|
| UI Framework | React 18 + TypeScript (strict) |
| Styling | Tailwind CSS v3 + `tailwindcss-animate` |
| Components | shadcn/ui (manual, lives in `src/shared/ui/`) |
| Primitives | Radix UI |
| Icons | `lucide-react` |
| State / Server | TanStack Query v5 |
| Forms | React Hook Form v7 + Zod |
| Routing | React Router v6 |
| Class utilities | `cn()` from `@/shared/utils` — `clsx` + `tailwind-merge` |
| Toasts | `react-hot-toast` |
| Animation | `tailwindcss-animate` |
| Dates | `date-fns` v3 |

---

## Path Alias

```ts
// All imports from src/ must use the @ alias
import { cn } from '@/shared/utils'
import { Button } from '@/shared/ui/button'
```

---

## Design Tokens (CSS Custom Properties)

All colors, radii, and semantic values live in CSS custom properties.
**Never use raw hex or hsl values in component code.**

### Surface Colors

| Token | Tailwind Class | Usage |
|---|---|---|
| `--background` | `bg-background` / `text-background` | App background |
| `--foreground` | `text-foreground` | Primary text |
| `--card` | `bg-card` / `text-card-foreground` | Card/panel backgrounds |
| `--muted` | `bg-muted` | Subtle backgrounds, inputs |
| `--muted-foreground` | `text-muted-foreground` | Secondary/hint text |
| `--accent` | `bg-accent` | Hover states, subtle tints |
| `--accent-foreground` | `text-accent-foreground` | Text on accent bg |

### Interactive Colors

| Token | Tailwind Class | Usage |
|---|---|---|
| `--primary` | `bg-primary` / `text-primary` | Primary actions, links |
| `--primary-foreground` | `text-primary-foreground` | Text on primary bg |
| `--secondary` | `bg-secondary` | Secondary buttons, badges |
| `--secondary-foreground` | `text-secondary-foreground` | Text on secondary bg |

### Border, Input, Ring

| Token | Tailwind Class | Usage |
|---|---|---|
| `--border` | `border-border` | All borders |
| `--input` | `border-input` | Input field borders |
| `--ring` | `ring-ring` | Focus rings |

### Status Colors

| Semantic | Tailwind Classes | Usage |
|---|---|---|
| Success | `bg-success` / `text-success` / `bg-success-muted` / `text-success-muted-foreground` | Positive states |
| Warning | `bg-warning` / `text-warning` / `bg-warning-muted` / `text-warning-muted-foreground` | Caution states |
| Info | `bg-info` / `text-info` / `bg-info-muted` / `text-info-muted-foreground` | Informational |
| Destructive | `bg-destructive` / `text-destructive` | Errors, delete actions |

### Border Radius

| Token | Tailwind Class | Notes |
|---|---|---|
| `--radius` (0.85rem) | `rounded-lg` | Default for cards, inputs, buttons |
| `--radius - 2px` | `rounded-md` | Slightly smaller |
| `--radius - 4px` | `rounded-sm` | Small elements |
| Fixed 2xl | `rounded-2xl` | Cards use this |
| Fixed full | `rounded-full` | Badges, pills, avatars |

---

## Typography

All text uses the **Inter** font (set on `body` via Tailwind `font-sans`).

| Usage | Classes |
|---|---|
| Page title | `text-2xl font-semibold tracking-tight text-foreground` |
| Section title | `text-lg font-semibold leading-none tracking-tight` |
| Card title | `text-base font-semibold` or `text-sm font-semibold` |
| Body | `text-sm text-foreground` |
| Secondary / hint | `text-sm text-muted-foreground` |
| Form label | `text-sm font-medium leading-none text-foreground` |
| Form error | `text-xs font-medium text-destructive` |
| Caption / badge text | `text-xs` |
| Table header | `text-xs font-semibold uppercase tracking-wide` |
| Monetary values | `tabular-nums` (always, to prevent layout shift) |

---

## Available Components (`src/shared/ui/`)

Import from the path shown. Do NOT import from `radix-ui` directly in feature code.

### Layout & Structure

```ts
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/shared/ui/card'
import { Separator } from '@/shared/ui/separator'
import { BottomBar } from '@/shared/ui/BottomBar'
```

**Card defaults:** `rounded-2xl border border-border bg-card shadow-sm`
**CardHeader default padding:** `p-6`
**CardContent default padding:** `p-6 pt-0` — pass `className="pt-4"` to override

### Actions

```ts
import { Button } from '@/shared/ui/button'
```

**Variants:** `default` | `destructive` | `outline` | `secondary` | `ghost` | `link`
**Sizes:** `default` (h-10 px-4) | `sm` (h-8 px-3 text-xs) | `lg` (h-11 px-8) | `icon` (h-9 w-9)

### Forms

```ts
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/shared/ui/form'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/ui/select'
```

**Input defaults:** `h-10 rounded-lg border border-input bg-card text-sm shadow-sm`

**Always use the Form wrapper pattern:**
```tsx
<FormField
  control={form.control}
  name="field_name"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Label</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage className="text-xs" />
    </FormItem>
  )}
/>
```

### Feedback

```ts
import { Badge } from '@/shared/ui/badge'
```

**Badge variants:** `default` | `secondary` | `destructive` | `outline` | `blue` | `green` | `red` | `gray` | `amber`

**Toasts:** Use `react-hot-toast` directly
```ts
import toast from 'react-hot-toast'
toast.success('สำเร็จ')
toast.error('เกิดข้อผิดพลาด')
```

### Overlays

```ts
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/shared/ui/dialog'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '@/shared/ui/alert-dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/ui/sheet'
```

**Sheet sides:** `top` | `bottom` | `left` | `right`

### Data Display

```ts
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from '@/shared/ui/table'
import { Pagination } from '@/shared/ui/Pagination'
import { SearchableComboBox } from '@/shared/ui/SearchableComboBox'
import { DatePicker } from '@/shared/ui/DatePicker'
```

---

## Icons

Use **`lucide-react`** only. No inline SVGs.

```ts
import { Plus, Trash2, Loader2, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
```

**Size conventions:**
- Default inline icon: `w-4 h-4`
- Navigation icons: `w-5 h-5`
- Large/hero icons: `w-6 h-6`
- Loading spinner: `<Loader2 className="w-4 h-4 animate-spin" />`

---

## Layout Patterns

### App Shell

The app shell is managed by `Layout.tsx`. Pages receive the full viewport minus the sidebar.

```
Desktop: md:ml-16 lg:ml-64  (sidebar is fixed, 16/64 wide)
Mobile:  no margin offset, sidebar is a Sheet overlay
```

### Standard Page Container

```tsx
<div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-28 md:pb-6">
  {/* page content */}
</div>
```

- `max-w-7xl` — standard page max-width
- `pb-28 md:pb-6` — bottom padding: space for mobile BottomBar (hidden on md+)
- For narrow/form pages use `max-w-2xl mx-auto` instead

### Page Header

```tsx
<div className="flex items-center justify-between mb-6">
  <h1 className="text-2xl font-semibold tracking-tight text-foreground">Page Title</h1>
  <Button>
    <Plus className="w-4 h-4" />
    Action
  </Button>
</div>
```

### Sections within a Page

Separate sections with `space-y-5` or `space-y-6`.

### Full-Screen Page (Timeline, Calendar)

Some pages occupy the full viewport:
```tsx
<div className="flex flex-col h-full overflow-hidden bg-background">
```

---

## Mobile Patterns

### BottomBar — Mobile-Only Sticky Actions

```tsx
import { BottomBar } from '@/shared/ui/BottomBar'

<BottomBar>
  <Button className="w-full">Primary Action</Button>
</BottomBar>
```

- Only visible on mobile (`md:hidden`)
- Handles `safe-area-inset-bottom` automatically
- Has blur + border-top backdrop

### Mobile-First Grid

```tsx
{/* Single column mobile, 2 cols sm, 3 cols lg */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```

### Horizontal Scroll on Mobile

```tsx
<div className="overflow-x-auto">
  <div className="min-w-[640px]"> {/* or a custom min-w */}
    {/* wide content */}
  </div>
</div>
```

---

## Form Patterns

### React Hook Form + Zod (standard)

```tsx
const schema = z.object({ name: z.string().min(1) })
type FormValues = z.infer<typeof schema>

const form = useForm<FormValues>({
  resolver: zodResolver(schema),
  mode: 'onBlur',
  defaultValues: { name: '' },
})
```

### Form Submit Button States

```tsx
<Button type="submit" disabled={form.formState.isSubmitting}>
  {form.formState.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
  Submit
</Button>
```

---

## Utility Functions (`@/shared/utils`)

```ts
import { cn, formatTHB, formatThaiDate, formatDateInput, todayISO, addDaysISO } from '@/shared/utils'
```

| Function | Purpose |
|---|---|
| `cn(...classes)` | Merges Tailwind classes safely (clsx + tailwind-merge) |
| `formatTHB(amount)` | Format number as Thai Baht: `1,500.00 บาท` |
| `formatThaiDate(isoStr)` | Format as Thai date: `23 กุมภาพันธ์ 2569` (Buddhist Era) |
| `formatDateInput(isoStr)` | Format as `YYYY-MM-DD` for `<input type="date">` |
| `todayISO()` | Returns today as `YYYY-MM-DD` |
| `addDaysISO(n)` | Returns today + n days as `YYYY-MM-DD` |

**Always use `formatTHB` for monetary values. Never format manually.**
**Always use `formatThaiDate` for display dates.**

---

## Data Fetching Pattern (TanStack Query)

```tsx
// Hook definition
export function useMyData(params: Params) {
  return useQuery({
    queryKey: ['my-data', params],
    queryFn: () => api.getData(params),
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev, // keeps old data while refetching
  })
}

// Usage in component
const { data, isLoading, isError } = useMyData(params)
```

**Loading state:** show `<Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />`
**Error state:** show `<p className="text-sm text-destructive">Failed to load. Please try again.</p>`
**Empty state:** show `<p className="text-sm text-muted-foreground">No data found.</p>`

---

## Status / Booking Color Conventions

Map domain statuses to these Tailwind color tokens consistently:

| Status | Background | Text | Badge variant |
|---|---|---|---|
| RESERVED | `bg-info-muted` | `text-info-muted-foreground` | `blue` |
| ASSIGNED | `bg-accent` | `text-accent-foreground` | `secondary` |
| CHECKED_IN | `bg-success-muted` | `text-success-muted-foreground` | `green` |
| CHECKED_OUT | `bg-muted` | `text-muted-foreground` | `gray` |
| CANCELLED | `bg-destructive/10` | `text-destructive` | `red` |
| CONFIRMED | `bg-info-muted` | `text-info-muted-foreground` | `blue` |
| PARTIALLY_CHECKED_IN | `bg-warning-muted` | `text-warning-muted-foreground` | `amber` |

---

## Timeline-Specific CSS Tokens

Available as Tailwind utility classes (defined in `tailwind.config.js`):

```tsx
// Width / height helpers
className="w-timeline-cell"          // var(--timeline-cell-width) = 6rem
className="h-timeline-row"           // var(--timeline-row-height) = 3.5rem
className="w-timeline-room-col"      // var(--timeline-room-col-width) = 3rem
className="min-w-timeline-room-col"
className="min-w-timeline-7"         // 7 × cell width (full 7-day grid)

// Booking block positioning (via CSS custom properties set inline)
className="tl-booking-block"         // absolute, left/width derived from --tl-offset and --tl-span
```

---

## Interactive Element Conventions

### Toggle Buttons (not form inputs)

```tsx
<button
  type="button"
  onClick={() => setValue(opt.value)}
  className={cn(
    'rounded-xl border px-3 py-3 text-center transition-colors',
    value === opt.value
      ? 'border-primary bg-primary/5 text-primary'
      : 'border-border text-muted-foreground hover:border-muted-foreground/50',
  )}
>
```

### Confirm / Destructive Actions

Always use `AlertDialog`, never `window.confirm()`.

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive" size="sm">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Animation

Use `tailwindcss-animate` classes:

```tsx
'animate-in fade-in slide-in-from-bottom-2 duration-150'
'animate-in fade-in zoom-in-95 duration-200'
'animate-out fade-out zoom-out-95 duration-150'
```

Loading spinner: `animate-spin`

---

## Language

This is a **Thai-language UI**.

- All labels, placeholders, error messages, and button text must be in **Thai**.
- Exception: technical status codes (`CHECKED_IN`, `RESERVED`) may appear as-is in badge labels or developer-facing UI.
- Use `formatThaiDate()` for all displayed dates.
- Use `formatTHB()` for all displayed monetary values.

---

## What NOT to Do

- ❌ Do not use raw hex or hsl values in `className` — use semantic Tailwind tokens
- ❌ Do not import directly from `@radix-ui/*` in feature code — use `@/shared/ui/*` wrappers
- ❌ Do not use `window.confirm()` — use `AlertDialog`
- ❌ Do not use inline SVGs — use `lucide-react` icons
- ❌ Do not format currencies or dates manually — use `formatTHB` / `formatThaiDate`
- ❌ Do not use hardcoded pixel sizes for spacing — use Tailwind spacing scale
- ❌ Do not skip `FormMessage` in forms — always show validation errors
- ❌ Do not use English text in UI labels visible to users
