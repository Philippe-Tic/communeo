/**
 * robots.txt : tout est indexable sur le site publié, rien ne l'est sur la preview ni sur le site d'une
 * commune en période d'essai (sitemap non référencé).
 */
import type { APIRoute } from 'astro';
import { getSource } from '../lib/content';

export const GET: APIRoute = async () => {
  const site = await getSource().site();
  const closed = process.env.RENDER_MODE === 'server' || site.inPreparation;
  const body = closed
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
