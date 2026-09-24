/**
 * Thème Journal : navigation en barre latérale (ordinateur) et onglets + panneau de menu (mobile), formulaires.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// eslint-disable-next-line no-empty-pattern -- signature imposée par Playwright (fixtures, testInfo)
test.beforeEach(({}, info) => {
  test.skip(info.project.metadata.theme !== 'journal', 'Navigation propre au thème Journal');
});

test('ordinateur : rubrique courante marquée, sous-menus dépliables dans la barre latérale', async ({ page }, info) => {
  test.skip(!info.project.name.endsWith('desktop'), 'Barre latérale sur ordinateur');
  await page.goto('/actualites');
  const menu = page.locator('#menu');
  await expect(menu.getByRole('link', { name: 'Actualités' })).toHaveAttribute('aria-current', 'page');
  await menu.locator('summary', { hasText: 'Vie pratique' }).click();
  await expect(menu.getByRole('link', { name: 'Collecte des déchets' })).toBeVisible();
});

test('mobile : « Menu » ouvre le panneau sans violation, Échap le ferme et rend le focus', async ({ page }, info) => {
  test.skip(!info.project.name.endsWith('mobile'), 'Onglets et panneau sur mobile');
  await page.goto('/agenda');
  const tabs = page.getByRole('navigation', { name: 'Raccourcis' });
  await expect(tabs.getByRole('link', { name: 'Agenda' })).toHaveAttribute('aria-current', 'page');
  const toggle = tabs.locator('[data-cn-menu-toggle]');
  await expect(toggle).toHaveAccessibleName('Menu');
  await toggle.click();
  const menu = page.locator('#menu');
  await expect(menu).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(toggle).toHaveAccessibleName('Fermer');
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
  await menu.getByRole('link', { name: 'Contact' }).focus();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('proposer une association : erreurs récapitulées et reliées aux champs', async ({ page }) => {
  await page.goto('/associations/proposer');
  await page.getByRole('button', { name: "Proposer l'association" }).click();
  const summary = page.locator('[data-jo-form-status]');
  await expect(summary).toBeFocused();
  await expect(summary).toContainText('Le formulaire contient 3 erreurs');
  await expect(page.getByLabel("Nom de l'association")).toHaveAttribute('aria-invalid', 'true');
  expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);
  await summary.getByRole('link', { name: /Votre e-mail/ }).click();
  await expect(page.getByLabel('Votre e-mail')).toBeFocused();
});
