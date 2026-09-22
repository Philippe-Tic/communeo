/** robots.txt : tout est indexable sur le site publié, rien ne l'est sur la preview. */
import type { APIRoute } from 'astro';
import { getSource } from '../lib/content';

export const GET: APIRoute = async () => {
  const site = await getSource().site();
  const preview = process.env.RENDER_MODE === 'server';
  const body = preview
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
