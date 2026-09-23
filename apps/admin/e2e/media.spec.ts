/**
 * Médiathèque (#142, handoff 6.11) : dossiers, grille / liste, filtre « Sans texte alternatif »,
 * envois multiples avec progression, fiche du fichier (texte alternatif obligatoire pour une image,
 * légende, crédit, dossier, « Utilisé dans N contenus »), suppression d'un fichier utilisé refusée.
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

const tile = (page: Page, name: string) =>
  page.getByRole('button', { name: new RegExp(`^${name.replace('.', '\\.')},`) });
/** La fiche : colonne à droite (≥ 1280 px) ou panneau latéral */
const panel = (page: Page) =>
  (page.viewportSize()?.width ?? 1440) >= 1280
    ? page.getByRole('complementary', { name: 'Fichier sélectionné' })
    : page.getByRole('dialog', { name: 'Fichier' });
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

test('dossiers, compteurs, alt manquant signalé, sans violation', async ({ page }) => {
  await mockApi(page);
  await page.goto('/mediatheque');
  await expect(page.getByRole('heading', { level: 1, name: 'Médiathèque' })).toBeVisible();
  await expect(page.getByText('5 fichiers · 5,9 Mo')).toBeVisible();
  const folders = page.getByRole('navigation', { name: 'Dossiers' });
  await expect(folders.getByRole('button')).toContainText([
    'Tous les fichiers5',
    'Bâtiments1',
    'Documents officiels1',
    'Événements1',
    'Logos et blasons1',
  ]);
  await expect(tile(page, 'forum-associations.jpg')).toHaveAccessibleName(/texte alternatif manquant/);
  await expect(tile(page, 'salle-des-fetes-exterieur.jpg')).not.toHaveAccessibleName(/manquant/);
  await expect(page.getByRole('button', { name: 'Sans texte alternatif · 2' })).toBeVisible();
  await expectNoViolations(page);
  // Pas de défilement horizontal (la rangée de dossiers ne doit pas élargir la page sur mobile)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );

  await folders.getByRole('button', { name: /^Bâtiments/ }).click();
  await expect(page).toHaveURL(/dossier=/);
  await expect(page.getByRole('status').filter({ hasText: '1 fichier dans « Bâtiments »' })).toBeVisible();
});

test('filtre « Sans texte alternatif », type, recherche, vue liste', async ({ page }) => {
  await mockApi(page);
  await page.goto('/mediatheque');
  await page.getByRole('button', { name: 'Sans texte alternatif · 2' }).click();
  await expect(page.getByRole('list', { name: 'Fichiers de la médiathèque' }).getByRole('listitem')).toHaveCount(2);
  await page.getByRole('button', { name: 'Sans texte alternatif · 2' }).click();
  await page.getByRole('button', { name: 'Type' }).click();
  await page.getByRole('menuitemradio', { name: 'Documents' }).click();
  await expect(page.getByRole('list', { name: 'Fichiers de la médiathèque' }).getByRole('listitem')).toHaveCount(1);
  await page.getByRole('button', { name: 'Retirer le filtre Type : Documents' }).click();
  await page.getByRole('searchbox', { name: 'Rechercher un fichier' }).fill('salle');
  await expect(page.getByRole('list', { name: 'Fichiers de la médiathèque' }).getByRole('listitem')).toHaveCount(2);
  await page.getByRole('radio', { name: 'Liste' }).click();
  await expect(page.getByRole('table').getByRole('columnheader')).toHaveText([
    'Nom',
    'Format',
    'Dimensions',
    'Envoyé le',
  ]);
  await expect(page.getByRole('table')).toContainText('1600 × 1067');
});

