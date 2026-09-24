/**
 * Thème Moderne : méga-menu plein écran (dialog modal). Accessible ouvert, Échap pour fermer,
 * focus rendu au bouton ; la loupe ouvre le menu dans la recherche ; sous-menus dépliables sur mobile.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// eslint-disable-next-line no-empty-pattern -- signature imposée par Playwright (fixtures, testInfo)
test.beforeEach(({}, info) => {
  test.skip(info.project.metadata.theme !== 'moderne', 'Méga-menu propre au thème Moderne');
});

test('méga-menu : ouvert sans violation, Échap le ferme et rend le focus au bouton', async ({ page }) => {
  await page.goto('/actualites');
  const button = page.locator('#menu').getByRole('button', { name: 'Menu' });
  await button.click();
  const menu = page.getByRole('dialog', { name: /menu complet/ });
  await expect(menu).toBeVisible();
  await expect(button).toHaveAttribute('aria-expanded', 'true');

  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const violations = results.violations.map((v) => ({ rule: v.id, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);

  // Page courante signalée dans le menu
  await expect(menu.locator('a[aria-current="page"]').filter({ visible: true })).toHaveText('Actualités');

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(button).toBeFocused();
  await expect(button).toHaveAttribute('aria-expanded', 'false');
});

test('la loupe ouvre le menu dans le champ de recherche ; « Fermer » le referme', async ({ page }) => {
  await page.goto('/');
  await page.locator('#menu').getByRole('link', { name: 'Rechercher' }).click();
  const menu = page.getByRole('dialog', { name: /menu complet/ });
  await expect(menu.getByRole('searchbox', { name: 'Rechercher sur le site' })).toBeFocused();
  await menu.getByRole('button', { name: /Fermer/ }).click();
  await expect(menu).toBeHidden();
  await expect(page.locator('#menu').getByRole('link', { name: 'Rechercher' })).toBeFocused();
});

test('mobile : les rubriques se déplient dans le menu', async ({ page }, info) => {
  test.skip(!info.project.name.endsWith('mobile'), 'Liste dépliable affichée sur mobile');
  await page.goto('/');
  await page.locator('#menu').getByRole('button', { name: 'Menu' }).click();
  const menu = page.getByRole('dialog', { name: /menu complet/ });
  const group = menu.locator('summary', { hasText: 'Vie pratique' });
  await group.click();
  await expect(menu.getByRole('link', { name: 'Collecte des déchets' })).toBeVisible();
});

test('page de contenu : la galerie s’agrandit sans violation, Échap rend le focus à la vignette', async ({ page }) => {
  await page.goto('/salle-des-fetes');
  const first = page.locator('[data-cn-gallery] a').first();
  await first.click();
  const dialog = page.getByRole('dialog', { name: 'Image agrandie' });
  await expect(dialog).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(first).toBeFocused();
});

test('page de contenu : le sommaire mène aux sections', async ({ page }, info) => {
  await page.goto('/salle-des-fetes');
  const mobile = info.project.name.endsWith('mobile');
  if (mobile) await page.locator('.mo-toc-mobile summary').click();
  const toc = mobile ? page.locator('.mo-toc-mobile') : page.getByRole('navigation', { name: 'Sur cette page' });
  await toc.getByRole('link', { name: 'Tarifs' }).click();
  await expect(page).toHaveURL(/#tarifs$/);
});
