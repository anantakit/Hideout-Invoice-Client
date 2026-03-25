# Frontend — React / TypeScript / Vite / Tailwind / shadcn/ui

## Quick Reference

```bash
npm run dev              # dev server (port 3000, proxies /api → :8080)
npm run build            # production build
npm run lint             # eslint
npx tsc --noEmit         # type check
```

## Project Structure

```
src/
  app/                   → routes, providers (AuthProvider, QueryClient)
  features/              → feature modules (bookings, receipts, customers)
    bookings/
      api.ts             → API functions (single const object with async methods)
      types.ts           → interfaces + type unions
      hooks.ts           → TanStack Query hooks wrapping api functions
      pages/             → page components
      components/        → feature-specific components
  shared/
    api/client.ts        → axios instance, token management, 401 interceptor
    ui/                  → shadcn/ui primitives (button, card, dialog, etc.)
    components/          → shared app components (Sidebar, Layout, Pagination, etc.)
    hooks/               → shared hooks (useIsMobile, usePaginatedQuery)
    utils.ts             → formatTHB, formatThaiDate, cn()
    types/               → shared types (pagination, etc.)
```

## Code Conventions

- **Components**: named `function` declarations (not arrow functions)
- **Hooks**: named `function` declarations, wrap TanStack Query directly
- **API layer**: `export const xxxApi = { list: async (...) => { ... } }` — single object per feature
- **Query keys**: centralized `XXX_KEYS` object with factory functions using `as const`
- **Types**: `interface` for data shapes, `type` for unions only
- **Type suffixes**: `*Response` (API response), `*Payload` (request body), `*Params` (query params)
- **Field names**: `snake_case` in interfaces (matching backend JSON)
- **File names**: lowercase with hyphens (`alert-dialog.tsx`, `card-button.tsx`)
- **Path alias**: `@/` maps to `src/` — prefer `@/shared/...` over relative `../../../shared/...`
- **Section dividers**: `// ── Section Name ──────────────────`

## Component Library

- Always use **shadcn/ui** components from `@/shared/ui/` before building custom
- Available: alert-dialog, badge, button, calendar, card, command, dialog, form, input, label, popover, select, separator, sheet, skeleton, table, textarea, tooltip
- Custom shared: BottomBar, DatePicker, Fab, FilterChipBar, Pagination, SearchableComboBox, ThaiAddressPicker, ToggleGroup

## Rules

See `.claude/rules/` for detailed guidance on:
- `react-style.md` — React/TypeScript conventions
- `anti-patterns.md` — known anti-patterns to avoid and refactor
- `design-system.md` — dark theme tokens, color system
- `timeline.md` — timeline drag/resize/virtualization
