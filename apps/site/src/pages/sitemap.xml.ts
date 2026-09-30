/** Plan du site pour les moteurs de recherche (toutes les pages sauf la page introuvable) */
import type { APIRoute } from 'astro';

const PAGES = [
  '/',
  '/fonctionnalites',
  '/themes',
  '/tarifs',
  '/comment-ca-marche',
  '/questions',
  '/contact',
  '/a-propos',
  '/mentions-legales',
  '/conditions',
  '/sous-traitance',
  '/donnees-personnelles',
  '/accessibilite',
  '/plan-du-site',
];

export const GET: APIRoute = ({ site }) => {
  const urls = PAGES.map((path) => `  <url><loc>${new URL(path, site).href}</loc></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
