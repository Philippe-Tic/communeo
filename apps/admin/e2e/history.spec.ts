/**
 * Historique d'un contenu (#183, handoff 6.3) : panneau depuis le menu ⋯ de l'éditeur, versions
 * publiées avec leur auteur et leur résumé, « Voir », « Comparer au brouillon », « Restaurer… »
 * (brouillon actuel gardé, nouveau brouillon, version en ligne intacte).
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

async function openHistory(page: Page) {
  await page.getByRole('button', { name: 'Autres actions' }).click();
  await page.getByRole('menuitem', { name: 'Historique' }).click();
  return page.getByRole('dialog', { name: 'Historique' });
}

test('panneau : versions, version en ligne, création ; voir une version, sans violation', async ({ page }) => {
  await mockApi(page);
  await page.goto('/pages/p-salle');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const panel = await openHistory(page);
  await expect(panel).toContainText('Location de la salle des fêtes · 2 versions');
  const rows = panel.getByRole('listitem');
  await expect(rows.filter({ hasText: 'En ligne' })).toContainText('Sophie Leroy · ajout du bloc Bouton ou lien');
  await expect(rows.filter({ hasText: 'Claire Martin' })).toContainText('première publication');
  await expect(rows.last()).toContainText('Page créée');
  await expect(panel).toContainText("la version en ligne n'est pas modifiée tant que vous ne publiez pas");
  await expectNoViolations(page);

  await rows.filter({ hasText: 'Claire Martin' }).getByRole('button', { name: 'Voir' }).click();
  const version = page.getByRole('dialog', { name: /^Version du 12 sept\./ });
  await expect(version).toContainText('Salle des fêtes');
  await expect(version).toContainText('Réservation en mairie, le matin.');
  await version.getByRole('button', { name: 'Fermer' }).click();
  await expect(version).toBeHidden();
});

test('comparer au brouillon : titre et blocs modifiés depuis la version en ligne', async ({ page }) => {
  await page.clock.install();
  await mockApi(page);
  await page.goto('/pages/p-salle');
  await page.getByRole('textbox', { name: 'Titre', exact: true }).fill('Location de la salle Jean-Moulin');
  await page.clock.fastForward(5500);
  await expect(page.getByText('Modifications non publiées')).toBeVisible();
  const panel = await openHistory(page);
  await expect(panel.getByRole('listitem').first()).toContainText('Brouillon en cours');
  await panel.getByRole('button', { name: 'Comparer au brouillon' }).click();
  const compare = page.getByRole('dialog', { name: 'Version en ligne et brouillon' });
  await expect(compare).toContainText(
    'Titre modifié : « Location de la salle des fêtes » → « Location de la salle Jean-Moulin »',
  );
  await expect(compare.getByText('Identique')).toHaveCount(2);
  await expectNoViolations(page);
});

test('restaurer : brouillon actuel gardé, contenu repris dans le brouillon, rien de publié', async ({ page }) => {
  const { bodies } = await mockApi(page);
  await page.goto('/pages/p-salle');
  const panel = await openHistory(page);
  await panel
    .getByRole('listitem')
    .filter({ hasText: 'Claire Martin' })
    .getByRole('button', { name: 'Restaurer…' })
    .click();
  const confirm = page.getByRole('alertdialog', { name: 'Restaurer la version du 12 sept., 11:02 ?' });
  await expect(confirm).toContainText("le brouillon actuel est gardé dans l'historique");
  await confirm.getByRole('button', { name: 'Restaurer dans le brouillon' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'La version est reprise dans le brouillon' })).toBeVisible();
  expect(bodies.some((entry) => entry.call === 'POST checkpoint p-salle')).toBe(true);
  await expect(page.getByRole('textbox', { name: 'Titre', exact: true })).toHaveValue('Salle des fêtes');
  // L'adresse de la page ne change pas ; rien n'est publié
  await expect(page.getByRole('textbox', { name: /^Adresse/ })).toHaveValue('location-salle-des-fetes');
  expect(bodies.filter((entry) => entry.call === 'PUT published')).toHaveLength(0);
});
