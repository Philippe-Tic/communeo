/**
 * Plan du site pour les moteurs de recherche : toutes les pages publiées, y compris les rubriques
 * et les pages communes. Construit à partir des contenus, donc identique en statique et en preview.
 */
import { LEGAL_PAGES, SECTIONS } from '@communeo/core';
import type { APIRoute } from 'astro';
import { getSource } from '../lib/content';

const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const GET: APIRoute = async () => {
  const source = getSource();
  const [site, pages, articles, events, documents, associations, team, waste, canteen, alerts] = await Promise.all([
    source.site(),
    source.pages(),
    source.articles(),
    source.events(),
    source.documents(),
    source.associations(),
    source.team(),
    source.waste(),
    source.canteen(),
    source.alerts(),
  ]);

  // Une rubrique vide reste accessible, mais n'est pas proposée aux moteurs de recherche (page sans contenu)
  const empty: Record<string, boolean> = {
    [SECTIONS.actualites.path]: articles.length === 0,
    [SECTIONS.agenda.path]: events.length === 0,
    [SECTIONS.documents.path]: documents.length === 0,
    [SECTIONS.associations.path]: associations.length === 0,
    [SECTIONS.equipe.path]: team.total === 0,
    [SECTIONS.dechets.path]: waste.length === 0,
    [SECTIONS.cantine.path]: canteen.length === 0,
    [SECTIONS.perturbations.path]: alerts.length === 0,
    [SECTIONS.demarches.path]: !site.services.demarches.enabled,
    [SECTIONS['open-data'].path]: !site.services.openData.enabled,
  };
  const sections = Object.values(SECTIONS)
    .map((section) => section.path)
    .filter((path) => !empty[path]);

  // Date de dernière modification quand elle est connue : les moteurs reviennent sur ce qui a changé
  const entries: Array<{ path: string; lastmod?: string }> = [
    { path: '/' },
    ...sections.map((path) => ({ path })),
    ...Object.values(LEGAL_PAGES).map((page) => ({ path: page.path })),
    ...pages.map((page) => ({ path: page.href, lastmod: page.updatedAt.iso })),
    ...articles.map((article) => ({ path: article.href, lastmod: article.date.iso })),
    ...events.map((event) => ({ path: event.href })),
    ...documents.map((document) => ({ path: document.href, lastmod: document.date.iso })),
    ...associations.map((association) => ({ path: association.href })),
  ];
  const seen = new Set<string>();
  const unique = entries.filter((entry) => !seen.has(entry.path) && seen.add(entry.path));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${unique
  .map((entry) => {
    // Même adresse que le lien canonique (l'accueil garde sa barre oblique)
    const loc = `${site.url}${entry.path === '/' ? '/' : entry.path}`;
    const lastmod = entry.lastmod ? `<lastmod>${entry.lastmod.slice(0, 10)}</lastmod>` : '';
    return `  <url><loc>${escapeXml(loc)}</loc>${lastmod}</url>`;
  })
  .join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
