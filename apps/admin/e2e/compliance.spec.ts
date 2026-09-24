/**
 * Conformité (#147, handoff 6.17) : score en repère, 18 points en 5 catégories, chaque point à faire
 * mène à l'écran où on le complète ; un éditeur voit les réglages légaux sans lien (administrateurs).
 */
import { expect, test } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

test('score, catégories, prochaine action ; un point à faire mène à son écran, sans violation', async ({ page }) => {
  await mockApi(page);
  await page.goto('/conformite');
  await expect(page.getByRole('heading', { level: 1, name: 'Conformité' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: /^Conformité : / })).toBeVisible();
  await expect(page.getByRole('img', { name: /^Score de conformité : \d+ %$/ })).toBeVisible();
  for (const name of ['Mentions légales', 'RGPD', 'Accessibilité', 'Publication des actes', 'Cookies'])
    await expect(page.getByRole('region', { name })).toBeVisible();
  await expect(page.getByText(/^\d+ points sur 18 sont en ordre\./)).toBeVisible();
  // Assurés par Communeo : faits, sans lien
  const cookies = page.getByRole('region', { name: 'Cookies' });
  await expect(cookies).toContainText('3 / 3');
  await expect(cookies.getByRole('link')).toHaveCount(0);
  await expectNoViolations(page);

  // La politique de données manque dans le mock : lien vers les mentions légales et le RGPD
  await page.getByRole('region', { name: 'RGPD' }).getByRole('link', { name: 'Politique de données' }).click();
  await expect(page).toHaveURL(/\/mon-site\/legal$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('prochaine action : la demande RGPD en retard passe en premier et mène aux messages RGPD', async ({ page }) => {
  await mockApi(page);
  await page.goto('/conformite');
  const next = page.getByText('À faire en premier').locator('..');
  await expect(next.getByRole('link')).toHaveText('Répondre à la demande RGPD en retard');
  await expect(next).toContainText('RGPD, art. 12');
  await expect(page.getByRole('region', { name: 'RGPD' })).toContainText('1 demande RGPD sans réponse après un mois');
  await next.getByRole('link').click();
  await expect(page).toHaveURL(/\/messages\?categorie=rgpd$/);
});

test('éditeur : les réglages légaux sont signalés sans lien (réservés aux administrateurs)', async ({ page }) => {
  await mockApi(page, { user: 'editor' });
  await page.goto('/conformite');
  const rgpd = page.getByRole('region', { name: 'RGPD' });
  await expect(rgpd).toContainText('Politique de données (par un administrateur)');
  await expect(rgpd.getByRole('link', { name: 'Politique de données' })).toHaveCount(0);
  await expectNoViolations(page);
});
