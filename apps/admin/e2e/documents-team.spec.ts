/**
 * Documents officiels et équipe municipale (#139) : onglets par année et liste compacte qui tiennent
 * avec 300 documents, formulaire avec fichier principal obligatoire et annexes ; équipe par groupes,
 * ordre, fiche en panneau latéral avec photo facultative.
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;
const tabs = (page: Page) => page.getByRole('navigation', { name: 'Année' });
const pagination = (page: Page) => page.getByRole('navigation', { name: 'Pagination' });
const PDF = { name: 'deliberation-042.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF\n') };

test.describe('documents officiels', () => {
  test('300 documents : l’année la plus récente, compacte, sans violation', async ({ page }) => {
    await mockApi(page, { documentSet: 'many' });
    await page.goto('/documents');
    await expect(tabs(page).getByRole('button', { name: '2026 (38 documents)' })).toHaveAttribute('aria-current', 'true');
    await expect(tabs(page).getByRole('button', { name: 'Plus anciens (100 documents)' })).toBeVisible();
    await expect(pagination(page)).toContainText('1–38 sur 38');
    await expect(page.getByText('300 documents')).toBeVisible();
    await expectNoViolations(page);
  });

  test('onglets, pages de 50, plus anciens, toutes les années, recherche', async ({ page }) => {
    test.skip(isMobile(page), 'pagination détaillée : tableau');
    await mockApi(page, { documentSet: 'many' });
    await page.goto('/documents');
    await tabs(page).getByRole('button', { name: /^2025/ }).click();
    await expect(page).toHaveURL(/annee=2025/);
    await expect(pagination(page)).toContainText('1–50 sur 61');
    await pagination(page).getByRole('button', { name: 'Page 2' }).click();
    await expect(pagination(page)).toContainText('51–61 sur 61');

    await tabs(page).getByRole('button', { name: /^Plus anciens/ }).click();
    await expect(pagination(page)).toContainText('1–50 sur 100');
    await page.getByRole('searchbox', { name: 'Rechercher un document' }).fill('SDIS');
    await expect(pagination(page)).toContainText('sur 4');

    await page.getByRole('button', { name: 'Effacer la recherche' }).click();
    await tabs(page).getByRole('button', { name: 'Toutes les années' }).click();
    await expect(pagination(page)).toContainText('1–50 sur 300');
    await expect(page.getByRole('table').getByRole('columnheader', { name: 'Date' })).toHaveAttribute('aria-sort', 'descending');
  });

  test('filtre par type, fichier et référence en colonnes', async ({ page }) => {
    test.skip(isMobile(page), 'tableau');
    await mockApi(page, { documentSet: 'many' });
    await page.goto('/documents?annee=toutes');
    await page.getByRole('button', { name: 'Type' }).click();
    await page.getByRole('menuitemradio', { name: 'Arrêté' }).click();
    await expect(page).toHaveURL(/type=arrete/);
    const first = page.getByRole('table').locator('tbody tr').first();
    await expect(first).toContainText('Arrêté');
    await expect(first).toContainText('PDF · 310 Ko');
  });

  test('nouveau document : fichier obligatoire, formats vérifiés, annexes, année calculée', async ({ page }) => {
    const { bodies, posts } = await mockApi(page);
    await page.clock.install();
    await page.goto('/documents/nouvelle');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nouveau document');
    await page.getByRole('textbox', { name: 'Titre', exact: true }).fill('Délibération 2026-042 — Approbation du PLU');
    await page.getByRole('combobox', { name: /^Type/ }).selectOption({ label: 'Délibération' });
    await page.getByLabel(/^Date du document/).fill('2026-09-22');
    await expect(page.locator('#annee-calculee')).toHaveValue('2026');

    await page.getByRole('button', { name: 'Publier', exact: true }).click();
    const summary = page.getByRole('alert').filter({ hasText: '1 erreur empêche la publication' });
    await expect(summary).toContainText('Joignez le fichier principal');
    await summary.getByRole('link', { name: 'Joignez le fichier principal' }).click();
    await expect(page.getByRole('button', { name: 'Fichier principal (obligatoire) : choisir un fichier' })).toBeFocused();

    await page.locator('#champ-file-fichier').setInputFiles({ name: 'virus.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ') });
    await expect(page.locator('#champ-file-erreur')).toHaveText('virus.exe : Format non accepté : PDF, Word, Excel ou OpenDocument.');
    expect(posts['upload'] ?? []).toHaveLength(0);

    await page.locator('#champ-file-fichier').setInputFiles(PDF);
    await expect(page.getByRole('link', { name: 'deliberation-042.pdf' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remplacer deliberation-042.pdf' })).toBeVisible();
    await page.locator('#champ-additional_files-fichier').setInputFiles({ ...PDF, name: 'rapport-enqueteur.pdf' });
    await expect(page.getByRole('link', { name: 'rapport-enqueteur.pdf' })).toBeVisible();
    await expectNoViolations(page);

    await page.getByRole('button', { name: 'Publier', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'est publié.' })).toBeVisible();
    const sent = bodies.filter((entry) => entry.type === 'official-documents').at(-1)!;
    expect(sent.call).toBe('POST published');
    expect(sent.body.data).toMatchObject({ document_type: 'deliberation', document_date: '2026-09-22', year: 2026, file: 1001, additional_files: [1002] });
  });
});

test.describe('équipe municipale', () => {
  const group = (page: Page, name: string) => page.getByRole('list', { name });

  test('groupes, sans violation ; équipe vide : aide et premier ajout', async ({ page }) => {
    await mockApi(page);
    await page.goto('/equipe');
    await expect(page.getByText('3 élus · 0 service')).toBeVisible();
    await expect(group(page, 'Adjoints').getByRole('listitem')).toHaveCount(2);
    await expect(group(page, 'Adjoints')).toContainText('1er adjoint · Vie associative, sports');
    await expectNoViolations(page);

    await mockApi(page, { emptyTeam: true });
    await page.goto('/equipe');
    await expect(page.getByRole('heading', { level: 2, name: "Présentez l'équipe municipale" })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ajouter le maire' })).toBeVisible();
  });

  test('ordre : descendre enregistre les positions, annoncé, focus conservé', async ({ page }) => {
    const { bodies } = await mockApi(page);
    await page.goto('/equipe');
    await page.getByRole('button', { name: 'Descendre Julien Morel' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Julien Morel : position 2 sur 2 du groupe Adjoints.' })).toBeAttached();
    await expect(group(page, 'Adjoints').locator('li p.font-semibold')).toHaveText(['Anne Rousseau', 'Julien Morel']);
    await expect(page.getByRole('button', { name: 'Monter Julien Morel' })).toBeFocused();
    await expect.poll(() => bodies.filter((entry) => entry.call === 'PUT team').map((entry) => entry.body.data)).toEqual([{ display_order: 10 }, { display_order: 20 }]);
  });

  test('ajouter un adjoint avec photo : fin du groupe', async ({ page }) => {
    const { bodies } = await mockApi(page);
    await page.goto('/equipe');
    await page.getByRole('button', { name: 'Ajouter dans « Adjoints »' }).click();
    const sheet = page.getByRole('dialog', { name: 'Nouvelle personne' });
    await expect(sheet.getByRole('combobox', { name: /^Rôle/ })).toHaveValue('adjoint');
    await sheet.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(sheet.getByRole('alert').filter({ hasText: '2 champs à corriger' })).toBeFocused();
    await sheet.getByRole('textbox', { name: /^Prénom/ }).fill('Pierre');
    await sheet.getByRole('textbox', { name: /^Nom/ }).fill('Bernard');
    await sheet.getByRole('textbox', { name: /^Délégation/ }).fill('Travaux, voirie');
    await sheet.locator('#champ-photo-fichier').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('png') });
    await expect(sheet.getByRole('link', { name: 'photo.png' })).toBeVisible();
    await expectNoViolations(page);
    await sheet.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(sheet).toBeHidden();
    expect(bodies.filter((entry) => entry.call === 'POST team').at(-1)!.body.data).toMatchObject({ first_name: 'Pierre', last_name: 'Bernard', role: 'adjoint', delegation: 'Travaux, voirie', photo: 1001, display_order: 30 });
    await expect(group(page, 'Adjoints').locator('li').last()).toContainText('Pierre Bernard');
  });

  test('fiche modifiée puis fermée : confirmation ; suppression', async ({ page }) => {
    const { team } = await mockApi(page);
    await page.goto('/equipe');
    await page.getByRole('button', { name: 'Modifier la fiche de Anne Rousseau' }).click();
    const sheet = page.getByRole('dialog', { name: 'Anne Rousseau' });
    await sheet.getByRole('textbox', { name: /^Permanence/ }).fill('Mercredi 14 h – 16 h');
    await page.keyboard.press('Escape');
    const confirm = page.getByRole('alertdialog', { name: 'Fermer sans enregistrer ?' });
    await confirm.getByRole('button', { name: 'Continuer la saisie' }).click();
    await expect(sheet.getByRole('textbox', { name: /^Permanence/ })).toHaveValue('Mercredi 14 h – 16 h');

    await sheet.getByRole('button', { name: 'Supprimer' }).click();
    await page.getByRole('alertdialog', { name: 'Supprimer « Anne Rousseau » ?' }).getByRole('button', { name: 'Supprimer' }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByRole('status').filter({ hasText: 'La fiche de Anne Rousseau a été supprimée.' })).toBeVisible();
    expect(team.map((member) => member.documentId)).not.toContain('t-rousseau');
  });
});
