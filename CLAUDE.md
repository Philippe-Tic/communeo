# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-tenant municipal website CMS (CMS pour mairies). Municipalities each get their own website managed through a shared admin dashboard, with content stored in a central Strapi backend and public sites generated as static HTML via Astro.

## Architecture

pnpm workspaces + Turborepo monorepo (V2 refactor in progress, see board #6):

- **apps/backend/** — Strapi v5 headless CMS (TypeScript). REST API, SQLite (dev) or PostgreSQL (prod). The `site-isolation` middleware enforces multi-tenant isolation (fail-closed) based on the authenticated user's site.
- **apps/admin/** — V2 admin (React 19 + Vite + TanStack Router/Query + shadcn/ui), built in phase 3. Mockups: `v2/Design Admin Handoff/`.
- **apps/renderer/** — Astro 7 renderer: one project for every commune and theme. Static build for published sites, `RENDER_MODE=server` for the draft preview. The theme is chosen at build time via `THEME` (virtual module `virtual:communeo/theme`); data comes from Strapi (`DATA_SOURCE=strapi`) or the demo fixtures (default). The renderer owns the HTML document (head, SEO, JSON-LD, skip links, cookie banner), the pages common to all themes (legal notice, privacy, accessibility statement, rights request, cookies, sitemap, search) and the machine-readable files (`rss.xml`, `sitemap.xml`, `robots.txt`, `site.webmanifest`). Site search is Pagefind: `pnpm --filter @communeo/renderer build` indexes the static output after `astro build`. Service-Public démarches (comarquage): the theme tree is fetched at build from the backend, a fiche is loaded in the browser from the public API (`/api/comarquage/fiche/…`) and rendered with `@communeo/core` (`demarches/`) — thousands of DILA fiches can't be built per commune.
- **packages/core** — generated Strapi types, block/settings schemas (zod), French formatting, **view-models** (`src/vm`: the ready-to-render data themes receive, never Strapi types) and the **content source** (`src/source`: `createStrapiLoader` → `createContentSource`).
- **packages/theme-contract** — what a theme must provide: `manifest`, 19 `templates` (Home, Page, ArticleList…, Frame, NotFound) and 9 `blocks`, declared with `defineTheme` (a missing template or wrong props fails `astro check`). Themes never fetch data: they receive view-models.
- **packages/ui-a11y** — shared accessible Astro components: RichText, Blocks dispatcher, SkipLinks, Breadcrumb, CookieBanner + consent store, ConsentEmbed (videos load after consent), OpeningStatus (computed in the browser), disclosure script.
- **themes/** — one package per public-site theme (`@communeo/theme-<id>`). `themes/starter` implements the whole contract in plain accessible HTML (template for new themes, reference for renderer tests); `themes/institutionnel` is the reference theme and the renderer's default. Moderne, Journal, Bourg mockups are in `v2/`.
- **packages/fixtures** — demo commune Saint-Aubin-sur-Loire in Strapi format (`createFixtureLoader({ variant: complete | minimal | empty })`, `FIXTURE_NOW`), goes through the same mappers as production; assets served under `/fixtures`.

Frozen V1 apps (outside the workspace, no compatibility work, deleted at V2 launch): **admin/** (React admin V1) and **sites/** (Astro site V1). **docs/** (Starlight) stays at the root while the Netlify docs site points to it.

### Data Flow

```
Admin UI → Strapi API (filtered by site-isolation middleware) → SQLite/PostgreSQL
Strapi API → Astro renderer (build-time fetch) → Static HTML → Netlify
```

### Multi-Tenancy

Every content type has a mandatory `site` relation. `apps/backend/src/middlewares/site-isolation.ts` scopes queries to the user's site and rejects any route not explicitly allowed. New content types must include a `site` relation and be added to the middleware allowlist. Integration tests (`apps/backend/tests/isolation.test.ts`, real Strapi on a throwaway SQLite DB, run by `pnpm test` and CI) must pass; add every new site-scoped content type to `SITE_SCOPED_TYPES` there.

## Development Commands

```bash
pnpm install              # at the root, installs every workspace package
pnpm check                # lint + typecheck + tests (Turborepo)
pnpm build                # build everything
pnpm --filter @communeo/backend dev   # Strapi dev server (http://localhost:1337)
pnpm theme:dev <id> [--variant complete|minimal|empty] [--logo blason]   # demo commune in a theme, no Strapi
pnpm create-theme <id> --name "Nom"   # new theme from themes/starter (guide: packages/theme-contract/README.md)
pnpm theme:thumbnail <id>            # regenerate themes/<id>/thumbnail.png (1200 x 800)
THEME=<id> pnpm --filter @communeo/renderer build  # static site in apps/renderer/dist
pnpm --filter @communeo/renderer test:e2e     # every theme × every demo page: axe (WCAG 2.2 AA) at 390/1440 px + structure
pnpm --filter @communeo/renderer test:parity  # static build HTML == server (preview) HTML
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

- `config/permissions.ts` — role permissions as code, synced at every boot (missing ones created, undeclared ones removed; in Strapi 5 a permission row = granted)
- `src/middlewares/site-isolation.ts` — Multi-tenant query filtering, fail-closed (critical)
- `src/validation/` — blocks, homepage, per-site slugs (document service middlewares)
- `src/bootstrap/` — closes public registration, syncs permissions, dev accounts (`test@example.com` / `super@example.com`), read-only build token
- `database/migrations/` — data migrations (never in bootstrap)
- `src/services/deployment.ts` / `netlify.ts` / `domain.ts` — build, Netlify publishing, custom domains
- `src/api/*/content-types/*/schema.json` — content type schemas

## Content Types

| Type | API ID | Key fields |
|------|--------|------------|
| Site | `api::site.site` | name, slug, **theme**, logo, contact, legal components, **homepage**, navigation_config |
| Page | `api::page.page` | title, slug, **blocks**, featured_image, show_in_menu, scheduled_at |
| Article | `api::article.article` | title, slug, summary, **blocks**, image, category, featured, scheduled_at |
| Event | `api::evenement.evenement` | title, **blocks**, start_date, end_date, location, registration, scheduled_at |
| Official document | `api::official-document.official-document` | title, document_type, dates, file, scheduled_at |
| Domain / Deployment | `api::domain.domain`, `api::deployment.deployment` | Custom domain, build status |

- **Draft & Publish** is enabled on page, article, event and official document. Writes from commune users default to the draft (`?status=published` to publish); `scheduled_at` is published by a cron task every minute (`src/services/scheduled-publication.ts`).
- **Homepage in intents**: `homepage.homepage` holds 15 fixed sections (`home-sections.*`), each with an `enabled` flag and its data; no order or position, the theme decides the layout. Section ids and the theme registry (`THEMES`) live in `@communeo/core`; the Site `theme` enum must match `THEME_IDS` (tested). Only admins can change the theme.
- **Slugs** are unique per site, not globally (`string` + regex, not `uid`): generated from the title with a numeric suffix when missing, rejected when already used in the same site (`apps/backend/src/validation/slugs.ts`, `slugify` in `@communeo/core`). The Site slug stays globally unique.
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
