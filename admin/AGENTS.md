# Admin Dashboard Conventions

React 19 + Vite 7 + TypeScript 5 + Tailwind CSS 4 + shadcn/ui

## Directory Structure

```
src/
  components/
    common/       # Reusable UI: LoadingSpinner, ErrorState, EmptyState, ConfirmDialog, StatusBadge, CategoryBadge
    editor/       # TipTap rich text editor components
    forms/        # Form components: FormField, FormCheckbox, LoginForm
    layout/       # MainLayout, PageHeader, SectionHeader, FilterPanel, DataGrid, Sidebar
    pages/        # Entity-specific cards (ArticleCard, PageCard...) + barrel index.ts
    preview/      # Live site preview components
    ui/           # shadcn/ui primitives (button, card, dialog, select...)
  contexts/       # AuthContext, SiteContext, UserContext
  hooks/
    api/          # One file per entity: useArticles.ts, usePages.ts... + barrel index.ts
  lib/
    constants/    # Per-entity constants: article-types.ts, event-types.ts... + barrel index.ts
    toaster.ts    # Sonner toast wrapper
    utils.ts      # cn() utility (clsx + tailwind-merge)
    format.ts     # Date formatting utilities
  pages/          # Route-level components: Articles.tsx, ArticleDetail.tsx, ArticleForm.tsx...
  services/       # apiClient.ts (Axios singleton), authService.ts, deployment.ts
```

## Components

- Functional components, PascalCase filenames
- Named exports (no `export default` for components)
- Props interface: `interface {Name}Props` or inline
- Barrel exports in each subdirectory (`index.ts` re-exports)
- Exception: `App.tsx` uses `export default App` (Vite entry point)

## Imports

- Path alias: `@/*` maps to `src/*` (tsconfig paths)
- Prefer barrel imports: `from '../hooks/api'`, `from '../components/common'`
- No relative paths deeper than 2 levels — use `@/` alias instead
- Icons: `lucide-react`

## API Hooks (TanStack Query)

Each entity file (`hooks/api/use{Entities}.ts`) follows this pattern:

```typescript
// 1. Types (interface {Entity}, Create{Entity}Data, Update{Entity}Data, {Entities}Response)
// 2. Query keys factory
export const {ENTITIES}_QUERY_KEYS = {
  all: ['{entities}'] as const,
  lists: () => [...{ENTITIES}_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...{ENTITIES}_QUERY_KEYS.lists(), filters] as const,
  details: () => [...{ENTITIES}_QUERY_KEYS.all, 'detail'] as const,
  detail: (documentId: string) => [...{ENTITIES}_QUERY_KEYS.details(), documentId] as const,
}
// 3. Hooks: use{Entities}(params), use{Entity}(documentId), useCreate{Entity}(), useUpdate{Entity}(), useDelete{Entity}()
```

- `staleTime`: 5 minutes for lists, 10 minutes for featured/dashboard
- Mutations invalidate via `queryClient.invalidateQueries({ queryKey: KEYS.lists() })`
- Single item updates use `queryClient.setQueryData` for optimistic cache

## Forms (React Hook Form)

- Built-in validation (required, maxLength, pattern) — no Zod
- `Controller` for complex fields (select, rich text editor)
- Auto-slug generation from title field
- Submit wraps mutation in try/catch + toast notification

## API Client

Singleton `ApiClient` class (`services/apiClient.ts`):
- Axios instance with auth interceptor (Bearer token from localStorage)
- `X-Site-Document-Id` header for super admin impersonation (from sessionStorage)
- 401 response → clear token + redirect to `/login`
- Methods: `get<T>`, `post<T>`, `put<T>`, `patch<T>`, `delete<T>`, `postWithoutAuth<T>`

## Routing

CRUD pattern per entity:
- `/{entities}` — list page
- `/{entities}/new` — create form
- `/{entities}/:id` — detail view
- `/{entities}/:id/edit` — edit form

All protected routes wrap: `<ProtectedRoute><MainLayout>...</MainLayout></ProtectedRoute>`
Super admin routes use `<SuperAdminRoute>` instead.

Routes are defined flat in `App.tsx` (no nested routing).

## Notifications

```typescript
import { toaster } from '../lib/toaster'
toaster.create({ title: '...', description: '...', type: 'success' | 'error' | 'warning' | 'info', duration: 3000 })
```

Uses Sonner under the hood. French strings for user-facing messages.

## Error Handling

```typescript
try {
  await mutation.mutateAsync(data)
  toaster.create({ title: 'Succès', type: 'success' })
} catch (error) {
  toaster.create({ title: 'Erreur', description: '...', type: 'error' })
}
```

Loading/error/empty states: `<LoadingSpinner />`, `<ErrorState />`, `<EmptyState />`

## Styling

- Tailwind CSS v4 with `@theme inline` in app.css
- shadcn/ui components in `components/ui/`
- `cn()` from `lib/utils.ts` for conditional classes
- Brand tokens: `brand-primary`, `brand-secondary` (CSS custom properties)
- Dark mode via `class` strategy on `<html>`
- Glass card pattern: `glass-card` utility class

## State Management

| Scope | Tool |
|-------|------|
| Auth state | AuthContext (token, user, login/logout) |
| Current site | SiteContext (site config, impersonation) |
| Current user profile | UserContext |
| Server data | TanStack React Query 5 |
| UI-local state | useState |

## Constants Pattern

`lib/constants/{entity}-types.ts`:
```typescript
export const {ENTITY}_CATEGORY_LABELS: Record<string, string> = { key: 'French Label' }
export const {ENTITY}_CATEGORY_COLORS: Record<string, string> = { key: 'bg-... text-...' }
export const {ENTITY}_CATEGORY_OPTIONS = Object.entries(LABELS).map(([value, label]) => ({ value, label }))
```
