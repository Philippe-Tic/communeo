/**
 * Newsletter (#140, handoff 6.15) : chiffres, liste des abonnés (recherche, état, pages de 20),
 * désabonnement confirmé (jamais de suppression), export CSV.
 */
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;
const figures = (page: Page) => page.locator('dl').first();
const pagination = (page: Page) => page.getByRole('navigation', { name: 'Pagination' });

test('chiffres, liste de 20, sans violation', async ({ page }) => {
  await mockApi(page);
  await page.goto('/newsletter');
  await expect(page.getByRole('heading', { level: 1, name: 'Newsletter' })).toBeVisible();
  await expect(figures(page)).toContainText('abonnés au total45');
  await expect(figures(page)).toContainText('actifs40');
  await expect(figures(page)).toContainText(/nouveaux en \p{L}+\+4/u);
  await expect(pagination(page)).toContainText('1–20 sur 45');
  if (!isMobile(page)) {
    const first = page.getByRole('table').locator('tbody tr').first();
    await expect(first).toContainText('h.garnier@example.org');
    await expect(first).toContainText('Hélène Garnier');
    await expect(first).toContainText('20 sept. 2026');
    await expect(first).toContainText('Actif');
  }
  await expectNoViolations(page);
});

test('recherche, filtre Désabonnés, pages', async ({ page }) => {
  await mockApi(page);
  await page.goto('/newsletter');
  await page.getByRole('searchbox', { name: 'Rechercher un abonné' }).fill('garnier');
  await expect(page).toHaveURL(/q=garnier/);
  await expect(pagination(page)).toContainText('1–1 sur 1');
  await page.getByRole('button', { name: 'Effacer la recherche' }).click();

  await page.getByRole('button', { name: 'État' }).click();
  await page.getByRole('menuitemradio', { name: 'Désabonnés' }).click();
  await expect(page).toHaveURL(/etat=desabonnes/);
  await expect(pagination(page)).toContainText('1–5 sur 5');
  await expect(page.getByText('ancienne.adresse@example.net').locator('visible=true')).toBeVisible();

  await page.getByRole('button', { name: 'Retirer le filtre État : Désabonnés' }).click();
  await pagination(page).getByRole('button', { name: 'Page 3' }).click();
  await expect(page).toHaveURL(/page=3/);
  await expect(pagination(page)).toContainText('41–45 sur 45');
});

test('désabonner : confirmation, reste dans la liste', async ({ page }) => {
  const { newsletter, posts } = await mockApi(page);
  await page.goto('/newsletter');
  await page.getByRole('button', { name: 'Actions pour h.garnier@example.org' }).locator('visible=true').click();
  await expect(page.getByRole('menuitem', { name: /Supprimer/ })).toHaveCount(0);
  await page.getByRole('menuitem', { name: 'Désabonner…' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Désabonner h.garnier@example.org ?' });
  await expect(dialog).toContainText('reste dans la liste');
  await dialog.getByRole('button', { name: 'Désabonner' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'h.garnier@example.org est désabonnée.' })).toBeVisible();
  expect(posts['/api/newsletter-subscribers/s-garnier/unsubscribe']).toHaveLength(1);
  expect(newsletter.find((item) => item.documentId === 's-garnier')).toMatchObject({ active: false });
  await expect(figures(page)).toContainText('actifs39');
  // Toujours listée, sans l'action
  await page.getByRole('button', { name: 'Actions pour h.garnier@example.org' }).locator('visible=true').click();
  await expect(page.getByRole('menuitem', { name: 'Désabonner…' })).toHaveCount(0);
});

test('export CSV : fichier daté, BOM pour Excel ; échec annoncé', async ({ page }) => {
  await mockApi(page);
  await page.goto('/newsletter');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter (CSV)' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^abonnes-newsletter-\d{4}-\d{2}-\d{2}\.csv$/);
  const content = await readFile((await file.path())!);
  expect([...content.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  expect(content.toString('utf8')).toContain('"h.garnier@example.org";"Hélène";"Garnier"');

  await mockApi(page, { failExport: true });
  await page.goto('/newsletter');
  await page.getByRole('button', { name: 'Exporter (CSV)' }).click();
  await expect(page.getByRole('alert').filter({ hasText: "L'export n'a pas pu être préparé" })).toBeVisible();
});

test('aucun abonné : explication, pas d’export', async ({ page }) => {
  await mockApi(page, { subscriberSet: 'none' });
  await page.goto('/newsletter');
  await expect(page.getByRole('heading', { level: 2, name: "Aucun abonné pour l'instant" })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Exporter (CSV)' })).toHaveCount(0);
  await expectNoViolations(page);
});
