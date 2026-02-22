import type { APIRoute } from 'astro';
import { getImage } from 'astro:assets';
import { getSiteConfig, getStrapiImageUrl } from '../utils/strapi';

export const GET: APIRoute = async () => {
  const siteConfig = await getSiteConfig();

  const faviconSrc = siteConfig?.favicon?.url
    ? getStrapiImageUrl(siteConfig.favicon.url)
    : siteConfig?.logo?.url
      ? getStrapiImageUrl(siteConfig.logo.url)
      : null;

  let icons: Array<{ src: string; sizes: string; type: string; purpose?: string }> = [];
  if (faviconSrc) {
    const [img192, img512] = await Promise.all([
      getImage({ src: faviconSrc, width: 192, height: 192, format: 'png' }),
      getImage({ src: faviconSrc, width: 512, height: 512, format: 'png' }),
    ]);
    icons = [
      { src: img192.src, sizes: '192x192', type: 'image/png' },
      { src: img512.src, sizes: '512x512', type: 'image/png' },
      { src: img512.src, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ];
  }

  // Couleur primaire dynamique
  const primaryRgb = siteConfig?.colors?.primaryRgb || '59 130 246';
  const [r, g, b] = primaryRgb.split(' ').map(Number);
  const themeColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

  const manifest = {
    name: siteConfig?.name || 'Site de la mairie',
    short_name: siteConfig?.name || 'Mairie',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: themeColor,
    ...(icons.length > 0 ? { icons } : {}),
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { 'Content-Type': 'application/manifest+json' },
  });
};
