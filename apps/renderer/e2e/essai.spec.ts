/**
 * Commune en période d'essai (#311), build `essai` (thème institutionnel, FIXTURE_PLAN=trial) :
 * bandeau « Site en préparation » sur chaque page, aucune indexation (balise robots, robots.txt sans
 * sitemap), accessibilité inchangée.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { PAGES } from './pages';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

for (const path of PAGES) {
  test(`site en préparation ${path}`, async ({ page }) => {
    await page.goto(path);
    const banner = page.getByRole('complementary', { name: 'Site en préparation' });
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Site en préparation. Le site de Saint-Aubin-sur-Loire est en cours de construction');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');

    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    const violations = results.violations.map((v) => ({ rule: v.id, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
}

test('le lien d’évitement reste le premier élément atteint au clavier', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveText('Aller au contenu');
});

test('robots.txt ferme le site et ne référence pas le sitemap', async ({ request }) => {
  const body = await (await request.get('/robots.txt')).text();
  expect(body).toBe('User-agent: *\nDisallow: /\n');
});
