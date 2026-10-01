#!/usr/bin/env node
/**
 * Images de partage du site (1200 × 630) : l'aperçu affiché quand un lien vers communeo.fr est partagé
 * (messageries, réseaux sociaux, e-mails). Dessinées en HTML avec les polices et les couleurs du site,
 * puis capturées : public/partage.png (toutes les pages), public/partage-tarifs.png (prix de la grille
 * de @communeo/core) et public/partage-themes.png (captures des quatre thèmes, src/assets/themes/).
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

// Prix HT annuels de la grille (packages/core/src/site/pricing.ts, lus dans la source : ce script n'est pas
// compilé), affichés « 1 290 »
const prix = [...readFileSync(new URL('../../packages/core/src/site/pricing.ts', site), 'utf8').matchAll(/annualHT:\s*([\d_]+)/g)].map((m) => Number(m[1].replaceAll('_', '')));
// Espace insécable ordinaire : DM Serif Display n'a pas l'espace fine insécable de toLocaleString
const euros = (n) => n.toLocaleString('fr-FR').replace(/\s/g, '\u00a0');
const capture = (theme) => `data:image/png;base64,${readFileSync(new URL(`src/assets/themes/${theme}.png`, site)).toString('base64')}`;

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

const souligne = (texte) =>
  `<span class="souligne">${texte}<svg viewBox="0 0 200 16" preserveAspectRatio="none"><path d="M3 11 C 50 4, 120 2, 197 8" fill="none" stroke="#E3B55B" stroke-width="5" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg></span>`;

/** Une image : surtitre, titre, phrase ; `droite` : un visuel à droite (le texte se resserre) */
const html = ({ surtitre, titre, phrase, droite = '' }) => `<!doctype html>
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
.etroit h1 { font-size: 64px; max-width: 8.6em; }
.etroit p { max-width: 15em; }
.souligne { position: relative; display: inline-block; }
.souligne svg { position: absolute; left: -2%; bottom: -.04em; width: 104%; height: .22em; overflow: visible; }
p { margin-top: 26px; font-size: 30px; line-height: 1.35; max-width: 30em; text-wrap: balance; }
.adresse { position: absolute; right: 72px; bottom: 64px; font-size: 26px; font-weight: 600; color: #E3B55B; }
.themes { position: absolute; right: 56px; top: 64px; width: 470px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.themes figure { margin: 0; border-radius: 10px; overflow: hidden; background: #EFECE5; box-shadow: 0 18px 36px -18px rgba(0,0,0,.6); }
.themes img { display: block; width: 100%; aspect-ratio: 1440 / 900; object-fit: cover; object-position: top; }
.themes figcaption { padding: 6px 10px 8px; font-size: 16px; font-weight: 600; color: #0E4033; }
</style></head><body class="${droite ? 'etroit' : ''}">
<svg class="topo" viewBox="0 0 1200 630" preserveAspectRatio="xMaxYMid slice"><path d="${topo(1030, 330, 11, 56, 40, 0.4, 1.35)}" fill="none" stroke="#86C2AE" stroke-width="1.4" opacity=".18"/></svg>
<div class="contenu">
  <div class="logo">${logo}</div>
  <div class="surtitre">${surtitre}</div>
  <h1>${titre}</h1>
  <p>${phrase}</p>
</div>
${droite}
<div class="adresse">communeo.fr</div>
</body></html>`;

const IMAGES = [
  {
    fichier: 'partage.png',
    surtitre: 'LE SITE INTERNET DES COMMUNES',
    titre: `Votre commune a ${souligne('sa place')} en ligne.`,
    phrase: 'Prêt en une journée, conforme et facile à tenir à jour, sans prestataire.',
  },
  {
    fichier: 'partage-tarifs.png',
    surtitre: 'TARIFS',
    titre: `De ${euros(Math.min(...prix))} à ${euros(Math.max(...prix))}&nbsp;€ ${souligne('HT par an')}`,
    phrase: 'Selon la population INSEE, sans frais de mise en service. Essai gratuit 30 jours.',
  },
  {
    fichier: 'partage-themes.png',
    surtitre: 'QUATRE THÈMES',
    titre: `Le même contenu, ${souligne('quatre')} mises en page.`,
    phrase: 'Vous changez de thème quand vous voulez.',
    droite: `<div class="themes">${['institutionnel', 'moderne', 'journal', 'bourg']
      .map((t) => `<figure><img src="${capture(t)}" alt=""><figcaption>${t.charAt(0).toUpperCase() + t.slice(1)}</figcaption></figure>`)
      .join('')}</div>`,
  },
];

const dir = await mkdtemp(join(tmpdir(), 'communeo-partage-'));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const image of IMAGES) {
    const source = join(dir, 'partage.html');
    await writeFile(source, html(image));
    await page.goto(pathToFileURL(source).href);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: fileURLToPath(new URL(`public/${image.fichier}`, site)) });
    console.log(`✓ public/${image.fichier}`);
  }
} finally {
  await browser.close();
  await rm(dir, { recursive: true, force: true });
}
