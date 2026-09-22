# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-tenant municipal website CMS (CMS pour mairies). Municipalities each get their own website managed through a shared admin dashboard, with content stored in a central Strapi backend and public sites generated as static HTML via Astro.

## Architecture

pnpm workspaces + Turborepo monorepo (V2 refactor in progress, see board #6):

- **apps/backend/** — Strapi v5 headless CMS (TypeScript). REST API, SQLite (dev) or PostgreSQL (prod). The `site-isolation` middleware enforces multi-tenant isolation (fail-closed) based on the authenticated user's site.
- **apps/admin/** — V2 admin (React 19 + Vite + TanStack Router/Query + shadcn/ui), built in phase 3. Mockups: `v2/Design Admin Handoff/`.
- **apps/renderer/** — V2 Astro 5 renderer (static for prod, SSR for preview), built in phase 1.
- **packages/core** — generated Strapi types, API client, view-models, block schemas (zod).
- **packages/theme-contract** — interface a theme must implement.
- **packages/ui-a11y** — shared accessible components for themes.
- **themes/** — one package per public-site theme (Institutionnel, Moderne, Journal, Bourg; mockups in `v2/`).
- **fixtures/** — demo commune data for theme development.

Frozen V1 apps (outside the workspace, no compatibility work, deleted at V2 launch): **admin/** (React admin V1) and **sites/** (Astro site V1). **docs/** (Starlight) stays at the root while the Netlify docs site points to it.

### Data Flow

```
Admin UI → Strapi API (filtered by site-isolation middleware) → SQLite/PostgreSQL
Strapi API → Astro renderer (build-time fetch) → Static HTML → Netlify
```

### Multi-Tenancy

Every content type has a mandatory `site` relation. `apps/backend/src/middlewares/site-isolation.ts` scopes queries to the user's site and rejects any route not explicitly allowed. New content types must include a `site` relation and be added to the middleware allowlist.

## Development Commands

```bash
pnpm install              # at the root, installs every workspace package
pnpm check                # lint + typecheck + tests (Turborepo)
pnpm build                # build everything
pnpm --filter @communeo/backend dev   # Strapi dev server (http://localhost:1337)
pnpm gen:types           # regenerate packages/core/src/generated/strapi.ts after any Strapi schema change (CI fails if stale)
```

Frozen V1 apps keep their own npm setup: `cd admin && npm run dev`, `cd sites && npm run dev`.

## Environment Variables

### Backend
- `NETLIFY_TOKEN` — Netlify API token for deployments
- `STRAPI_PUBLIC_URL` — Public URL of Strapi (used during site builds)
- `STRAPI_API_TOKEN` — API token for Strapi access from build process

### Admin
- `VITE_API_URL` — Strapi backend URL (e.g., `http://localhost:1337`)

### Sites
- `SITE_DOCUMENT_ID` — UUID of the municipality in Strapi
- `SITE_SLUG` — URL slug (e.g., "lyon")
- `STRAPI_URL` — Strapi API endpoint

## Key Backend Files (apps/backend)

- `src/middlewares/site-isolation.ts` — Multi-tenant query filtering (critical)
- `src/bootstrap.ts` — Creates test site and user on first startup
- `src/services/deployment.ts` — Build and deploy orchestration
- `src/services/netlify.ts` — Netlify API client
- `src/services/domain.ts` / `domain-validation.ts` — Custom domain management
- `src/api/*/content-types/*/schema.json` — Content type schemas (Page, Article, Event, Site, Domain, Deployment)

## Content Types

| Type | API ID | Key fields |
|------|--------|------------|
| Site | `api::site.site` | name, slug, logo, contact, legal components, homepage, navigation_config |
| Page | `api::page.page` | title, slug, **blocks**, featured_image, show_in_menu, scheduled_at |
| Article | `api::article.article` | title, slug, summary, **blocks**, image, category, featured, scheduled_at |
| Event | `api::evenement.evenement` | title, **blocks**, start_date, end_date, location, registration, scheduled_at |
| Official document | `api::official-document.official-document` | title, document_type, dates, file, scheduled_at |
| Domain / Deployment | `api::domain.domain`, `api::deployment.deployment` | Custom domain, build status |

- **Draft & Publish** is enabled on page, article, event and official document. Writes from commune users default to the draft (`?status=published` to publish); `scheduled_at` is published by a cron task every minute (`src/services/scheduled-publication.ts`).
- **Blocks**: `blocks` is a dynamic zone restricted to the 9 `blocks.*` components (text, image, buttons, callout, documents, gallery, faq, contact, video). Rich text is restricted TipTap JSON. Validation lives in `@communeo/core` (`validateBlocks`) and runs in `apps/backend/src/validation/blocks.ts`: structure on every save, completeness (required fields, minimums, image alt text) on publish.

## Tech Stack Summary

| Layer | Stack |
|-------|-------|
| Backend | Strapi 5, TypeScript 5, SQLite/MySQL/PostgreSQL, Knex |
| Admin | React 19, Vite 7, Tailwind CSS 4, shadcn/ui, TanStack Query 5, React Router 7, Axios |
| Sites | Astro 4, Tailwind CSS 3, TypeScript 5 |
| Docs | Astro 6, Starlight |
| Hosting | Netlify (static sites) |

## GitHub Project Workflow

Refonte V2 : projet **#6 « Communeo V2 »** (owner: Philippe-Tic), 10 epics avec sous-issues, 1 milestone par phase, label `v2`. Maquettes des thèmes et brief dans `v2/`.
Détails complets (IDs, commandes, epics) : voir skill `.claude/skills/github-project.md`
