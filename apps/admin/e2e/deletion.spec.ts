/**
 * Suppression d'une commune (#391) : demandée par un administrateur (nom tapé pour confirmer), prévue
 * 7 jours plus tard, annulable depuis le bandeau ou l'écran ; l'équipe supprime tout de suite ou annule
 * la demande depuis la fiche de la commune.
 */
import { expect, test } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

test('demander la suppression : nom à taper, date prévue, bandeau ; annuler', async ({ page }) => {
  const { bodies } = await mockApi(page);
  await page.goto('/mon-site/suppression');
  await expect(page.getByRole('heading', { level: 1, name: 'Supprimer la commune' })).toBeVisible();
  await expect(page.getByText('Les factures et les devis sont conservés')).toBeVisible();
  await expectNoViolations(page);

  const trigger = page.getByRole('button', { name: 'Demander la suppression…' });
  await trigger.click();
  const dialog = page.getByRole('alertdialog', { name: 'Supprimer Saint-Aubin-sur-Loire ?' });
  const confirm = dialog.getByRole('button', { name: 'Demander la suppression' });
  await expect(confirm).toBeDisabled();
  const name = dialog.getByRole('textbox', { name: /Pour confirmer, tapez le nom de la commune/ });
  await name.fill('Saint-Aubin');
  await expect(confirm).toBeDisabled();
  await expectNoViolations(page);
  // Annuler rend le focus au bouton et vide le champ
  await dialog.getByRole('button', { name: 'Annuler' }).click();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(name).toHaveValue('');
  await name.fill('saint-aubin-sur-loire');
  await confirm.click();

  expect(bodies.find((entry) => entry.call === 'POST commune-deletion')!.body.data).toEqual({ name: 'saint-aubin-sur-loire' });
  await expect(page.getByRole('heading', { level: 2, name: /^Suppression prévue le / })).toBeVisible();
  const banner = page.getByRole('region', { name: 'Suppression de la commune' });
  await expect(banner).toContainText('Suppression de la commune prévue le');
  await expect(banner).not.toContainText('En savoir plus');

  await page.getByRole('main').getByRole('button', { name: 'Annuler la suppression' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Suppression annulée : la commune est conservée.' })).toBeVisible();
  await expect(banner).toBeHidden();
  await expect(page.getByRole('button', { name: 'Demander la suppression…' })).toBeVisible();
});

test('suppression prévue : bandeau sur toutes les pages, annulation depuis le bandeau', async ({ page }) => {
  const { bodies } = await mockApi(page, { deletionInDays: 5 });
  await page.goto('/pages');
  const banner = page.getByRole('region', { name: 'Suppression de la commune' });
  await expect(banner).toContainText('Vous pouvez annuler d’ici là.');
  await expect(banner.getByRole('link', { name: 'En savoir plus' })).toHaveAttribute('href', '/mon-site/suppression');
  await expectNoViolations(page);
  await banner.getByRole('button', { name: 'Annuler la suppression' }).click();
  await expect(banner).toBeHidden();
  expect(bodies.some((entry) => entry.call === 'POST commune-deletion cancel')).toBe(true);
});

test('rédacteur : voit le bandeau sans pouvoir annuler, pas d’écran de suppression', async ({ page }) => {
  await mockApi(page, { user: 'editor', deletionInDays: 5 });
  await page.goto('/pages');
  const banner = page.getByRole('region', { name: 'Suppression de la commune' });
  await expect(banner).toContainText('Un administrateur de la commune peut l’annuler d’ici là.');
  await expect(banner.getByRole('button')).toHaveCount(0);
  await page.goto('/mon-site/suppression');
  await expect(page.getByRole('button', { name: 'Demander la suppression…' })).toHaveCount(0);
});

test('équipe : supprimer une commune tout de suite, nom tapé pour confirmer', async ({ page }) => {
  const { bodies } = await mockApi(page, { user: 'super_admin' });
  await page.goto('/plateforme/communes/site-bellefontaine');
  await page.getByRole('button', { name: 'Supprimer la commune…' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Supprimer Bellefontaine ?' });
  await expect(dialog).toContainText('Les factures et les devis sont conservés.');
  const confirm = dialog.getByRole('button', { name: 'Supprimer la commune' });
  await expect(confirm).toBeDisabled();
  await dialog.getByRole('textbox', { name: /tapez le nom de la commune/ }).fill('Bellefontaine');
  await expectNoViolations(page);
  await confirm.click();
  await expect(page).toHaveURL(/\/plateforme$/);
  await expect(page.getByRole('status').filter({ hasText: 'Bellefontaine est supprimée.' })).toBeVisible();
  expect(bodies.some((entry) => entry.call === 'DELETE commune site-bellefontaine')).toBe(true);
});

test('équipe : suppression demandée par la commune, date affichée, annulée', async ({ page }) => {
  const { bodies } = await mockApi(page, { user: 'super_admin', deletionInDays: 5 });
  await page.goto('/plateforme/communes/site-saint-aubin');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Suppression demandée');
  await expect(page.getByText(/La commune a demandé sa suppression : elle aura lieu le/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Supprimer maintenant…' })).toBeVisible();
  await expectNoViolations(page);
  await page.getByRole('button', { name: 'Annuler la suppression…' }).click();
  await page.getByRole('alertdialog', { name: /Annuler la suppression de/ }).getByRole('button', { name: 'Annuler la suppression' }).click();
  await expect(page.getByRole('status').filter({ hasText: /Suppression de .* annulée/ })).toBeVisible();
  expect(bodies.find((entry) => entry.call === 'PUT commune site-saint-aubin')!.body.data).toEqual({ cancelDeletion: true });
  await expect(page.getByText(/La commune a demandé sa suppression/)).toBeHidden();
});

test('abonnement payé : pas de demande possible, contacter l’équipe', async ({ page }) => {
  await mockApi(page, { paidInvoices: true });
  await page.goto('/mon-site/suppression');
  await expect(page.getByText(/Votre commune a un abonnement payé : elle ne peut pas être supprimée/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Contactez l'équipe Communeo/ })).toHaveAttribute('href', 'https://communeo.fr/contact');
  await expect(page.getByRole('button', { name: 'Demander la suppression…' })).toHaveCount(0);
  await expectNoViolations(page);
});

test('équipe : commune avec un abonnement payé, suppression désactivée et expliquée', async ({ page }) => {
  await mockApi(page, { user: 'super_admin', paidInvoices: true });
  await page.goto('/plateforme/communes/site-saint-aubin');
  const remove = page.getByRole('button', { name: 'Supprimer la commune…' });
  await expect(remove).toBeDisabled();
  await expect(remove).toHaveAccessibleDescription('Suppression impossible : la commune a un abonnement payé.');
  await expectNoViolations(page);
});
