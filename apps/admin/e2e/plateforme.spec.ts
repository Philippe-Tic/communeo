/**
 * Espace de l'équipe Communeo (#146, handoff 6.20) : liste des communes (filtres, inactives depuis
 * 30 jours), création avec invitation du premier administrateur, fiche, suspension ; utilisateurs de
 * toute la plateforme et statistiques.
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

const wide = (page: Page) => (page.viewportSize()?.width ?? 1440) >= 1024;
const list = (page: Page) => page.getByRole('region', { name: 'Liste des communes' });

test('communes : résumé, colonnes, inactives depuis 30 jours, sans violation', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-24T10:00:00+02:00'));
  await mockApi(page, { user: 'super_admin' });
  await page.goto('/plateforme');
  await expect(
    page.getByRole('navigation', { name: 'Espace équipe Communeo' }).first().getByRole('link', { name: 'Communes' }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('3 communes · 3 sites en ligne · 0 en création')).toBeVisible();
  if (wide(page))
    await expect(list(page).getByRole('columnheader')).toHaveText([
      'Commune',
      'Thème',
      'Mise en ligne',
      'Utilisateurs',
      'Dernière activité',
      'Actions',
    ]);
  await expect(list(page)).toContainText('saint-aubin-sur-loire.fr · 3 240 hab.');
  await expect(list(page)).toContainText('12 modifs');
  await expectNoViolations(page);

  await page.getByRole('button', { name: 'Inactives depuis 30 jours · 1' }).click();
  await expect(page.getByRole('button', { name: 'Inactives depuis 30 jours · 1' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('status').filter({ hasText: '1 commune' })).toBeAttached();
  await expect(list(page)).toContainText('Champvert');
  await expect(list(page)).toContainText('Inactive depuis plus de 30 jours'.slice(0, 8));
  await page.getByRole('button', { name: 'Inactives depuis 30 jours · 1' }).click();
  await page.getByRole('combobox', { name: 'Thème' }).selectOption({ label: 'Moderne' });
  await expect(page.getByRole('status').filter({ hasText: '1 commune' })).toBeAttached();
  await expect(list(page)).toContainText('Bellefontaine');
});

test('créer une commune : adresse proposée et vérifiée, invitation, fiche ouverte', async ({ page }) => {
  const { bodies } = await mockApi(page, { user: 'super_admin' });
  await page.goto('/plateforme');
  await page.getByRole('button', { name: 'Créer une commune' }).click();
  const dialog = page.getByRole('dialog', { name: 'Créer une commune' });
  await dialog.getByRole('textbox', { name: /^Nom de la commune/ }).fill('Bellefontaine');
  await expect(dialog.getByRole('textbox', { name: /^Adresse du site/ })).toHaveValue('bellefontaine');
  await expect(dialog.getByText('Adresse déjà utilisée')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Créer et inviter' })).toBeDisabled();
  await dialog.getByRole('textbox', { name: /^Nom de la commune/ }).fill('Les Essarts-sur-Yonne');
  await expect(dialog.getByRole('textbox', { name: /^Adresse du site/ })).toHaveValue('les-essarts-sur-yonne');
  await expect(dialog.getByText('Disponible')).toBeVisible();
  await dialog
    .getByRole('group', { name: 'Premier administrateur' })
    .getByRole('textbox', { name: /^Prénom/ })
    .fill('Hélène');
  await dialog
    .getByRole('group', { name: 'Premier administrateur' })
    .getByRole('textbox', { name: /^Nom/ })
    .fill('Garnier');
  await dialog.getByRole('textbox', { name: /^E-mail/ }).fill('mairie@les-essarts.fr');
  await expectNoViolations(page);
  await dialog.getByRole('button', { name: 'Créer et inviter' }).click();
  await expect(page).toHaveURL(/\/plateforme\/communes\/site-les-essarts-sur-yonne$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Les Essarts-sur-Yonne' })).toBeVisible();
  expect(bodies.find((entry) => entry.call === 'POST commune')!.body.data).toEqual({
    name: 'Les Essarts-sur-Yonne',
    slug: 'les-essarts-sur-yonne',
    admin_first_name: 'Hélène',
    admin_last_name: 'Garnier',
    admin_email: 'mairie@les-essarts.fr',
  });
});

test('fiche : site, mise en ligne, utilisateurs, contenus ; invitation renvoyée ; suspension', async ({ page }) => {
  const { bodies, calls } = await mockApi(page, { user: 'super_admin' });
  await page.goto('/plateforme/communes/site-bellefontaine');
  await expect(page.getByRole('heading', { level: 1, name: 'Bellefontaine' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: "Fil d'Ariane" })).toContainText('Communes');
  await expect(page.getByRole('region', { name: 'Mise en ligne' })).toContainText('142 réussies, 1 échec');
  await expect(page.getByRole('region', { name: 'Utilisateurs' })).toContainText('Paul Girard');
  await expect(page.getByRole('region', { name: 'Utilisateurs' })).toContainText('Invitation en attente');
  await expectNoViolations(page);

  await page.getByRole('button', { name: 'Renvoyer une invitation admin' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Nouvelle invitation envoyée à maire@bellefontaine.fr.' }),
  ).toBeVisible();
  await expect.poll(() => calls).toContain('POST resend-invitation 60');

  await page.getByRole('button', { name: 'Suspendre la commune…' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Suspendre Bellefontaine ?' });
  await expect(confirm).toContainText('Le site public reste en ligne tel quel.');
  await confirm.getByRole('button', { name: 'Suspendre la commune' }).click();
  expect(bodies.find((entry) => entry.call === 'PUT commune site-bellefontaine')!.body.data).toEqual({
    suspended: true,
  });
  await expect(page.getByText('Commune suspendue : ses utilisateurs ne peuvent plus se connecter')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lever la suspension…' })).toBeVisible();
});

test('réservé à l’équipe Communeo', async ({ page }) => {
  await mockApi(page);
  await page.goto('/plateforme');
  await expect(page).toHaveURL(/\/$/);
});

test('utilisateurs de la plateforme : commune, rôle, état ; filtres et recherche, sans violation', async ({ page }) => {
  await mockApi(page, { user: 'super_admin' });
  await page.goto('/plateforme/utilisateurs');
  await expect(page.getByRole('heading', { level: 1, name: 'Utilisateurs' })).toBeVisible();
  const users = page.getByRole('region', { name: 'Liste des utilisateurs' });
  if (wide(page))
    await expect(users.getByRole('columnheader')).toHaveText(['Utilisateur', 'Commune', 'Rôle', 'État', 'Créé le']);
  await expect(users).toContainText('Paul Girard');
  await expect(users).toContainText('Équipe Communeo');
  await expectNoViolations(page);

  await page.getByRole('combobox', { name: 'État' }).selectOption({ label: 'Invitation en attente' });
  await expect(users).toContainText('Paul Girard');
  await expect(users).not.toContainText('Léa Communeo');
  await page.getByRole('combobox', { name: 'État' }).selectOption({ label: 'Tous' });
  await page.getByRole('searchbox', { name: 'Rechercher un utilisateur' }).fill('bellefontaine');
  await expect(page.getByRole('status').filter({ hasText: '1 utilisateur' })).toBeAttached();
  await users.getByRole('link', { name: 'Bellefontaine' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Bellefontaine' })).toBeVisible();
});

test('statistiques : chiffres des 30 derniers jours et répartition des thèmes, sans violation', async ({ page }) => {
  await mockApi(page, { user: 'super_admin' });
  await page.goto('/plateforme/statistiques');
  await expect(page.getByRole('heading', { level: 1, name: 'Statistiques' })).toBeVisible();
  // Une seule entrée courante dans la navigation de l'espace
  const nav = page.getByRole('navigation', { name: 'Espace équipe Communeo' }).first();
  await expect(nav.locator('[aria-current="page"]')).toHaveText('Statistiques');
  await expect(page.getByRole('definition')).toHaveText(['3', '187', '1 412', '26 s']);
  await expect(page.getByText('mises en ligne · 99,2 % réussies')).toBeVisible();
  await expect(page.getByText('communes · +1 ce mois')).toBeVisible();
  const themes = page.getByRole('region', { name: 'Répartition des thèmes' });
  await expect(themes.getByRole('listitem')).toHaveText([/Institutionnel.*2 · 67 %/, /Moderne.*1 · 33 %/]);
  await expectNoViolations(page);
});
