/**
 * Accessibilité de chaque écran (#148) : axe (WCAG 2.2 AA) sur toutes les routes de l'admin et de
 * l'espace équipe, en clair et en sombre, à 1366 × 768 (écran de mairie courant) et à 390 px.
 * Les écrans ont aussi leurs propres tests d'accessibilité, sur leurs états (dialogues, erreurs…).
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { PLATFORM_ROUTES, ROUTES } from './routes';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function sweep(page: Page, routes: string[]) {
  const found: string[] = [];
  for (const route of routes) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 }), route).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    for (const violation of violations)
      found.push(
        `${route} — ${violation.id} : ${violation.nodes
          .map((node) => node.target.join(' '))
          .slice(0, 3)
          .join(', ')}`,
      );
  }
  expect(found).toEqual([]);
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(scheme === 'light' ? 'mode clair' : 'mode sombre', () => {
    test.beforeEach(async ({ page }) => {
      const width = page.viewportSize()?.width ?? 0;
      test.skip(width !== 1366 && width !== 390, 'balayage à 1366 et 390 px');
      await page.emulateMedia({ colorScheme: scheme });
    });

    test('chaque écran de la commune, sans violation', async ({ page }) => {
      test.setTimeout(ROUTES.length * 4_000);
      await mockApi(page);
      await sweep(page, ROUTES);
    });

    test("chaque écran de l'espace équipe, sans violation", async ({ page }) => {
      await mockApi(page, { user: 'super_admin' });
      await sweep(page, PLATFORM_ROUTES);
    });
  });
}
