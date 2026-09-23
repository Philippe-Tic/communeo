/**
 * Gabarit de liste (#134), sur les pages : états (liste, vide, aucun résultat), recherche, filtre de statut,
 * tri, pagination, densité, actions groupées et menu ⋯, lignes cliquables, cartes sur mobile.
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;
const desktopOnly = (page: Page) => test.skip(isMobile(page), 'tableau : tablette et ordinateur');
const table = (page: Page) => page.getByRole('table');
const rows = (page: Page) => table(page).locator('tbody tr');
const row = (page: Page, title: string) => rows(page).filter({ has: page.getByRole('link', { name: title, exact: true }) });

test.describe('accessibilité', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`liste sans violation (${scheme === 'light' ? 'clair' : 'sombre'})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await mockApi(page, { pageSet: 'many' });
      await page.goto('/pages');
      await expect(page.getByRole('heading', { level: 1, name: 'Pages' })).toBeVisible();
      await expect(page.getByText('25 pages · 6 brouillons · 1 programmée')).toBeVisible();
      await expect(page.getByRole('link', { name: 'La mairie et ses horaires' }).first()).toBeVisible();
      await expectNoViolations(page);
    });
  }

  test('liste vide : une aide et le bouton principal', async ({ page }) => {
    await mockApi(page, { pageSet: 'none' });
    await page.goto('/pages');
    await expect(page.getByRole('heading', { level: 2, name: 'Créez votre première page' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nouvelle page' })).toHaveCount(1);
    await expectNoViolations(page);
    await page.getByRole('link', { name: 'Nouvelle page' }).click();
    await expect(page).toHaveURL(/\/pages\/nouvelle$/);
  });
});

test.describe('recherche, filtres, tri, pages', () => {
  test('20 par page, page suivante dans l’adresse', async ({ page }) => {
    desktopOnly(page);
    await mockApi(page, { pageSet: 'many' });
    await page.goto('/pages');
    await expect(rows(page)).toHaveCount(20);
    const pagination = page.getByRole('navigation', { name: 'Pagination' });
    await expect(pagination).toContainText('1–20 sur 25');
    await expect(pagination.getByRole('button', { name: 'Page précédente' })).toBeDisabled();
    await pagination.getByRole('button', { name: 'Page 2' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(rows(page)).toHaveCount(5);
    await expect(pagination.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
    // Retour arrière : première page
    await page.goBack();
    await expect(rows(page)).toHaveCount(20);
  });

  test('recherche, aucun résultat, puis tout effacer', async ({ page }) => {
    await mockApi(page, { pageSet: 'many' });
    await page.goto('/pages');
    const search = page.getByRole('searchbox', { name: 'Rechercher une page' });
    await search.fill('cantine');
    await expect(page).toHaveURL(/q=cantine/);
    await expect(page.getByRole('status').filter({ hasText: /^1 page, triée/ })).toBeAttached();
    await expect(page.getByRole('link', { name: 'Cantine et accueil périscolaire' }).first()).toBeVisible();

    await search.fill('cantine scolaire');
    await expect(page.getByText('Aucune page ne correspond à « cantine scolaire »')).toBeVisible();
    await expectNoViolations(page);
    await page.getByRole('button', { name: 'Effacer la recherche et les filtres' }).click();
    await expect(search).toHaveValue('');
    await expect(page).not.toHaveURL(/q=/);
  });

  test('filtre de statut en pastille, retiré d’un clic', async ({ page }) => {
    await mockApi(page, { pageSet: 'many' });
    await page.goto('/pages');
    await page.getByRole('button', { name: 'Statut' }).click();
    await page.getByRole('menuitemradio', { name: 'Brouillon' }).click();
    await expect(page).toHaveURL(/statut=brouillon/);
    await expect(page.getByRole('status').filter({ hasText: /^6 pages/ })).toBeAttached();
    await expect(page.getByRole('button', { name: 'Statut : Brouillon', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Retirer le filtre Statut : Brouillon' }).click();
    await expect(page).not.toHaveURL(/statut=/);
    await page.goto('/pages?statut=programme');
    await expect(page.getByRole('link', { name: 'Inscriptions scolaires 2026-2027' }).first()).toBeVisible();
    await expect(page.getByText('Programmé le 3 nov. à 8h').locator('visible=true').first()).toBeVisible();
  });

  test('tri au clic sur l’en-tête, annoncé', async ({ page }) => {
    desktopOnly(page);
    await mockApi(page, { pageSet: 'many' });
    await page.goto('/pages');
    const titleHeader = table(page).getByRole('columnheader', { name: 'Titre' });
    await expect(table(page).getByRole('columnheader', { name: 'Modifiée' })).toHaveAttribute('aria-sort', 'descending');
    await titleHeader.getByRole('button').click();
    await expect(titleHeader).toHaveAttribute('aria-sort', 'ascending');
    await expect(page.getByText('Trié par titre')).toBeVisible();
    await expect(rows(page).first().getByRole('link')).toHaveText('Accueil des nouveaux habitants');
    await titleHeader.getByRole('button').click();
    await expect(titleHeader).toHaveAttribute('aria-sort', 'descending');
    await expect(page).toHaveURL(/tri=title&ordre=desc/);
  });

  test('« Compact » : 50 par page, mémorisé', async ({ page }) => {
    desktopOnly(page);
    await mockApi(page, { pageSet: 'many' });
    await page.goto('/pages');
    const compact = page.getByRole('button', { name: 'Compact' });
    await expect(compact).toHaveAttribute('aria-pressed', 'false');
    await compact.click();
    await expect(compact).toHaveAttribute('aria-pressed', 'true');
    await expect(rows(page)).toHaveCount(25);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Compact' })).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('actions', () => {
  test('la ligne entière ouvre l’éditeur, par un vrai lien', async ({ page }) => {
    desktopOnly(page);
    await mockApi(page, { pageSet: 'many' });
    await page.goto('/pages');
    const link = page.getByRole('link', { name: 'Location de la salle des fêtes' });
    await expect(link).toHaveAttribute('href', '/pages/p-salle');
    // Clic à l'endroit de la date : le lien du titre couvre toute la ligne
    const box = (await row(page, 'Location de la salle des fêtes').locator('td').nth(5).boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page).toHaveURL(/\/pages\/p-salle$/);
  });

  test('sélection : la barre d’actions remplace les filtres, publication groupée', async ({ page }) => {
    desktopOnly(page);
    const { calls } = await mockApi(page, { pageSet: 'many' });
    await page.goto('/pages?statut=brouillon');
    await expect(rows(page)).toHaveCount(6);
    await page.getByRole('checkbox', { name: 'Sélectionner « Conseil municipal : les élus »' }).check();
    await page.getByRole('checkbox', { name: 'Sélectionner « Cimetière communal »' }).check();
    const bar = page.getByRole('region', { name: 'Actions groupées' });
    await expect(bar).toContainText('2 pages sélectionnées');
    await expect(page.getByRole('searchbox')).toHaveCount(0);
    await expect(page.getByRole('checkbox', { name: 'Tout sélectionner sur cette page' })).toHaveJSProperty('indeterminate', true);
    await expectNoViolations(page);

    await bar.getByRole('button', { name: 'Publier', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: '2 pages publiées' })).toBeVisible();
    expect(calls.filter((call) => call.startsWith('PUT /api/pages/') && call.endsWith('?status=published'))).toHaveLength(2);
    await expect(rows(page)).toHaveCount(4);
    await expect(page.getByRole('region', { name: 'Actions groupées' })).toHaveCount(0);
  });

  test('publication groupée en partie refusée : la page en défaut reste sélectionnée', async ({ page }) => {
    desktopOnly(page);
    await mockApi(page, { pageSet: 'many', failPublishFor: ['p-12'] });
    await page.goto('/pages?statut=brouillon');
    await page.getByRole('checkbox', { name: 'Tout sélectionner sur cette page' }).check();
    await page.getByRole('region', { name: 'Actions groupées' }).getByRole('button', { name: 'Publier', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: "« Déchetterie intercommunale » n'a pas pu être publiée" })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Actions groupées' })).toContainText('1 page sélectionnée');
  });

  test('dépublier : retiré du site, gardé en brouillon', async ({ page }) => {
    desktopOnly(page);
    const { calls } = await mockApi(page, { pageSet: 'many' });
    await page.goto('/pages');
    await page.getByRole('checkbox', { name: 'Sélectionner « La mairie et ses horaires »' }).check();
    await page.getByRole('region', { name: 'Actions groupées' }).getByRole('button', { name: 'Dépublier' }).click();
    await expect(page.getByRole('status').filter({ hasText: '1 page retirée du site, gardée en brouillon.' })).toBeVisible();
    expect(calls).toContain('POST /api/publication/pages/p-1/unpublish');
    await expect(row(page, 'La mairie et ses horaires')).toContainText('Brouillon');
  });

  test('suppression depuis le menu ⋯ : confirmation, focus sur Annuler', async ({ page }) => {
    const { calls } = await mockApi(page, { pageSet: 'many' });
    await page.goto('/pages');
    await page.getByRole('button', { name: 'Actions pour « La mairie et ses horaires »' }).click();
    await page.getByRole('menuitem', { name: 'Supprimer' }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Supprimer « La mairie et ses horaires » ?' });
    await expect(dialog).toContainText('La page disparaîtra du site à la prochaine mise en ligne.');
    await expect(dialog.getByRole('button', { name: 'Annuler' })).toBeFocused();
    await dialog.getByRole('button', { name: 'Supprimer' }).click();
    await expect(page.getByRole('status').filter({ hasText: '« La mairie et ses horaires » a été supprimée.' })).toBeVisible();
    expect(calls).toContain('DELETE /api/pages/p-1');
    await expect(page.getByRole('link', { name: 'La mairie et ses horaires' })).toHaveCount(0);
  });

  test('dupliquer : copie en brouillon, ouverte dans l’éditeur', async ({ page }) => {
    const { bodies } = await mockApi(page, { pageSet: 'many' });
    await page.goto('/pages');
    await page.getByRole('button', { name: 'Actions pour « Location de la salle des fêtes »' }).click();
    await page.getByRole('menuitem', { name: 'Dupliquer' }).click();
    await expect(page).toHaveURL(/\/pages\/p-nouvelle$/);
    expect(bodies.at(-1)).toMatchObject({ call: 'POST draft', body: { data: { title: 'Location de la salle des fêtes (copie)', show_in_menu: false } } });
    expect(bodies.at(-1)!.body.data).not.toHaveProperty('slug');
  });

  test('« Voir sur le site » seulement pour une page en ligne', async ({ page }) => {
    await mockApi(page, { pageSet: 'many' });
    await page.goto('/pages');
    await page.getByRole('button', { name: 'Actions pour « La mairie et ses horaires »' }).click();
    await expect(page.getByRole('menuitem', { name: 'Voir sur le site' })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.goto('/pages?statut=brouillon');
    await page.getByRole('button', { name: 'Actions pour « Jardins familiaux »' }).click();
    await expect(page.getByRole('menuitem', { name: 'Modifier' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Voir sur le site' })).toHaveCount(0);
  });
});

test.describe('mobile', () => {
  test('cartes et bouton principal fixé en bas', async ({ page }) => {
    test.skip(!isMobile(page), 'mobile seulement');
    await mockApi(page, { pageSet: 'many' });
    await page.goto('/pages');
    await expect(page.getByRole('table')).toBeHidden();
    const card = page.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'La mairie et ses horaires' }) });
    await expect(card).toContainText('Publié');
    const button = page.getByRole('link', { name: 'Nouvelle page' });
    await expect(button).toBeVisible();
    const box = (await button.boundingBox())!;
    expect(box.y + box.height).toBeGreaterThan(844 - 40);
    await expectNoViolations(page);
  });
});
