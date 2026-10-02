/**
 * Export des données de la commune (#343) : préparer l'archive, suivre la préparation, télécharger ;
 * échec ; réservé aux administrateurs ; lien depuis l'écran de suppression ; l'équipe depuis la fiche
 * de la commune.
 */
import { expect, test } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

test("préparer l'export : préparation suivie, puis archive à télécharger", async ({ page }) => {
  const { bodies } = await mockApi(page);
  await page.goto('/mon-site/export');
  await expect(page.getByRole('heading', { level: 1, name: 'Exporter les données' })).toBeVisible();
  await expect(page.getByText("Tous les fichiers d'origine de la médiathèque", { exact: false })).toBeVisible();
  await expect(page.getByText('Aucun export en cours.')).toBeVisible();
  await expectNoViolations(page);

  await page.getByRole('button', { name: "Préparer l'export" }).click();
  expect(bodies.find((entry) => entry.call === 'POST data-export')!.body.data).toEqual({ site: 'site-saint-aubin' });
  await expect(page.getByRole('status').filter({ hasText: 'Préparation en cours, demandée par Claire Martin.' })).toBeVisible();
  await expect(page.getByRole('button', { name: "Préparer l'export" })).toBeHidden();
  await expectNoViolations(page);

  // L'écran suit la préparation jusqu'à l'archive prête
  const status = page.getByRole('status').filter({ hasText: 'Archive prête' });
  await expect(status).toBeVisible({ timeout: 10_000 });
  await expect(status).toContainText('(12,4 Mo)');
  await expect(status).toContainText("téléchargeable jusqu'au 7 octobre 2026");
  const link = page.getByRole('link', { name: "Télécharger l'archive" });
  await expect(link).toHaveAttribute('href', '/api/data-export/download');
  const download = page.waitForEvent('download');
  await link.click();
  expect(new URL((await download).url()).pathname).toBe('/api/data-export/download');
  await expect(page.getByRole('button', { name: 'Préparer un nouvel export' })).toBeVisible();
  await expectNoViolations(page);
});

test('export en échec : le message, et on peut réessayer', async ({ page }) => {
  await mockApi(page, { dataExport: 'failed' });
  await page.goto('/mon-site/export');
  await expect(page.getByText("L'export n'a pas pu être préparé. Réessayez", { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: "Télécharger l'archive" })).toBeHidden();
  await expect(page.getByRole('button', { name: "Préparer l'export" })).toBeEnabled();
  await expectNoViolations(page);
});

test("rédacteur : pas d'export des données", async ({ page }) => {
  await mockApi(page, { user: 'editor' });
  await page.goto('/mon-site/export');
  await expect(page.getByText("L'export des données n'est pas accessible avec votre rôle d'éditeur.", { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Exporter les données' })).toHaveCount(0);
});

test('supprimer la commune : un lien pour exporter les données avant', async ({ page }) => {
  await mockApi(page);
  await page.goto('/mon-site/suppression');
  await page.getByRole('main').getByRole('link', { name: 'exporter les données' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Exporter les données' })).toBeVisible();
});

test("équipe : exporter les données d'une commune depuis sa fiche", async ({ page }) => {
  const { bodies } = await mockApi(page, { user: 'super_admin' });
  await page.goto('/plateforme/communes/site-saint-aubin');
  const card = page.getByRole('region', { name: 'Export des données' });
  await expect(card).toContainText('Aucun export en cours.');
  await card.getByRole('button', { name: "Préparer l'export" }).click();
  expect(bodies.find((entry) => entry.call === 'POST data-export')!.body.data).toEqual({ site: 'site-saint-aubin' });
  await expect(card.getByRole('link', { name: "Télécharger l'archive" })).toHaveAttribute(
    'href',
    '/api/data-export/download?site=site-saint-aubin',
    { timeout: 10_000 },
  );
  await expectNoViolations(page);
});
