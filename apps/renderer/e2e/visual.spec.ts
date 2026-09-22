/**
 * Captures visuelles des pages clés. Le rendu des polices diffère selon le système : les captures de
 * référence sont générées dans le conteneur Playwright (workflow « Captures visuelles »), et ce test
 * ne tourne qu'avec VISUAL=1.
 */
import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const KEY_PAGES = [
  '/',
  '/salle-des-fetes',
  '/actualites',
  '/actualites/reouverture-de-la-mediatheque',
  '/agenda',
  '/agenda/concert-de-rentree',
  '/documents',
  '/equipe-municipale',
  '/contact',
  '/collecte-des-dechets',
  '/cantine',
  '/accessibilite',
];

test.skip(!process.env.VISUAL, 'Captures visuelles : VISUAL=1 (conteneur Playwright)');

// Un thème sans captures de référence (nouveau thème) n'est comparé qu'une fois ses captures générées
// eslint-disable-next-line no-empty-pattern -- signature imposée par Playwright (fixtures, testInfo)
test.beforeEach(({}, testInfo) => {
  const baselines = new URL(`__screenshots__/${testInfo.project.name}/`, import.meta.url);
  test.skip(testInfo.config.updateSnapshots !== 'all' && !existsSync(baselines), `Pas encore de captures pour ${testInfo.project.name}`);
});

for (const path of KEY_PAGES) {
  test(`capture ${path}`, async ({ page }) => {
    await page.goto(path);
    // Le bandeau cookies masquerait le bas de page : choix déjà fait
    await page.evaluate(() => localStorage.setItem('communeo-consent-v1', JSON.stringify({ media: false, decidedAt: new Date().toISOString() })));
    await page.reload();
    const name = path === '/' ? 'accueil' : path.slice(1).replace(/\//g, '--');
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
  });
}