test('fiche : texte alternatif obligatoire, légende, crédit, dossier ; usages en liens', async ({ page }) => {
  const { bodies } = await mockApi(page);
  await page.goto('/mediatheque');
  await tile(page, 'forum-associations.jpg').click();
  const sheet = panel(page);
  await expect(sheet).toContainText('JPG · 1,2 Mo · 1600 × 1067 · envoyé le');
  await expect(sheet).toContainText('Utilisé dans aucun contenu');
  await sheet.getByRole('textbox', { name: /^Légende/ }).fill('Forum 2026');
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(sheet.getByText("Décrivez l'image : le texte alternatif est obligatoire.")).toBeVisible();
  await expect(sheet.getByRole('textbox', { name: /^Texte alternatif/ })).toBeFocused();
  await sheet
    .getByRole('textbox', { name: /^Texte alternatif/ })
    .fill('Stands des associations dans la salle omnisports');
  await sheet.getByRole('textbox', { name: /^Crédit/ }).fill('J. Martin');
  await sheet.getByRole('combobox', { name: 'Dossier' }).fill('Événements 2026');
  await expectNoViolations(page);
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: '« forum-associations.jpg » est enregistré.' }),
  ).toBeVisible();
  expect(bodies.find((entry) => entry.call === 'PUT media mi-2')!.body.data).toEqual({
    alt_text: 'Stands des associations dans la salle omnisports',
    caption: 'Forum 2026',
    credit: 'J. Martin',
    folder: 'Événements 2026',
  });
  // Panneau latéral (modal) sous 1280 px : fermé pour revenir à la liste
  if ((page.viewportSize()?.width ?? 1440) < 1280) await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Sans texte alternatif · 1' })).toBeVisible();

  await tile(page, 'salle-des-fetes-exterieur.jpg').click();
  await expect(panel(page)).toContainText('Utilisé dans 2 contenus');
  await expect(panel(page).getByRole('link', { name: 'Page — Location de la salle des fêtes' })).toHaveAttribute(
    'href',
    '/pages/p-salle',
  );
});

test('supprimer : un fichier utilisé est refusé, un fichier libre supprimé', async ({ page }) => {
  const { library } = await mockApi(page);
  await page.goto('/mediatheque');
  await tile(page, 'salle-des-fetes-exterieur.jpg').click();
  await panel(page).getByRole('button', { name: 'Supprimer « salle-des-fetes-exterieur.jpg »' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Supprimer « salle-des-fetes-exterieur.jpg » ?' });
  await expect(confirm).toContainText('utilisé dans 2 contenus : il ne peut pas être supprimé');
  await confirm.getByRole('button', { name: 'Supprimer' }).click();
  await expect(page.getByRole('alert').filter({ hasText: "Le fichier n'a pas été supprimé" })).toBeVisible();
  expect(library.map((item) => item.name)).toContain('salle-des-fetes-exterieur.jpg');

  await page
    .getByRole('button', { name: /Fermer la notification/ })
    .last()
    .click();
  if ((page.viewportSize()?.width ?? 1440) < 1280) await page.keyboard.press('Escape');
  await tile(page, 'reglement-salle.pdf').click();
  await panel(page).getByRole('button', { name: 'Supprimer « reglement-salle.pdf »' }).click();
  await page
    .getByRole('alertdialog', { name: 'Supprimer « reglement-salle.pdf » ?' })
    .getByRole('button', { name: 'Supprimer' })
    .click();
  await expect(page.getByRole('status').filter({ hasText: '« reglement-salle.pdf » a été supprimé.' })).toBeVisible();
  expect(library.map((item) => item.name)).not.toContain('reglement-salle.pdf');
});

test('envoi multiple : progression, dossier courant, fichier refusé expliqué', async ({ page }) => {
  const { posts } = await mockApi(page, { failUploadFor: 'faux.png' });
  await page.goto('/mediatheque?dossier=B%C3%A2timents');
  await page.locator('input[type=file][multiple]').setInputFiles([
    { name: 'mairie.png', mimeType: 'image/png', buffer: PNG },
    { name: 'faux.png', mimeType: 'image/png', buffer: PNG },
    { name: 'virus.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ') },
  ]);
  const banner = page.getByRole('region', { name: 'Envois' });
  await expect(banner).toContainText('1 sur 3 terminé');
  await expect(banner.getByRole('alert').filter({ hasText: 'Format non accepté' })).toBeVisible();
  await expect(
    banner.getByRole('alert').filter({ hasText: 'Le contenu du fichier ne correspond pas à un fichier PNG.' }),
  ).toBeVisible();
  expect((posts['upload'] as Array<{ name: string }>).map((file) => file.name)).toEqual(
    expect.arrayContaining(['mairie.png', 'faux.png']),
  );
  await expect(tile(page, 'mairie.png')).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: '2 fichiers dans « Bâtiments »' })).toBeVisible();
});

test('médiathèque vide : grande zone de dépôt, formats et poids', async ({ page }) => {
  await mockApi(page, { mediaSet: 'none' });
  await page.goto('/mediatheque');
  await expect(page.getByRole('heading', { level: 2, name: 'Déposez vos images et documents ici' })).toBeVisible();
  await expect(page.getByText('JPG, PNG, SVG, PDF, Word et Excel. 20 Mo maximum par fichier.')).toBeVisible();
  await expectNoViolations(page);
});
