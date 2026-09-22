/** Manifeste d'application : nom de la commune et icône, pour l'ajout à l'écran d'accueil. */
import type { APIRoute } from 'astro';
import { getSource } from '../lib/content';

export const GET: APIRoute = async () => {
  const site = await getSource().site();
  const icon = site.favicon ?? site.logo;
  const manifest = {
    name: `Mairie de ${site.name}`,
    short_name: site.name,
    lang: 'fr',
    start_url: '/',
    scope: '/',
    display: 'browser',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: icon ? [{ src: icon.src, sizes: 'any', type: icon.src.endsWith('.svg') ? 'image/svg+xml' : 'image/png' }] : [],
  };
  return new Response(JSON.stringify(manifest, null, 2), { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' } });
};
