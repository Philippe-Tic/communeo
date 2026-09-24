/**
 * Journal d'activité (#190) : administrateur de la commune (sa commune, actions de l'équipe
 * signalées, pas d'adresse IP), équipe Communeo (toutes les communes, filtre, IP des connexions),
 * refusé aux éditeurs ; dernière connexion dans l'écran Utilisateurs.
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

const wide = (page: Page) => (page.viewportSize()?.width ?? 1440) >= 1024;
const entries = (page: Page) => page.getByRole('region', { name: 'Entrées du journal' });

test('administrateur : journal de la commune, actions de l’équipe signalées, filtre, sans violation', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('/journal');
  await expect(page.getByRole('heading', { level: 1, name: "Journal d'activité" })).toBeVisible();
  await expect(page.getByText('Les entrées sont gardées 6 mois.')).toBeVisible();
  if (wide(page))
    await expect(entries(page).getByRole('columnheader')).toHaveText(['Date', 'Qui', 'Action', 'Élément']);
  await expect(entries(page)).toContainText('Actualité — Nouveaux horaires de la déchetterie');
  await expect(entries(page)).toContainText('Moderne → Institutionnel');
  await expect(entries(page)).toContainText('claire.martin@saint-aubin.fr : Éditeur → Administrateur');
  // L'action de l'équipe Communeo est signalée ; pas d'adresse IP pour la commune ; pas d'autre commune
  await expect(entries(page).getByText('Équipe Communeo').filter({ visible: true }).first()).toBeVisible();
  await expect(entries(page)).not.toContainText('203.0.113.7');
  await expect(entries(page)).not.toContainText('Bellefontaine');
  await expectNoViolations(page);

  await page.getByRole('combobox', { name: 'Action' }).selectOption({ label: 'Connexion' });
  await expect(page.getByRole('status').filter({ hasText: '1 entrée' })).toBeAttached();
  await expect(
    page.getByRole('combobox', { name: 'Action' }).locator('option', { hasText: 'Commune suspendue' }),
  ).toHaveCount(0);
});

test('équipe Communeo : toutes les communes, IP des connexions, filtre par commune', async ({ page }) => {
  await mockApi(page, { user: 'super_admin' });
  await page.goto('/plateforme/journal');
  await expect(page.getByRole('heading', { level: 1, name: "Journal d'activité" })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Espace équipe Communeo' }).first().locator('[aria-current="page"]'),
  ).toHaveText('Journal');
  await expect(entries(page)).toContainText('Adresse IP 203.0.113.7');
  await expect(entries(page)).toContainText('Commune suspendue');
  await page.getByRole('combobox', { name: 'Commune' }).selectOption({ label: 'Bellefontaine' });
  await expect(page.getByRole('status').filter({ hasText: '1 entrée' })).toBeAttached();
  await expect(entries(page)).toContainText('Bellefontaine');
  await expectNoViolations(page);
});

test('éditeur : journal réservé, absent de la navigation', async ({ page }) => {
  await mockApi(page, { user: 'editor' });
  await page.goto('/journal');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('réservée aux administrateurs');
  if (wide(page)) await expect(page.getByRole('link', { name: "Journal d'activité" })).toHaveCount(0);
});

test('utilisateurs : dernière connexion affichée, « Jamais » pour qui ne s’est jamais connecté', async ({ page }) => {
  await mockApi(page);
  await page.goto('/utilisateurs');
  const accounts = page.getByRole('region', { name: 'Comptes de la commune' });
  if (wide(page)) {
    await expect(accounts.getByRole('columnheader', { name: 'Dernière connexion' })).toBeVisible();
    await expect(accounts.getByRole('row').filter({ hasText: 'Sophie Leroy' })).toContainText('22 sept., 09:40');
  } else {
    await expect(accounts).toContainText('Dernière connexion : 22 sept., 09:40');
  }
  await expect(accounts).toContainText(/Jamais|jamais/);
});
