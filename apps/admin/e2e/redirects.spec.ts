/**
 * Redirections depuis l'ancien site (#335) : import des anciennes adresses, propositions à vérifier,
 * choix d'une page, erreurs reliées aux champs, enregistrement.
 */
import { expect, test } from '@playwright/test';
import { mockApi } from './api';

test('importer, vérifier, compléter et enregistrer', async ({ page }) => {
  const api = await mockApi(page);
  await page.goto('/mon-site/redirections');
  await expect(page.getByRole('heading', { level: 1, name: 'Redirections' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Ancienne adresse (ligne 1)' })).toHaveValue('/horaires.html');

  await page
    .getByRole('textbox', { name: 'Ou les adresses, une par ligne (facultatif)' })
    .fill('https://ancien.test/services/etat-civil.html\nhttps://ancien.test/conseil/comptes-rendus\nhttps://ancien.test/node/42');
  await page.getByRole('button', { name: 'Proposer les redirections' }).click();
  await expect(page.getByRole('status').filter({ hasText: '3 adresses ajoutées, dont 1 sans page proposée' })).toBeVisible();
  await expect(page.getByText('À vérifier', { exact: true })).toBeVisible();
  await expect(page.getByText('À choisir', { exact: true })).toBeVisible();

  // Une ligne sans page : l'enregistrement la signale et y met le focus
  await page.getByRole('button', { name: 'Enregistrer les redirections' }).click();
  const empty = page.getByRole('combobox', { name: 'Vers la page (ligne 3)' });
  await expect(empty).toBeFocused();
  await expect(empty).toHaveAttribute('aria-invalid', 'true');
  await empty.selectOption('/salle-des-fetes');

  await page.getByRole('button', { name: 'Enregistrer les redirections' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Redirections enregistrées' })).toBeVisible();
  const saved = api.bodies.find((entry) => entry.call === 'save redirects')!.body.data.redirects as Array<{ from: string; to: string }>;
  expect(saved).toEqual([
    { from: '/services/etat-civil.html', to: '/etat-civil' },
    { from: '/conseil/comptes-rendus', to: '/documents' },
    { from: '/node/42', to: '/salle-des-fetes' },
    { from: '/horaires.html', to: '/contact' },
  ]);
});

test('plan du site refusé : le message du serveur est affiché', async ({ page }) => {
  await mockApi(page);
  await page.goto('/mon-site/redirections');
  await page.getByRole('textbox', { name: /Adresse du plan du site/ }).fill('http://interne/sitemap.xml');
  await page.getByRole('button', { name: 'Proposer les redirections' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Adresse non publique refusée' })).toBeVisible();
});

test('retirer une redirection', async ({ page }) => {
  await mockApi(page);
  await page.goto('/mon-site/redirections');
  await page.getByRole('button', { name: 'Retirer la redirection /horaires.html' }).click();
  await expect(page.getByText('Aucune redirection.')).toBeVisible();
});
