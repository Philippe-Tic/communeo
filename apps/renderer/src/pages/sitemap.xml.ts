/**
 * Plan du site pour les moteurs de recherche : toutes les pages publiées, y compris les rubriques
 * et les pages communes. Construit à partir des contenus, donc identique en statique et en preview.
 */
import { LEGAL_PAGES, SECTIONS } from '@communeo/core';
import type { APIRoute } from 'astro';
import { getSource } from '../lib/content';

export const GET: APIRoute = async () => {
  const source = getSource();
  const [site, pages, articles, events, documents, associations] = await Promise.all([
    source.site(),
    source.pages(),
    source.articles(),
    source.events(),
    source.documents(),
    source.associations(),
  ]);

  const sections = Object.values(SECTIONS)
    .filter((section) => {
      if (section.path === SECTIONS.demarches.path) return site.services.demarches.enabled;
      if (section.path === SECTIONS['open-data'].path) return site.services.openData.enabled;
      return true;
    })
    .map((section) => section.path);

  const urls = [
    '/',
    ...sections,
    ...Object.values(LEGAL_PAGES).map((page) => page.path),
    ...pages.map((page) => page.href),
    ...articles.map((article) => article.href),
    ...events.map((event) => event.href),
    ...documents.map((document) => document.href),
    ...associations.map((association) => association.href),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...new Set(urls)].map((path) => `  <url><loc>${site.url}${path === '/' ? '' : path}</loc></url>`).join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
