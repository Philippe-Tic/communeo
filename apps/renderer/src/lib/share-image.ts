/**
 * Image de partage de la commune (1200 × 630, Open Graph) : les réseaux sociaux l'affichent quand une
 * page n'a pas de photo. Rien à configurer : nom de la commune, logo ou blason, couleurs du thème.
 *
 * satori dessine la carte en SVG (texte converti en tracés, aucune police système nécessaire), sharp
 * la convertit en PNG. Le logo est lu une fois et converti en PNG (il peut être en SVG, JPEG, WebP…).
 */
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { mairieOf, SHARE_HEIGHT, SHARE_WIDTH, type SiteVM } from '@communeo/core';
import type { ThemeManifest } from '@communeo/theme-contract';
import satori from 'satori';
import sharp from 'sharp';

const require = createRequire(import.meta.url);

type Element = { type: string; props: { style?: Record<string, unknown>; children?: unknown; src?: string; width?: number; height?: number } };
const el = (type: string, style: Record<string, unknown>, children?: unknown): Element => ({ type, props: { style, children } });

let fonts: Promise<Array<{ name: string; data: Buffer; weight: 400 | 700; style: 'normal' }>> | undefined;
const loadFonts = () =>
  (fonts ??= Promise.all(
    (['latin', 'latin-ext'] as const).flatMap((subset) =>
      ([400, 700] as const).map(async (weight) => ({
        name: 'DM Sans',
        data: await readFile(require.resolve(`@fontsource/dm-sans/files/dm-sans-${subset}-${weight}-normal.woff`)),
        weight,
        style: 'normal' as const,
      })),
    ),
  ));

/** Logo en PNG (data URI) et ses dimensions dans la carte ; null si illisible */
async function loadLogo(src: string): Promise<{ uri: string; width: number; height: number } | null> {
  try {
    let input: Buffer;
    if (/^https?:\/\//.test(src)) {
      const response = await fetch(src, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) return null;
      input = Buffer.from(await response.arrayBuffer());
    } else if (src.startsWith('/fixtures/')) {
      // Commune de démonstration : fichiers du paquet des fixtures (seul `assets/*` est exporté)
      const name = path.basename(src.slice('/fixtures/'.length));
      input = await readFile(require.resolve(`@communeo/fixtures/assets/${name}`));
    } else {
      return null;
    }
    // Tient dans 360 × 180 (logo horizontal) ou 200 × 200 (blason), sans agrandir
    const png = await sharp(input, { density: 300 }).resize(360, 200, { fit: 'inside', withoutEnlargement: false }).png().toBuffer();
    const meta = await sharp(png).metadata();
    return { uri: `data:image/png;base64,${png.toString('base64')}`, width: meta.width ?? 200, height: meta.height ?? 200 };
  } catch {
    return null;
  }
}

/** Nom long : police plus petite, pour tenir sur deux lignes */
const titleSize = (title: string) => (title.length > 42 ? 56 : title.length > 28 ? 66 : 78);

export async function renderShareImage(site: SiteVM, palette: ThemeManifest['share']): Promise<Buffer> {
  const [fontData, logo] = await Promise.all([loadFonts(), site.logo ? loadLogo(site.logo.src) : Promise.resolve(null)]);
  const title = mairieOf(site.name);
  const host = (() => {
    try {
      return new URL(site.url).host;
    } catch {
      return '';
    }
  })();

  const card = el(
    'div',
    {
      width: SHARE_WIDTH,
      height: SHARE_HEIGHT,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '64px 72px',
      backgroundColor: palette.background,
      color: palette.foreground,
      fontFamily: 'DM Sans',
    },
    [
      logo
        ? el('div', { display: 'flex', alignSelf: 'flex-start', padding: 20, borderRadius: 20, backgroundColor: '#ffffff' }, [
            { type: 'img', props: { src: logo.uri, width: logo.width * 0.8, height: logo.height * 0.8, style: {} } },
          ])
        : el('div', { display: 'flex', height: 8 }),
      el('div', { display: 'flex', flexDirection: 'column' }, [
        el('div', { fontSize: 30, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: palette.accent, marginBottom: 18 }, 'Site officiel'),
        el('div', { fontSize: titleSize(title), fontWeight: 700, lineHeight: 1.08, maxWidth: 1050 }, title),
      ]),
      el('div', { display: 'flex', alignItems: 'center' }, [
        el('div', { width: 96, height: 10, borderRadius: 5, backgroundColor: palette.accent, marginRight: 24 }),
        el('div', { fontSize: 30 }, host),
      ]),
    ],
  );

  const svg = await satori(card as never, { width: SHARE_WIDTH, height: SHARE_HEIGHT, fonts: fontData });
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}
