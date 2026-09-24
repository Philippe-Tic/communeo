/**
 * Aucune page ne défile horizontalement à 390 px (un contenu trop large pousse des boutons hors de
 * l'écran : c'est arrivé à la rangée de dossiers de la médiathèque).
 */
import { expect, test } from '@playwright/test';
import { mockApi } from './api';
const ROUTES = [
  '/',
  '/pages',
  '/pages/p-salle',
  '/actualites',
  '/actualites/a-conseil',
  '/agenda',
  '/agenda/e-fete',
  '/documents',
  '/documents/nouvelle',
  '/equipe',
  '/associations',
  '/associations?onglet=propositions',
  '/alertes',
  '/alertes/nouvelle',
  '/dechets',
  '/cantine?semaine=2026-09-21',
  '/messages',
  '/messages?id=m-dubois',
  '/newsletter',
  '/mediatheque',
  '/mon-site/menu',
  '/mon-site/apparence',
  '/mon-site/accueil',
  '/mon-site/informations',
  '/mon-site/legal',
  '/mon-site/accessibilite',
  '/mon-site/reseaux',
  '/mon-site/demarches',
  '/mon-site/open-data',
  '/mise-en-ligne',
  '/mon-compte',
];
test('aucun défilement horizontal', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) > 400);
  // Une route après l'autre : jusqu'à ~2 s chacune sur les machines de CI
  test.setTimeout(ROUTES.length * 3_000);
  await mockApi(page);
  const wide: string[] = [];
  for (const route of ROUTES) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    if (width > 390) wide.push(`${route}: ${width}`);
  }
  expect(wide).toEqual([]);
});
