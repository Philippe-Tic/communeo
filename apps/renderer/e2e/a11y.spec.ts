/**
 * Accessibilité de toutes les pages de la commune de démonstration, pour chaque thème et chaque largeur.
 * axe-core (WCAG 2.0 à 2.2, niveaux A et AA) + règles de structure du contrat de thème.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { PAGES } from './pages';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

for (const path of PAGES) {
  test(`accessibilité ${path}`, async ({ page }) => {
    await page.goto(path);

    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    const violations = results.violations.map((v) => ({
      rule: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
    }));
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);

    // Structure imposée par le contrat de thème
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main#contenu')).toHaveCount(1);
    await expect(page.locator('#menu')).toHaveCount(1);
  });
}

test('le lien d’évitement est le premier élément atteint au clavier et mène au contenu', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toHaveText('Aller au contenu');
  await expect(focused).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#contenu$/);
});

test('une adresse inconnue affiche la page 404 du thème', async ({ page }) => {
  const response = await page.goto('/cette-page-n-existe-pas');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Page introuvable');
});
