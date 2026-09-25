/**
 * File « À valider » de l'équipe Communeo (#313) : inscriptions à vérifier et passages en live
 * demandés ; valider, ou refuser avec un motif obligatoire envoyé par e-mail ; compteur dans la
 * navigation.
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

const nav = (page: Page) => page.getByRole('navigation', { name: 'Espace équipe Communeo' }).locator('visible=true');

test('file vide : explications, pas de compteur', async ({ page }) => {
  await mockApi(page, { user: 'super_admin' });
  await page.goto('/plateforme/a-valider');
  await expect(page.getByRole('heading', { level: 1, name: 'À valider' })).toBeVisible();
  await expect(page.getByText('Aucune inscription à vérifier.')).toBeVisible();
  await expect(page.getByText('Aucun passage en live demandé.')).toBeVisible();
  await expect(nav(page).getByRole('link', { name: 'À valider' })).toHaveAttribute('aria-current', 'page');
  await expectNoViolations(page);
});

test('inscription : valider crée la commune et invite le demandeur', async ({ page }) => {
  const { bodies } = await mockApi(page, { user: 'super_admin', validations: 'some' });
  await page.goto('/plateforme/a-valider');
  await expect(nav(page).getByRole('link', { name: 'À valider 2 en attente' })).toBeVisible();
  const signups = page.getByRole('region', { name: 'Inscriptions à vérifier · 1' });
  await expect(signups.getByRole('listitem')).toContainText('Julie Martin · julie@gmail.test');
  await expectNoViolations(page);

  await signups.getByRole('button', { name: 'Valider…' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Créer le site de Bourg-Neuf ?' });
  await expect(dialog).toContainText('Julie Martin reçoit une invitation à julie@gmail.test');
  await dialog.getByRole('button', { name: 'Créer et inviter' }).click();
  await expect(dialog).toBeHidden();
  expect(bodies.at(-1)?.call).toBe('approve signups 41');
  await expect(page.getByText('Aucune inscription à vérifier.')).toBeVisible();
  await expect(nav(page).getByRole('link', { name: 'À valider 1 en attente' })).toBeVisible();
});

test('passage en live : refuser exige un motif, envoyé aux administrateurs', async ({ page }) => {
  const { bodies } = await mockApi(page, { user: 'super_admin', validations: 'some' });
  await page.goto('/plateforme/a-valider');
  const live = page.getByRole('region', { name: 'Passages en live demandés · 1' });
  await expect(live).toContainText('Devis DEV-2026-0001 : 390,00 € HT par an, tranche : de 500 à 1 999 habitants');
  await expect(live.getByRole('link', { name: 'PDF du devis DEV-2026-0001 (nouvel onglet)' })).toHaveAttribute('href', '/api/quote/q-1/pdf');
  await expect(live).toContainText('Validé le 25 septembre 2026 par Sophie Leroy, Maire (sophie.leroy@saint-aubin.fr)');
  await expect(live.getByRole('link', { name: 'Saint-Aubin-sur-Loire' })).toHaveAttribute('href', '/plateforme/communes/site-saint-aubin');

  await live.getByRole('button', { name: 'Refuser…' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Refuser le passage en live de Saint-Aubin-sur-Loire ?' });
  await dialog.getByRole('button', { name: 'Refuser et envoyer le motif' }).click();
  await expect(dialog.getByText('Écrivez le motif : il est envoyé par e-mail.')).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: /^Motif/ })).toBeFocused();
  await expectNoViolations(page);
  await dialog.getByRole('textbox', { name: /^Motif/ }).fill("Le devis n'est pas encore signé.");
  await dialog.getByRole('button', { name: 'Refuser et envoyer le motif' }).click();
  await expect(dialog).toBeHidden();
  expect(bodies.at(-1)).toMatchObject({ call: 'reject live site-saint-aubin', body: { data: { reason: "Le devis n'est pas encore signé." } } });
  await expect(page.getByText('Aucun passage en live demandé.')).toBeVisible();
});

test('passage en live : valider', async ({ page }) => {
  const { bodies } = await mockApi(page, { user: 'super_admin', validations: 'some' });
  await page.goto('/plateforme/a-valider');
  await page.getByRole('region', { name: 'Passages en live demandés · 1' }).getByRole('button', { name: 'Passer en live…' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Passer Saint-Aubin-sur-Loire en live ?' });
  await dialog.getByRole('button', { name: 'Passer en live' }).click();
  await expect(dialog).toBeHidden();
  expect(bodies.at(-1)?.call).toBe('approve live site-saint-aubin');
});
