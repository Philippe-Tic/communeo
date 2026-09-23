/**
 * Éditeur de page (#135, 2/2) : création au premier enregistrement, enregistrement automatique,
 * publication validée, programmation, suppression, départ de la page.
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi, type MockOptions } from './api';
import { expectNoViolations } from './axe';

const title = (page: Page) => page.getByRole('textbox', { name: 'Titre', exact: true });
const saves = (calls: string[]) => calls.filter((call) => /^(POST|PUT) \/api\/pages/.test(call));

async function open(page: Page, path: string, options: MockOptions = {}) {
  await page.clock.install();
  const mock = await mockApi(page, { publication: 'ok', ...options });
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  return mock;
}

test('sans violation : éditeur, bloc ouvert, fenêtre de programmation', async ({ page }) => {
  await open(page, '/pages/p-salle');
  await expect(title(page)).toHaveValue('Location de la salle des fêtes');
  await expectNoViolations(page);
  await page.getByRole('button', { name: /^Texte, position 1 sur 2/ }).click();
  await expectNoViolations(page);
  await page.getByRole('button', { name: 'Programmer' }).click();
  await expect(page.getByRole('dialog', { name: 'Programmer la publication' })).toBeVisible();
  await expectNoViolations(page);
});

test('nouvelle page : adresse générée, créée au premier enregistrement sans perdre la saisie', async ({ page }) => {
  const { calls } = await open(page, '/pages/nouvelle');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nouvelle page');
  // Rien n'est créé tant que la page n'a pas de titre
  await page.clock.fastForward(6000);
  expect(saves(calls)).toEqual([]);

  await title(page).fill('Horaires de la médiathèque');
  await expect(page.locator('#champ-slug')).toHaveValue('horaires-de-la-mediatheque');
  await page.clock.fastForward(5500);
  await expect(page).toHaveURL(/\/pages\/p-nouvelle$/);
  expect(saves(calls)).toEqual(['POST /api/pages']);
  await expect(title(page)).toBeFocused();
  await expect(page.getByText(/Brouillon enregistré/)).toBeVisible();
  // La saisie continue dans le même éditeur
  await page.keyboard.type(' municipale');
  await expect(title(page)).toHaveValue('Horaires de la médiathèque municipale');
});

test('enregistrement automatique : au plus toutes les 5 s, blocs sans identifiants', async ({ page }) => {
  const { calls, bodies } = await open(page, '/pages/p-salle');
  await expect(page.getByRole('status').filter({ hasText: 'Publié' }).or(page.getByText('Publié', { exact: true }))).toBeVisible();
  await title(page).fill('Location de la grande salle');
  await page.clock.fastForward(2000);
  await page.getByRole('textbox', { name: 'Chapô (facultatif)' }).fill('Jusqu’à 180 personnes assises.');
  await page.clock.fastForward(3500);
  await expect.poll(() => saves(calls)).toEqual(['PUT /api/pages/p-salle']);
  const sent = bodies[0]!.body.data;
  expect(sent.title).toBe('Location de la grande salle');
  expect(sent.lead).toBe('Jusqu’à 180 personnes assises.');
  // Page déjà publiée : l'adresse ne suit pas le titre
  expect(sent.slug).toBe('location-salle-des-fetes');
  expect(JSON.stringify(sent.blocks)).not.toContain('"id"');
  // Pas de nouvel enregistrement sans modification
  await page.clock.fastForward(10_000);
  expect(saves(calls)).toHaveLength(1);
});

test('publier : erreurs d’abord, puis une seule publication', async ({ page }) => {
  const { calls } = await open(page, '/pages/p-salle');
  await title(page).fill('');
  await page.getByRole('button', { name: 'Publier', exact: true }).click();
  const summary = page.getByRole('alert').filter({ hasText: 'empêche' });
  await expect(summary.getByRole('link')).toHaveText(['Le titre est obligatoire']);
  expect(calls.filter((call) => call.includes('status=published'))).toEqual([]);

  await title(page).fill('Location de la salle des fêtes');
  await page.getByRole('button', { name: 'Publier', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '« Location de la salle des fêtes » est publiée. Votre site sera mis à jour dans quelques instants.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publié', exact: true })).toBeVisible();
  expect(calls.filter((call) => call.includes('status=published'))).toEqual(['PUT /api/pages/p-salle?status=published']);
  // La publication vaut enregistrement : pas d'autosave derrière
  await page.clock.fastForward(6000);
  expect(saves(calls)).toEqual(['PUT /api/pages/p-salle?status=published']);
});

test('programmer : date passée refusée, puis date future', async ({ page }) => {
  const { bodies } = await open(page, '/pages/p-salle');
  await page.getByRole('button', { name: 'Programmer' }).click();
  const dialog = page.getByRole('dialog', { name: 'Programmer la publication' });
  await dialog.locator('#champ-day').fill('2020-01-01');
  await dialog.getByRole('button', { name: 'Programmer' }).click();
  await expect(dialog.getByRole('alert')).toContainText('La date de publication doit être dans le futur');

  const future = new Date(Date.now() + 3 * 86_400_000);
  const day = future.toISOString().slice(0, 10);
  await dialog.locator('#champ-day').fill(day);
  await dialog.getByRole('group', { name: /^Heure/ }).getByLabel('Heures').selectOption('08');
  await expect(dialog.getByText(/^Publication le .* à 8 h 00 \(heure de Paris\)\.$/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Programmer' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(/^Programmé le .* à 8h$/)).toBeVisible();
  const sent = bodies.at(-1)!;
  expect(sent.call).toBe('PUT draft');
  // 8 h à Paris = 6 h ou 7 h UTC selon la saison
  expect(new Date(sent.body.data.scheduled_at as string).getUTCHours()).toBeGreaterThanOrEqual(6);
});

test('quitter la page enregistre d’abord ; si l’enregistrement échoue, une fenêtre le dit', async ({ page }) => {
  const { calls } = await open(page, '/pages/p-salle');
  await title(page).fill('Location de la salle');
  await page.getByRole('link', { name: 'Retour aux pages' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Pages' })).toBeVisible();
  expect(saves(calls)).toEqual(['PUT /api/pages/p-salle']);
});

test("échec d'enregistrement : état affiché, départ bloqué par la fenêtre", async ({ page }) => {
  await open(page, '/pages/p-salle', { failPageSaves: true });
  await title(page).fill('Location de la salle');
  await page.clock.fastForward(5500);
  await expect(page.getByText('Brouillon non enregistré')).toBeVisible();
  await page.getByRole('link', { name: 'Retour aux pages' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Modifications non enregistrées' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Rester' }).click();
  await expect(title(page)).toHaveValue('Location de la salle');
});

test('supprimer : confirmation, puis retour à la liste', async ({ page }) => {
  const { calls } = await open(page, '/pages/p-salle');
  await page.getByRole('button', { name: 'Autres actions' }).click();
  await page.getByRole('menuitem', { name: 'Supprimer' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Supprimer « Location de la salle des fêtes » ?' });
  await expect(dialog.getByRole('button', { name: 'Annuler' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Supprimer' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Pages' })).toBeVisible();
  expect(calls).toContain('DELETE /api/pages/p-salle');
});
