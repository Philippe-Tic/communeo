# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-tenant municipal website CMS (CMS pour mairies). Municipalities each get their own website managed through a shared admin dashboard, with content stored in a central Strapi backend and public sites generated as static HTML via Astro.

## Architecture

Three independent applications in a monorepo (no shared package manager workspace):

- **backend/** — Strapi v5 headless CMS (TypeScript). Serves REST API, stores content in SQLite (dev) or MySQL/PostgreSQL (prod). Custom `site-isolation` middleware enforces multi-tenant data isolation by filtering all API requests based on the authenticated user's assigned site.
- **admin/** — React 19 + Vite admin dashboard (TypeScript). Uses Tailwind CSS 4 + shadcn/ui, TanStack React Query 5, React Hook Form 7, React Router 7. Dark/light mode via `class` strategy. Authenticated users see only their municipality's content.
- **sites/** — Astro 4 static site generator (TypeScript + Tailwind CSS 3). Builds one static site per municipality, parameterized by environment variables (`SITE_DOCUMENT_ID`, `SITE_SLUG`).

### Data Flow

```
Admin UI → Strapi API (filtered by site-isolation middleware) → SQLite/MySQL/PostgreSQL
Strapi API → Astro (build-time fetch) → Static HTML → Netlify
```

### Multi-Tenancy

Every content type (Page, Article, Event) has a mandatory `site` relation. The middleware at `backend/src/middlewares/site-isolation.ts` automatically scopes queries to the user's site. New content types must include a `site` relation.

### Deployment Pipeline

Triggered from admin UI → `backend/src/services/deployment.ts` orchestrates: fetches site data, runs Astro build in temp directory with per-site env vars, zips output, uploads to Netlify via `backend/src/services/netlify.ts`. Each municipality gets a separate Netlify site named `{slug}-mairie`.

## Development Commands

Each app has its own `node_modules` — run `npm install` in each directory separately.

### Backend (Strapi)
```bash
cd backend
npm run dev        # Dev server with hot reload (http://localhost:1337)
npm run build      # Build admin panel
npm run start      # Production mode
```

### Admin Dashboard (React + Vite)
```bash
cd admin
npm run dev        # Dev server (http://localhost:5173)
npm run build      # TypeScript check + Vite production build
npm run lint       # ESLint
```

### Sites (Astro)
```bash
cd sites
npm run dev        # Dev server (http://localhost:4321), requires env vars:
                   # SITE_DOCUMENT_ID=<uuid> SITE_SLUG=<slug> STRAPI_URL=http://localhost:1337
npm run build      # Build static site (with type checking)
npm run type-check # Astro type checking only
```

## Environment Variables

### Backend
- `NETLIFY_ACCESS_TOKEN` — Netlify API token for deployments
- `STRAPI_PUBLIC_URL` — Public URL of Strapi (used during site builds)
- `STRAPI_API_TOKEN` — API token for Strapi access from build process

### Admin
- `VITE_API_URL` — Strapi backend URL (e.g., `http://localhost:1337`)

### Sites
- `SITE_DOCUMENT_ID` — UUID of the municipality in Strapi
- `SITE_SLUG` — URL slug (e.g., "lyon")
- `STRAPI_URL` — Strapi API endpoint

## Key Backend Files

- `src/middlewares/site-isolation.ts` — Multi-tenant query filtering (critical)
- `src/bootstrap.ts` — Creates test site and user on first startup
- `src/services/deployment.ts` — Build and deploy orchestration
- `src/services/netlify.ts` — Netlify API client
- `src/services/domain.ts` / `domain-validation.ts` — Custom domain management
- `src/api/*/content-types/*/schema.json` — Content type schemas (Page, Article, Event, Site, Domain, Deployment)

## Content Types

| Type | API ID | Key fields |
|------|--------|------------|
| Site | `api::site.site` | name, slug, theme, colors, netlify_site_id, plan_type |
| Page | `api::page.page` | title, slug, content (richtext), status, template, parent_page |
| Article | `api::article.article` | title, slug, content, status, publication_date, featured, category |
| Event | `api::evenement.evenement` | title, description, start_date, end_date, location |
| Domain | `api::domain.domain` | Domain verification and SSL |
| Deployment | `api::deployment.deployment` | Build status tracking (building/success/failed) |

## Tech Stack Summary

| Layer | Stack |
|-------|-------|
| Backend | Strapi 5, TypeScript 5, SQLite/MySQL/PostgreSQL, Knex |
| Admin | React 19, Vite 7, Tailwind CSS 4, shadcn/ui, TanStack Query 5, React Router 7, Axios |
| Sites | Astro 4, Tailwind CSS 3, TypeScript 5 |
| Hosting | Netlify (static sites) |

## GitHub Project Workflow

Projet conformité légale (#5, owner: Philippe-Tic) — 21 issues (#2-#22) sur board Kanban.
Détails complets (IDs, commandes, mapping phases) : voir skill `.claude/skills/github-project.md`
