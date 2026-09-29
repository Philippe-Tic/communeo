/** Image de partage de la commune (Open Graph), générée au build aux couleurs du thème : lib/share-image.ts */
import type { APIRoute } from 'astro';
import theme from 'virtual:communeo/theme';
import { getSource } from '../lib/content';
import { renderShareImage } from '../lib/share-image';

export const GET: APIRoute = async () => {
  const site = await getSource().site();
  const png = await renderShareImage(site, theme.manifest.share);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
