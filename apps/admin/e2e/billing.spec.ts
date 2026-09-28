/**
 * Facturation (#314) : la commune voit ses factures ; l'équipe suit ce qui reste à déposer sur
 * Chorus Pro, à encaisser et en retard, et agit (payée, déposée, relance, avoir, renouvellement).
 */
import { expect, test } from '@playwright/test';
import { mockApi } from './api';

test.describe('commune', () => {
  test('les factures, leur état, leur PDF et le renouvellement', async ({ page }) => {
    await mockApi(page);
    await page.goto('/facturation');
    await expect(page.getByRole('heading', { level: 1, name: 'Facturation' })).toBeVisible();
    await expect(page.getByText(/Abonnement en cours jusqu'au/)).toBeVisible();

    const table = page.getByRole('table', { name: /Factures et avoirs/ });
    const visible = (await table.isVisible()) ? table : page.getByRole('list').filter({ hasText: 'FAC-2026-0004' });
    await expect(visible.getByText('FAC-2026-0004', { exact: true })).toBeVisible();
    await expect(visible.getByText('En attente')).toBeVisible();
    await expect(visible.getByText('Payée')).toBeVisible();
    // Factures d'une autre commune : jamais
    await expect(page.getByText('Bellefontaine')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'PDF de la facture FAC-2026-0004 (nouvel onglet)' })).toHaveAttribute('href', '/api/billing/invoices/inv-4/pdf');
  });

  test('réservée aux administrateurs', async ({ page }) => {
    await mockApi(page, { user: 'editor' });
    await page.goto('/facturation');
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Facturation');
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Facturation' })).toHaveCount(0);
  });
});

test.describe('équipe Communeo', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, 'Tableau complet sur ordinateur');

  test('indicateurs et filtres', async ({ page }) => {
    await mockApi(page, { user: 'super_admin' });
    await page.goto('/plateforme/facturation');
    await expect(page.getByRole('heading', { level: 1, name: 'Facturation' })).toBeVisible();
    // À déposer : la facture de Saint-Aubin n'est pas sur Chorus Pro
    await expect(page.getByRole('definition').filter({ hasText: /^1$/ })).toBeVisible();
    const table = page.getByRole('table');
    await expect(table.getByRole('rowheader')).toHaveText(['FAC-2026-0004']);

    await page.getByRole('button', { name: /^En retard/ }).click();
    await expect(page.getByRole('button', { name: /^En retard/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(table.getByRole('rowheader')).toHaveText(['FAC-2026-0003']);
    await expect(table.getByText('1 relance')).toBeVisible();

    await page.getByRole('button', { name: /^Toutes/ }).click();
    await expect(table.getByRole('rowheader')).toHaveCount(5);
    await expect(table.getByText('Annulée')).toBeVisible();
    await expect(table.getByText('Annule FAC-2026-0002')).toBeVisible();
  });

  test('déposer sur Chorus Pro puis marquer payée, au clavier', async ({ page }) => {
    await mockApi(page, { user: 'super_admin' });
    await page.goto('/plateforme/facturation');
    const actions = page.getByRole('button', { name: 'Actions : facture FAC-2026-0004' });
    await actions.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('menuitem', { name: 'Déposée sur Chorus Pro…' }).click();
    const chorus = page.getByRole('alertdialog', { name: 'Facture FAC-2026-0004 déposée sur Chorus Pro' });
    await chorus.getByRole('textbox', { name: 'Numéro de flux Chorus Pro (facultatif)' }).fill('CPP-2026-200');
    await chorus.getByRole('button', { name: 'Enregistrer le dépôt' }).click();
    await expect(chorus).toBeHidden();
    await expect(page.getByRole('status').filter({ hasText: 'FAC-2026-0004 est déposée sur Chorus Pro.' })).toBeVisible();

    await page.getByRole('button', { name: /^À encaisser/ }).click();
    await page.getByRole('button', { name: 'Actions : facture FAC-2026-0004' }).click();
    await page.getByRole('menuitem', { name: 'Marquer payée…' }).click();
    const paid = page.getByRole('alertdialog', { name: 'Facture FAC-2026-0004 payée' });
    const amount = paid.getByRole('spinbutton', { name: /Montant reçu/ });
    await expect(amount).toHaveValue('390');
    await amount.fill('');
    await paid.getByRole('button', { name: 'Marquer payée' }).click();
    // Erreur reliée au champ, focus sur le champ
    await expect(amount).toBeFocused();
    await expect(amount).toHaveAttribute('aria-invalid', 'true');
    await amount.fill('390');
    await paid.getByRole('textbox', { name: 'Note (facultatif)' }).fill('Virement DGFiP');
    await paid.getByRole('button', { name: 'Marquer payée' }).click();
    await expect(paid).toBeHidden();
    await expect(page.getByRole('status').filter({ hasText: 'FAC-2026-0004 est payée.' })).toBeVisible();
  });

  test('annuler par un avoir : motif obligatoire', async ({ page }) => {
    await mockApi(page, { user: 'super_admin' });
    await page.goto('/plateforme/facturation');
    await page.getByRole('button', { name: /^En retard/ }).click();
    await page.getByRole('button', { name: 'Actions : facture FAC-2026-0003' }).click();
    await page.getByRole('menuitem', { name: 'Annuler par un avoir…' }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Annuler la facture FAC-2026-0003 ?' });
    await dialog.getByRole('button', { name: "Émettre l'avoir" }).click();
    await expect(dialog.getByRole('textbox', { name: 'Motif' })).toBeFocused();
    await dialog.getByRole('textbox', { name: 'Motif' }).fill('Résiliation avant l’échéance');
    await dialog.getByRole('button', { name: "Émettre l'avoir" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('status').filter({ hasText: "L'avoir de FAC-2026-0003 est émis." })).toBeVisible();
  });

  test('arrêter le renouvellement d’une commune qui résilie', async ({ page }) => {
    await mockApi(page, { user: 'super_admin' });
    await page.goto('/plateforme/facturation');
    await page.getByRole('button', { name: 'Arrêter le renouvellement… : Bellefontaine' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Arrêter le renouvellement' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Le renouvellement de Bellefontaine est arrêté.' })).toBeVisible();
  });

  test('la fiche d’une commune montre ses factures', async ({ page }) => {
    await mockApi(page, { user: 'super_admin' });
    await page.goto('/plateforme/communes/site-bellefontaine');
    const card = page.getByRole('region', { name: 'Facturation' });
    await expect(card.getByRole('link', { name: /FAC-2026-0003/ })).toBeVisible();
    await expect(card.getByText('En retard')).toBeVisible();
    await expect(card.getByRole('link', { name: 'Suivi de la facturation' })).toHaveAttribute('href', '/plateforme/facturation');
  });
});
