# Sites (Astro) Conventions

Astro 4 + TypeScript 5 + Tailwind CSS 3 — Static site generator for municipal websites

## Directory Structure

```
src/
  components/       # Pure .astro components: Navigation, Footer, Hero, Card, Breadcrumb, StrapiImage...
  data/             # Static data arrays (demarches.ts)
  layouts/
    Layout.astro    # Base HTML layout (head, SEO, JSON-LD, theme colors)
  pages/            # File-based routing (.astro + .ts for RSS/manifest/robots)
    articles/       # [slug].astro, index.astro
    evenements/     # [slug].astro, index.astro
    documents/      # [slug].astro, index.astro
    associations/   # index.astro, proposer.astro
    [...slug].astro # Hierarchical CMS pages (catch-all)
  styles/
    fonts.css       # Marianne font face declarations
    prose.css       # Rich text content styling
  types/
    strapi.ts       # TypeScript interfaces mirroring Strapi schemas
  utils/
    strapi.ts       # Data fetching (buildStrapiUrl, strapiRequest, get{Entity}*)
    navigation.ts   # Menu building utilities
    toc.ts          # Table of contents generation
```

## Components

- Pure `.astro` files only (no React/Vue/Svelte)
- Props interface at top of frontmatter:
```astro
---
interface Props {
  title: string;
  description?: string;
}
const { title, description } = Astro.props;
---
```
- No `export default` — Astro components are single-file

## Data Fetching

All Strapi calls go through `utils/strapi.ts`:
- `buildStrapiUrl(endpoint, { filters, populate, sort, pagination })` — auto-adds site filter via `SITE_DOCUMENT_ID`
- `strapiRequest<T>(url)` — generic fetch wrapper, returns `T | null` on error
- Named functions per entity: `getArticles()`, `getArticleBySlug(slug)`, `getPages()`, etc.
- `filterScheduled()` — removes items with future `scheduled_at`
- `getStrapiImageUrl(url)` — prepends `STRAPI_PUBLIC_URL` if relative
- `getPagePath(page, allPages)` — builds hierarchical slug path
- `buildBreadcrumbs(page, allPages)` — returns `[{title, path}]` ancestor chain

## Dynamic Pages

Collection pages use `getStaticPaths` for production build:
```astro
---
export async function getStaticPaths() {
  const items = await getItems();
  return items.map(item => ({ params: { slug: item.slug }, props: { item } }));
}
const { item } = Astro.props;
---
```

Hierarchical pages (`[...slug].astro`) use `getPagePath()` for nested paths.

Dev mode fallback: fetch by slug if props are empty (allows direct URL access).

## Types

`types/strapi.ts` mirrors Strapi schemas exactly:
- `StrapiMedia` — media fields (id, documentId, url, alternativeText, width, height, size, mime)
- `StrapiCollectionResponse<T>` — `{ data: T[], meta: { pagination } }`
- `Site`, `Page`, `Article`, `Event`, `OfficialDocument`, `TeamMember`, `Association`, `Alerte`
- Relations typed as `StrapiData<Site> | Site` (may or may not be populated)

## SEO Checklist (mandatory per page)

- `<title>` — `{pageTitle} - {siteName}`
- `<meta name="description">` — unique per page
- `<link rel="canonical">` — `Astro.url`
- Open Graph: `og:type`, `og:title`, `og:description`, `og:image`, `og:locale=fr_FR`
- Twitter Card: `twitter:card=summary_large_image`
- JSON-LD: type-specific schema (Article → `NewsArticle`, Event → `Event`, Page → `WebPage`)
- Layout.astro handles base Organization + WebSite JSON-LD

## Accessibility Checklist (mandatory)

- Skip link: `<a class="skip-link" href="#main-content">Aller au contenu</a>`
- Main landmark: `<main id="main-content" data-pagefind-body>`
- Semantic HTML: `<nav>`, `<header>`, `<footer>`, `<article>`, `<section>`
- ARIA labels on interactive elements and navigation
- Images: always provide `alt` text (from `alternativeText` or explicit)
- Focus visible: outlined via CSS custom properties
- Language: `<html lang="fr">`

## Styling

- **Tailwind CSS 3** (NOT v4 — different from admin)
- Marianne font (DSFR — Design System de l'Etat Francais)
- CSS custom properties for theme colors:
  - `--color-primary` and `--color-secondary` (RGB triplets, set in Layout.astro via `define:vars`)
  - Usage: `rgb(var(--color-primary))`, `bg-[rgb(var(--color-primary))]`
- `styles/prose.css` — custom prose styling for rich text content
- `styles/fonts.css` — Marianne font-face declarations

## Image Handling

Use `StrapiImage.astro` component:
```astro
<StrapiImage
  image={item.image}
  alt="Description"
  width={800}
  height={400}
  widths={[400, 800, 1200]}
  sizes="(max-width: 768px) 100vw, 800px"
  priority={false}
  format="avif"
/>
```
- SVGs rendered as plain `<img>`, raster images use Astro `<Image>` with optimization
- `getStrapiImageUrl()` resolves relative URLs to absolute

## Pagefind Search

- `data-pagefind-body` on `<main>` enables indexing
- Search page at `/recherche.astro`
- Pagefind runs post-build to generate search index

## French Content

All user-facing text is in French. Dates formatted via `formatDate()` / `formatDateTime()` with `fr-FR` locale.
