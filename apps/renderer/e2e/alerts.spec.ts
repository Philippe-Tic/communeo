/**
 * Bandeau d'alertes, pour chaque thème : masquer une alerte ne fait pas défiler la page, et le focus
 * passe à l'alerte suivante, puis au contenu principal quand il n'en reste plus.
 */
import { expect, test } from '@playwright/test';

test('masquer les alertes garde la page en place et le focus au bon endroit', async ({ page }) => {
  await page.goto('/');
  const close = page.getByRole('button', { name: /^Masquer l'alerte/ });
  const count = await close.count();
  test.skip(count < 2, 'La démonstration affiche deux alertes');

  const first = close.first();
  const secondName = (await close.nth(1).textContent())!.trim().replace(/^✕/, '');
  await first.click();
  await expect(page.getByRole('button', { name: secondName })).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  await page.getByRole('button', { name: secondName }).click();
  await expect(page.locator('main#contenu')).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  // Choix mémorisé : les alertes masquées le restent au rechargement
  await page.reload();
  await expect(close).toHaveCount(0);
});
