# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-tenant municipal website CMS (CMS pour mairies). Municipalities each get their own website managed through a shared admin dashboard, with content stored in a central Strapi backend and public sites generated as static HTML via Astro.

## Architecture

pnpm workspaces + Turborepo monorepo (V2 refactor in progress, see board #6):

- **apps/backend/** — Strapi v5 headless CMS (TypeScript). REST API, SQLite (dev) or PostgreSQL (prod). The `site-isolation` middleware enforces multi-tenant isolation (fail-closed) based on the authenticated user's site.
- **apps/admin/** — V2 admin (React 19 + Vite + TanStack Router/Query + shadcn/ui), built in phase 3. Mockups: `v2/Design Admin Handoff/`.
- **apps/renderer/** — Astro 7 renderer: one project for every commune and theme. Static build for published sites, `RENDER_MODE=server` for the draft preview: one preview server (`apps/renderer/Dockerfile`, `preview.<domain>`) for every commune and every theme — `src/middleware.ts` resolves the commune and theme of each request from a signed token (`src/lib/preview.ts`: `POST /api/preview/token` in Strapi signs `{site, theme?, exp}` with `PREVIEW_SECRET`, 30 min; `?token=` is moved into an HttpOnly cookie then stripped from the URL, `?theme=<id>` picks another registered theme; no valid token → 401; the fixtures demo needs none) into a request context (`src/lib/request-context.ts`), renders the whole response inside it (no streaming), and sends `noindex` / `no-store`; the admin's settings screens show unsaved Site settings through a form `POST` (preview token in the form, never the cookie alone; fields whitelisted by `previewSettingsSchema` in `@communeo/core`, applied to that response only — Astro's `checkOrigin` is off because the middleware does this check); in server mode `virtual:communeo/theme` bundles all installed themes and returns the request's one (the commune's theme, `THEME` forces one for parity tests). The theme is chosen at build time via `THEME` (virtual module `virtual:communeo/theme`); data comes from Strapi (`DATA_SOURCE=strapi`) or the demo fixtures (default). The renderer owns the HTML document (head, SEO, JSON-LD, skip links, cookie banner), the pages common to all themes (legal notice, privacy, accessibility statement, rights request, cookies, sitemap, search) and the machine-readable files (`rss.xml`, `sitemap.xml`, `robots.txt`, `site.webmanifest`). Alerts are rendered at build time and refreshed in the browser from `/api/alertes/public/:siteDocumentId` (public, cached 60 s): an alert published in the admin shows up without rebuilding the site. Static pages are emitted as `actualites.html` (`build.format: 'file'`, links and canonicals without trailing slash): hosts serve `/actualites` without redirect — a host adapter serving the folder must map `/x` to `x.html` (as `e2e/serve.mjs` and Netlify do). Site search is Pagefind: `pnpm --filter @communeo/renderer build` indexes the static output after `astro build`. Service-Public démarches (comarquage): the theme tree is fetched at build from the backend, a fiche is loaded in the browser from the public API (`/api/comarquage/fiche/…`) and rendered with `@communeo/core` (`demarches/`) — thousands of DILA fiches can't be built per commune.
- **apps/worker/** — build worker (own container, `apps/worker/Dockerfile`): consumes the build queue, builds the renderer for one commune into a temp dir (+ Pagefind), publishes it through `SitePublisher`, reports to Strapi via the internal routes `/api/build-worker/jobs/:jobId/{start,finish}` (shared `WORKER_SECRET`). One Deployment record per job (retries reuse it, a single error on final failure); temp dirs removed even on failure.
- **packages/pipeline** — publishing pipeline shared by backend and worker: `SitePublisher` + adapters (`NetlifyPublisher`, `LocalPublisher` for dev via `PUBLISH_DIR`; the only code that calls the host), the build queue (pg-boss on `QUEUE_DATABASE_URL`, `stately` policy keyed by site: at most one build running and one waiting per commune, heartbeat → resumed after a worker restart) and the worker ⇄ Strapi payload types.
- **packages/core** — generated Strapi types, block/settings schemas (zod), French formatting, **view-models** (`src/vm`: the ready-to-render data themes receive, never Strapi types) and the **content source** (`src/source`: `createStrapiLoader` → `createContentSource`).
- **packages/theme-contract** — what a theme must provide: `manifest`, 19 `templates` (Home, Page, ArticleList…, Frame, NotFound) and 9 `blocks`, declared with `defineTheme` (a missing template or wrong props fails `astro check`). Themes never fetch data: they receive view-models.
- **packages/ui-a11y** — shared accessible Astro components: RichText, Blocks dispatcher, SkipLinks, Breadcrumb, CookieBanner + consent store, ConsentEmbed (videos load after consent), OpeningStatus (computed in the browser), disclosure script.
- **themes/** — one package per public-site theme (`@communeo/theme-<id>`). `themes/starter` implements the whole contract in plain accessible HTML (template for new themes, reference for renderer tests); `themes/institutionnel` is the reference theme and the renderer's default. Moderne, Journal, Bourg mockups are in `v2/`.
- **packages/fixtures** — demo commune Saint-Aubin-sur-Loire in Strapi format (`createFixtureLoader({ variant: complete | minimal | empty })`, `FIXTURE_NOW`), goes through the same mappers as production; assets served under `/fixtures`.

**docs/** (Starlight) is the user documentation, one page per admin screen, deployed on Netlify; its screenshots are generated with `pnpm docs:captures`.

### Data Flow

```
Admin UI → Strapi API (filtered by site-isolation middleware) → SQLite/PostgreSQL
Admin « Mettre en ligne » → Strapi → build queue (pg-boss, Postgres) → worker → Astro renderer (reads Strapi with the read-only build token) → Static HTML → SitePublisher (Netlify)
```

### Multi-Tenancy

Every content type has a mandatory `site` relation. `apps/backend/src/middlewares/site-isolation.ts` scopes queries to the user's site and rejects any route not explicitly allowed. New content types must include a `site` relation and be added to the middleware allowlist. Integration tests (`apps/backend/tests/isolation.test.ts`, real Strapi on a throwaway SQLite DB, run by `pnpm test` and CI) must pass; add every new site-scoped content type to `SITE_SCOPED_TYPES` there.

## Development Commands

```bash
pnpm install              # at the root, installs every workspace package
pnpm check                # lint + typecheck + tests (Turborepo)
pnpm build                # build everything
pnpm --filter @communeo/backend dev   # Strapi dev server (http://localhost:1337)
pnpm theme:dev <id> [--variant complete|minimal|empty] [--logo blason] [--trial]   # demo commune in a theme, no Strapi (--trial: « Site en préparation »)
pnpm create-theme <id> --name "Nom"   # new theme from themes/starter (guide: packages/theme-contract/README.md)
pnpm theme:thumbnail <id>            # regenerate themes/<id>/thumbnail.png (1200 x 800)
THEME=<id> pnpm --filter @communeo/renderer build  # static site in apps/renderer/dist
pnpm --filter @communeo/renderer test:e2e     # every theme × every demo page: axe (WCAG 2.2 AA) at 390/1440 px + structure
pnpm --filter @communeo/renderer test:parity  # static build HTML == server (preview) HTML
pnpm --filter @communeo/renderer test:preview # preview server access: 401 without token, token → HttpOnly cookie
pnpm --filter @communeo/worker dev   # build worker (apps/worker/.env: QUEUE_DATABASE_URL, STRAPI_URL, STRAPI_API_TOKEN, WORKER_SECRET, NETLIFY_TOKEN or PUBLISH_DIR)
docker run -d -p 55432:5432 -e POSTGRES_PASSWORD=test -e POSTGRES_DB=queue postgres:16-alpine   # queue for local tests: TEST_QUEUE_DATABASE_URL=postgres://postgres:test@localhost:55432/queue pnpm test
pnpm gen:types           # regenerate packages/core/src/generated/strapi.ts after any Strapi schema change (CI fails if stale)
```

## Environment Variables

### Backend
- `NETLIFY_TOKEN` — Netlify API token (custom domains); without it Strapi boots and those actions answer 503
- `SITES_DOMAIN` — Communeo address of every site, `<slug>.<SITES_DOMAIN>` (Netlify alias; the DNS zone is on Netlify, which creates the record and certificate); the `*.netlify.app` address redirects to it, and both redirect to a verified custom domain. Unset: `*.netlify.app`. Same value on the worker. Some slugs are reserved (`RESERVED_SITE_SLUGS` in `@communeo/core`)
- `QUEUE_DATABASE_URL` — Postgres of the build queue (pg-boss schema `pgboss`); without it « Mettre en ligne » answers 503
- `WORKER_SECRET` — shared secret of the internal `/api/build-worker/*` routes
- `STRAPI_PUBLIC_URL` — Public URL of Strapi
- `STRAPI_API_TOKEN` — read-only build token (created at first boot when unset, see logs)
- `PREVIEW_API_TOKEN` — read-only token of the preview server (drafts), created the same way
- `PREVIEW_SECRET` — HMAC secret of the signed preview tokens (same value on the preview server); `PREVIEW_URL` — preview server base URL
- `ADMIN_URL` — admin base URL, used in e-mailed links (invitation, sign-up confirmation)
- `SIGNUP_NOTIFY_EMAIL` — Communeo team address notified of self-service sign-ups that need a manual check (no official town-hall e-mail in the Annuaire)
- `HOSTING_NAME`, `HOSTING_ADDRESS`, `HOSTING_PHONE` — host shown in every commune's legal notice (`config/platform.ts`); enforced on each Site write and synced at boot, never editable by communes. Unset: values already stored are kept

### Worker (`apps/worker/.env.example`)
- `QUEUE_DATABASE_URL`, `WORKER_SECRET`, `STRAPI_URL`, `STRAPI_PUBLIC_URL`, `STRAPI_API_TOKEN` (passed to the renderer)
- `NETLIFY_TOKEN` (+ `SITES_DOMAIN`) — publish to Netlify; or `PUBLISH_DIR` (+ `PUBLISH_BASE_URL`) to publish into a local folder in dev
- `BUILD_TIMEOUT_SECONDS` (600), `WORK_DIR`, `RENDERER_DIR`

### Admin
- `VITE_API_URL` — Strapi backend URL (e.g., `http://localhost:1337`)
- `VITE_TERMS_URL` — Communeo terms of use, linked from the sign-up page (#315)

### Renderer
- `THEME` — theme of the static build (default `institutionnel`); `DATA_SOURCE` — `strapi` or the demo fixtures (default)
- `RENDER_MODE=server` — draft preview server (see Architecture)
- With `DATA_SOURCE=strapi`: `STRAPI_URL`, `STRAPI_TOKEN`, `STRAPI_PUBLIC_URL`, `SITE_DOCUMENT_ID` (static build of one commune; set by the worker)

## Key Backend Files (apps/backend)

- `config/permissions.ts` — role permissions as code, synced at every boot (missing ones created, undeclared ones removed; in Strapi 5 a permission row = granted)
- `src/middlewares/site-isolation.ts` — Multi-tenant query filtering, fail-closed (critical)
- `src/api/session/` + `src/middlewares/session-cookie.ts` — admin session: `POST /api/session/login` sets an HttpOnly cookie (`SameSite=Strict`, `/api`, 12 h) turned into the usual `Authorization` header; cookie-authenticated writes require `X-Communeo-Csrf: 1`. Without a session `/api/users/me` answers 403 (public role): the admin treats 401 and 403 as logged out
- `src/api/publication/` — what Strapi 5 REST lacks for the admin lists: `GET /api/publication/:type` (state `draft | published | modified` + `scheduledAt` of every document of the commune) `GET /api/publication/official-documents/years` (document counts per year, for the list tabs) and `POST /api/publication/:type/:documentId/unpublish`. Never use REST `DELETE ?status=published`: it deletes the whole document, draft included
- `src/api/media-item/` — `POST /api/media-items/upload`: every admin upload goes into the commune's library (media-item tied to the site, impersonation included); images, PDF, Word, Excel, OpenDocument only, 20 MB max
- `src/validation/` — blocks, homepage, per-site slugs (document service middlewares)
- `src/bootstrap/` — closes public registration, syncs permissions, dev accounts (`test@example.com` / `super@example.com`), read-only build token
- `database/migrations/` — data migrations (never in bootstrap)
- `src/utils/publisher.ts` — the backend's access to the host (`@communeo/pipeline` publisher with Strapi's logger)
- `src/services/deployment.ts` / `build-queue.ts` — « Mettre en ligne » enqueues a build (Strapi never builds sites); `domain.ts` — custom domains through the publisher
- `src/api/build-worker/` — internal routes of the build worker (shared secret): start (Deployment with `reason`, `reference` `MEL-…`), progress (`step`: checking → rendering → publishing → cache), finish
- `src/services/pending-changes.ts` — changes waiting to go live (`api::pending-change`, no REST access): one entry per content item, recorded by the auto-deploy middleware with its author (or `scheduled` for the cron); a successful publication clears what changed before it started, a failure keeps the list. `GET /api/deployment/state` → `idle | pending | running(step) | failed(reference) | ok` + the list, for the admin header and « Mise en ligne » screen
- `src/services/auto-deploy.ts` — automatic publication: a document middleware (`changesPublicSite`) schedules a build `auto_deploy_delay` s after the **last** visible change (persistent debounce in the queue, `BuildQueue.schedule`). Drafts, technical Site fields (host, domain, auto-deploy settings), public submissions and non-published associations never trigger; a manual « Mettre en ligne » starts a waiting delayed build now.
- `src/services/trial.ts` — trial period (#310): a self-service sign-up starts a 30-day trial (`plan` `trial | live | expired`, `trial_ends_at`, protected fields); hourly cron sends reminders (D-7, D-1), expires the trial (host site removed, admin read-only in `site-isolation` with `details.code = 'trial_expired'`, no build, queued builds cancelled at worker start), warns a month before deletion and deletes the commune 6 months after. `POST /api/trial/live-request` notifies the team (`SIGNUP_NOTIFY_EMAIL`); the team extends the trial or switches to live through `PUT /api/site-management/:id` (`extendTrialDays`, `plan: 'live'`). Team-created communes are live. A trial site (#311) shows the renderer's « Site en préparation » banner (`SiteVM.inPreparation`), `noindex` meta, closed `robots.txt` without sitemap and `X-Robots-Tag` (`_headers` written by the Netlify adapter from `BuildSite.noindex`); custom domains are for live communes only (`POST /api/domain/configure` → 403 `live_only`); going live republishes at once
- `src/api/validation/` — team queue « À valider » (#313, super admin): sign-ups awaiting review (no official town-hall address) are approved (commune created in trial, requester invited) or rejected with an e-mailed reason; live requests are approved (`goLive`) or rejected (reason e-mailed to the commune's admins). No commune goes live without the team. `services/team-notifications.ts` e-mails the team (`SIGNUP_NOTIFY_EMAIL`) on every new trial commune, sign-up to review and live request
- `src/services/commune-deletion.ts` — deletes a commune: host site, accounts, every site-scoped document (all versions, media files), then the site; no pending change, build or per-item log line during it
- `src/api/*/content-types/*/schema.json` — content type schemas

## Content Types

| Type | API ID | Key fields |
|------|--------|------------|
| Site | `api::site.site` | name, slug, **theme**, logo, contact, legal components, **homepage**, navigation_config, **plan** (trial / live / expired) |
| Page | `api::page.page` | title, slug, **blocks**, featured_image, show_in_menu, scheduled_at |
| Article | `api::article.article` | title, slug, summary, **blocks**, image, category, featured, scheduled_at |
| Event | `api::evenement.evenement` | title, **blocks**, start_date, end_date, location, registration, scheduled_at |
| Official document | `api::official-document.official-document` | title, document_type, dates, file, scheduled_at |
| Domain / Deployment | `api::domain.domain`, `api::deployment.deployment` | Custom domain; one Deployment per build job (`job_id`, status, `step`, `reason`, `reference`, host `deployment_id`) |
| Pending change | `api::pending-change.pending-change` | site, content_type, content_document_id, title, action, source (person / scheduled), author |

- **Draft & Publish** is enabled on page, article, event and official document. Writes from commune users default to the draft (`?status=published` to publish); `scheduled_at` is published by a cron task every minute (`src/services/scheduled-publication.ts`).
- **Homepage in intents**: `homepage.homepage` holds 15 fixed sections (`home-sections.*`), each with an `enabled` flag and its data; no order or position, the theme decides the layout. Section ids and the theme registry (`THEMES`) live in `@communeo/core`; the Site `theme` enum must match `THEME_IDS` (tested). Only admins can change the theme.
- **Slugs** are unique per site, not globally (`string` + regex, not `uid`): generated from the title with a numeric suffix when missing, rejected when already used in the same site (`apps/backend/src/validation/slugs.ts`, `slugify` in `@communeo/core`). The Site slug stays globally unique.
- **Blocks**: `blocks` is a dynamic zone restricted to the 9 `blocks.*` components (text, image, buttons, callout, documents, gallery, faq, contact, video). Rich text is restricted TipTap JSON. Validation lives in `@communeo/core` (`validateBlocks`) and runs in `apps/backend/src/validation/blocks.ts`: structure on every save, completeness (required fields, minimums, image alt text) on publish.

## Tech Stack Summary

| Layer | Stack |
|-------|-------|
| Backend | Strapi 5, TypeScript 5, SQLite/MySQL/PostgreSQL, Knex |
| Admin | React 19, Vite 8, Tailwind CSS 4, shadcn/ui, TanStack Router and Query |
| Renderer and themes | Astro 7, TypeScript 5, Pagefind |
| Docs | Astro 6, Starlight |
| Hosting | Netlify (static sites) |

## GitHub Project Workflow

Refonte V2 : projet **#6 « Communeo V2 »** (owner: Philippe-Tic), 10 epics avec sous-issues, 1 milestone par phase, label `v2`. Maquettes des thèmes et brief dans `v2/`.
Détails complets (IDs, commandes, epics) : voir skill `.claude/skills/github-project.md`
