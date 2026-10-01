#!/usr/bin/env node
/**
 * Captures de l'accueil de la commune de démonstration dans chaque thème, pour les pages Accueil et
 * Thèmes du site (src/assets/themes/<thème>.png, 1440 × 900), et du site sur téléphone pour les
 * téléphones de l'accueil (src/assets/telephone/, 390 px de large, thème Institutionnel). Préalable : les builds de démonstration
 * du renderer (`E2E_THEMES=institutionnel,moderne,journal,bourg node e2e/build.mjs` dans apps/renderer).
 * Les emplacements hachurés de la démonstration y sont remplacés par de vraies photos libres de droits
 * (packages/fixtures/photos/, sources et licence dans son README) : les fixtures, elles, ne changent pas.
 *
 *   pnpm --filter @communeo/site captures:themes
 *
 * Options (reprises par les vidéos, v2/videos) : `--echelle 2` (captures retina), `--sortie <dossier>`
 * (au lieu de src/assets/themes/) ; avec `--sortie`, un JSON par capture (taille en pixels CSS, adresse),
 * où l'image est nommée `<--prefixe><thème>.png`.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';

const { values } = parseArgs({ options: { echelle: { type: 'string', default: '1' }, sortie: { type: 'string' }, prefixe: { type: 'string', default: '' } } });
const echelle = Number(values.echelle);

const THEMES = ['institutionnel', 'moderne', 'journal', 'bourg'];
const renderer = fileURLToPath(new URL('../../renderer/', import.meta.url));
const photos = fileURLToPath(new URL('../../../packages/fixtures/photos/', import.meta.url));
const browser = await chromium.launch();

/** Une page prête à capturer : horloge, cookies, vraies photos */
async function nouvellePage(options) {
  const page = await browser.newPage({ reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris', ...options });
  // Un mardi matin : la mairie est « Ouverte », et la capture ne dépend pas du moment où on la refait
  await page.clock.setFixedTime(new Date('2026-10-06T10:00:00+02:00'));
  // Choix des cookies déjà fait : pas de bandeau de consentement sur la capture
  await page.addInitScript(() => localStorage.setItem('communeo-consent-v1', JSON.stringify({ media: false })));
  // Une vraie photo à la place de l'image de démonstration de même nom, quand il y en a une
  await page.route(/\/fixtures\/[\w-]+\.(svg|jpe?g|png)(\?.*)?$/, (route) => {
    const nom = new URL(route.request().url()).pathname.split('/').pop().replace(/\.\w+$/, '');
    const photo = join(photos, `${nom}.jpg`);
    if (!existsSync(photo)) return route.fallback();
    return route.fulfill({ status: 200, contentType: 'image/jpeg', body: readFileSync(photo) });
  });
  return page;
}

/** Ouvre une page du site de démonstration (le serveur vient d'être lancé : on réessaie) */
async function ouvrir(page, url) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      break;
    } catch (error) {
      if (attempt > 20) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  await page.evaluate(() => document.fonts.ready);
}

for (const [index, theme] of THEMES.entries()) {
  const port = 4570 + index;
  const server = spawn('node', ['e2e/serve.mjs', theme, String(port)], { cwd: renderer, stdio: 'ignore' });
  try {
    const page = await nouvellePage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: echelle });
    await ouvrir(page, `http://127.0.0.1:${port}/`);
    const file = values.sortie ? join(values.sortie, `${theme}.png`) : fileURLToPath(new URL(`../src/assets/themes/${theme}.png`, import.meta.url));
    await page.screenshot({ path: file });
    if (values.sortie) {
      // Même format que les captures des vidéos (v2/videos/scripts/captures.ts)
      const meta = { image: `${values.prefixe}${theme}.png`, largeur: 1440, hauteur: 900, echelle, url: 'saint-aubin.communeo.fr', elements: {} };
      writeFileSync(join(values.sortie, `${theme}.json`), `${JSON.stringify(meta, null, 2)}\n`);
    }
    console.log(`✓ ${theme}`);
  } finally {
    server.kill();
  }
}

// Le site sur téléphone (sauf quand les vidéos réutilisent ce script avec --sortie). 390 × 790 : l'écran
// des téléphones de l'accueil sous la barre d'état. Une seule alerte : on ferme l'autre, comme un habitant.
if (!values.sortie) {
  const server = spawn('node', ['e2e/serve.mjs', 'institutionnel', '4579'], { cwd: renderer, stdio: 'ignore' });
  try {
    const page = await nouvellePage({ viewport: { width: 390, height: 790 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const capture = async (nom) => {
      // Aucun focus visible sur la capture (la fermeture d'une alerte le déplace)
      await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
      await page.screenshot({ path: fileURLToPath(new URL(`../src/assets/telephone/${nom}.png`, import.meta.url)) });
      console.log(`✓ téléphone : ${nom}`);
    };
    const masquer = (titre) => page.getByRole('button', { name: `Masquer l'alerte « ${titre} »` }).click();
    await ouvrir(page, 'http://127.0.0.1:4579/');
    await masquer('Travaux rue des Écoles');
    await capture('accueil');
    // La mairie : horaires du jour, adresse, téléphone, horaires de la semaine
    await page.getByRole('heading', { name: 'Mairie', exact: true }).evaluate((titre) => window.scrollTo(0, titre.getBoundingClientRect().top + window.scrollY - 24));
    await capture('mairie');
    await page.evaluate(() => window.scrollTo(0, 0));
    await masquer('Coupure d’eau');
    await capture('sans-alerte');
  } finally {
    server.kill();
  }
}

await browser.close();
