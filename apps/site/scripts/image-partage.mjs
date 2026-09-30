#!/usr/bin/env node
/**
 * Image de partage du site (1200 × 630, public/partage.png) : l'aperçu affiché quand un lien vers
 * communeo.fr est partagé (messageries, réseaux sociaux, e-mails). Dessinée en HTML avec les polices et
 * les couleurs du site, puis capturée.
 *
 *   pnpm --filter @communeo/site image:partage
 */
import { readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const site = new URL('../', import.meta.url);
const file = (path) => pathToFileURL(fileURLToPath(new URL(path, site))).href;
const logo = readFileSync(new URL('src/assets/logo-communeo.svg', site), 'utf8');

/** Courbes de niveau, comme src/lib/topo.ts */
function topo(cx, cy, rings, gap, r0, seed, sx) {
  let d = '';
  for (let i = 0; i < rings; i += 1) {
    const r = r0 + i * gap;
    for (let k = 0; k <= 120; k += 1) {
      const a = (k / 120) * Math.PI * 2;
      const rr = r * (1 + 0.12 * Math.sin(3 * a + seed) + 0.05 * Math.sin(5 * a + seed * 2)) + gap * 0.18 * Math.sin(2 * a + seed + i * 0.35);
      d += `${k ? 'L' : 'M'}${(cx + rr * Math.cos(a) * sx).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`;
    }
    d += 'Z';
  }
  return d;
}

const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><style>
@font-face { font-family: 'DM Sans'; src: url('${file('node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-opsz-normal.woff2')}') format('woff2'); font-weight: 100 1000; }
@font-face { font-family: 'DM Serif Display'; src: url('${file('node_modules/@fontsource/dm-serif-display/files/dm-serif-display-latin-400-normal.woff2')}') format('woff2'); }
* { box-sizing: border-box; margin: 0; }
body { width: 1200px; height: 630px; overflow: hidden; background: #0E4033; font-family: 'DM Sans'; color: #EFECE5; -webkit-font-smoothing: antialiased; }
.topo { position: absolute; inset: 0; }
.contenu { position: relative; height: 100%; padding: 64px 72px; display: flex; flex-direction: column; }
.logo { width: 250px; color: #EFECE5; }
.logo svg { display: block; width: 100%; height: auto; }
.surtitre { margin-top: auto; font-size: 22px; font-weight: 700; letter-spacing: .16em; color: #E3B55B; }
h1 { margin-top: 18px; font: 400 92px/1.02 'DM Serif Display'; letter-spacing: -.01em; max-width: 12em; }
.souligne { position: relative; display: inline-block; }
.souligne svg { position: absolute; left: -2%; bottom: -.04em; width: 104%; height: .22em; overflow: visible; }
p { margin-top: 26px; font-size: 30px; line-height: 1.35; max-width: 30em; text-wrap: balance; }
.adresse { position: absolute; right: 72px; bottom: 64px; font-size: 26px; font-weight: 600; color: #E3B55B; }
</style></head><body>
<svg class="topo" viewBox="0 0 1200 630" preserveAspectRatio="xMaxYMid slice"><path d="${topo(1030, 330, 11, 56, 40, 0.4, 1.35)}" fill="none" stroke="#86C2AE" stroke-width="1.4" opacity=".18"/></svg>
<div class="contenu">
  <div class="logo">${logo}</div>
  <div class="surtitre">LE SITE INTERNET DES COMMUNES</div>
  <h1>Votre commune a <span class="souligne">sa place<svg viewBox="0 0 200 16" preserveAspectRatio="none"><path d="M3 11 C 50 4, 120 2, 197 8" fill="none" stroke="#E3B55B" stroke-width="5" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg></span> en ligne.</h1>
  <p>Prêt en une journée, conforme et facile à tenir à jour, sans prestataire.</p>
</div>
<div class="adresse">communeo.fr</div>
</body></html>`;

const dir = await mkdtemp(join(tmpdir(), 'communeo-partage-'));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  const source = join(dir, 'partage.html');
  await writeFile(source, html);
  await page.goto(pathToFileURL(source).href);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: fileURLToPath(new URL('public/partage.png', site)) });
  console.log('✓ public/partage.png');
} finally {
  await browser.close();
  await rm(dir, { recursive: true, force: true });
}
