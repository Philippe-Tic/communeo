/**
 * Plan du site pour les moteurs de recherche (toutes les pages sauf la page introuvable), avec la date
 * de dernière modification de chaque page : celle du dernier commit de ses fichiers sources (page et
 * texte), pour que les moteurs ne repassent que sur ce qui a changé. Sans historique git (copie sans
 * historique), la date est omise plutôt que fausse.
 */
import type { APIRoute } from 'astro';
import { execFileSync } from 'node:child_process';

// Le build tourne dans apps/site (import.meta.url pointe vers le code compilé, pas vers les sources)
const RACINE = process.cwd();

/** Chemin de la page → ses fichiers sources (relatifs à apps/site) */
const PAGES: Record<string, string[]> = {
  '/': ['src/pages/index.astro'],
  '/fonctionnalites': ['src/pages/fonctionnalites.astro'],
  '/themes': ['src/pages/themes.astro', 'src/assets/themes'],
  '/tarifs': ['src/pages/tarifs.astro', '../../packages/core/src/site/pricing.ts'],
  '/comment-ca-marche': ['src/pages/comment-ca-marche.astro'],
  '/questions': ['src/pages/questions.astro'],
  '/contact': ['src/pages/contact.astro'],
  '/a-propos': ['src/pages/a-propos.astro'],
  '/mentions-legales': ['src/pages/mentions-legales.astro'],
  '/conditions': ['src/pages/conditions.astro', 'src/contenus/conditions.md'],
  '/sous-traitance': ['src/pages/sous-traitance.astro', 'src/contenus/sous-traitance.md'],
  '/donnees-personnelles': ['src/pages/donnees-personnelles.astro'],
  '/accessibilite': ['src/pages/accessibilite.astro'],
  '/plan-du-site': ['src/pages/plan-du-site.astro'],
};

function derniereModification(fichiers: string[]): string | null {
  try {
    const date = execFileSync('git', ['log', '-1', '--format=%cs', '--', ...fichiers], { cwd: RACINE, encoding: 'utf8' }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  } catch {
    return null;
  }
}

export const GET: APIRoute = ({ site }) => {
  const urls = Object.entries(PAGES)
    .map(([path, fichiers]) => {
      const lastmod = derniereModification(fichiers);
      return `  <url><loc>${new URL(path, site).href}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
    })
    .join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
