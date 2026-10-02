/**
 * robots.txt : tout est indexable sur le site publié, rien ne l'est sur la preview ni sur le site d'une
 * commune en période d'essai ni sur la démonstration de communeo.fr (sitemap non référencé).
 */
import type { APIRoute } from 'astro';
import { getSource } from '../lib/content';

export const GET: APIRoute = async () => {
  const site = await getSource().site();
  const closed = process.env.RENDER_MODE === 'server' || site.inPreparation || process.env.DEMO === '1';
  const body = closed
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
