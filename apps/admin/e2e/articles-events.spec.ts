/**
 * Actualités et agenda (#138) : listes sur le gabarit commun, éditeur d'actualité (parcours A),
 * formulaire d'événement en sections (handoff 6.4) avec sommaire, dates sur plusieurs jours,
 * cohérence début / fin, tarif et inscription.
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi, type MockOptions } from './api';
import { expectNoViolations } from './axe';

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;
const title = (page: Page) => page.getByRole('textbox', { name: 'Titre', exact: true });
const writes = (bodies: Awaited<ReturnType<typeof mockApi>>['bodies'], type: string) => bodies.filter((entry) => entry.type === type);

async function open(page: Page, path: string, options: MockOptions = {}) {
  await page.clock.install();
  const mock = await mockApi(page, { publication: 'ok', ...options });
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  return mock;
}

test.describe('actualités', () => {
  test('liste sans violation, catégorie et auteur, filtre par catégorie', async ({ page }) => {
    await mockApi(page);
    await page.goto('/actualites');
    await expect(page.getByRole('heading', { level: 1, name: 'Actualités' })).toBeVisible();
    await expect(page.getByText('3 actualités · 1 brouillon · 1 programmée')).toBeVisible();
    await expectNoViolations(page);
    await page.getByRole('button', { name: 'Catégorie' }).click();
    await page.getByRole('menuitemradio', { name: 'Information' }).click();
    await expect(page).toHaveURL(/categorie=information/);
    await expect(page.getByRole('link', { name: 'Nouveaux horaires de la déchetterie' }).locator('visible=true')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Compte rendu du conseil municipal' }).locator('visible=true')).toHaveCount(0);
  });

  test('nouvelle actualité : catégorie, auteur prérempli, publication datée, ligne surlignée au retour', async ({ page }) => {
    test.skip(isMobile(page), 'tableau de la liste');
    const { bodies } = await open(page, '/actualites/nouvelle');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nouvelle actualité');
    await expect(page.getByRole('combobox', { name: /^Catégorie/ })).toHaveValue('news');
    await expect(page.getByRole('textbox', { name: /^Auteur/ })).toHaveValue('Sophie Leroy');
    await expect(page.getByText('Cette actualité est vide. Ajoutez un premier bloc.')).toBeVisible();

    await title(page).fill('Nouveaux horaires de la médiathèque');
    await page.getByRole('combobox', { name: /^Catégorie/ }).selectOption({ label: 'Information' });
    await page.getByRole('switch', { name: "Mettre à la une sur la page d'accueil" }).click();
    await page.clock.fastForward(5500);
    await expect(page).toHaveURL(/\/actualites\/a-nouvelle$/);
    expect(writes(bodies, 'articles')[0]!.body.data).toMatchObject({ title: 'Nouveaux horaires de la médiathèque', category: 'information', featured: true, author: 'Sophie Leroy', publication_date: null });

    await page.getByRole('button', { name: 'Publier', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: '« Nouveaux horaires de la médiathèque » est publiée.' })).toBeVisible();
    // La date posée à la publication est reprise dans le formulaire
    await expect(page.getByLabel(/^Date de publication affichée/)).not.toHaveValue('');

    await page.getByRole('link', { name: 'Retour aux actualités' }).click();
    const row = page.getByRole('table').locator('tbody tr[data-recent]');
    await expect(row).toContainText('Nouveaux horaires de la médiathèque');
    await expect(row).toContainText('Publié');
  });

  test('programmer une actualité', async ({ page }) => {
    const { bodies } = await open(page, '/actualites/a-conseil');
    await page.getByRole('button', { name: 'Programmer' }).click();
    const dialog = page.getByRole('dialog', { name: 'Programmer la publication' });
    const future = new Date(Date.now() + 3 * 86_400_000);
    await dialog.locator('#champ-day').fill(future.toISOString().slice(0, 10));
    await dialog.getByRole('group', { name: /^Heure/ }).getByLabel('Heures').selectOption('08');
    await dialog.getByRole('button', { name: 'Programmer' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(/^Programmé le .* à 8h$/)).toBeVisible();
    expect(writes(bodies, 'articles').at(-1)!.body.data.scheduled_at).toMatch(/T0[67]:00:00\.000Z$/);
    // Programmer ne publie pas : l'envoi du formulaire de la fenêtre n'atteint pas celui de l'éditeur
    expect(writes(bodies, 'articles').map((entry) => entry.call)).toEqual(['PUT draft']);
    await expect(page.getByText('Publié', { exact: true })).toHaveCount(0);
  });
});

test.describe('agenda', () => {
  test('liste : période à venir / passés, dates lisibles', async ({ page }) => {
    await mockApi(page);
    await page.goto('/agenda');
    await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();
    await expectNoViolations(page);
    await page.getByRole('button', { name: 'Période' }).click();
    await page.getByRole('menuitemradio', { name: 'À venir' }).click();
    await expect(page).toHaveURL(/periode=a-venir/);
    await expect(page.getByRole('link', { name: 'Fête de la musique' }).locator('visible=true')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forum des associations' }).locator('visible=true')).toHaveCount(0);
    await page.getByRole('button', { name: 'Période : À venir', exact: true }).click();
    await page.getByRole('menuitemradio', { name: 'Passés' }).click();
    await expect(page.getByRole('link', { name: 'Forum des associations' }).locator('visible=true')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Fête de la musique' }).locator('visible=true')).toHaveCount(0);
  });

  test('formulaire en sections sans violation, sommaire', async ({ page }) => {
    await open(page, '/agenda/e-fete');
    await expect(title(page)).toHaveValue('Fête de la musique');
    // Tarif « Free » (valeur V1) : Gratuit
    await expect(page.getByRole('radio', { name: 'Gratuit' })).toBeChecked();
    await expectNoViolations(page);
    if ((page.viewportSize()?.width ?? 1440) >= 1200) {
      const outline = page.getByRole('navigation', { name: 'Sommaire du formulaire' });
      await expect(outline.getByRole('link')).toHaveText(["L'événement", 'Dates et lieu', 'Tarif et inscription', 'Organisateur et contact', 'Description']);
    }
  });

  test('erreurs : récapitulatif, fin avant le début expliquée, sections marquées', async ({ page }) => {
    await open(page, '/agenda/nouvelle');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nouvel événement');
    await title(page).fill('Fête de la musique');
    await page.getByLabel(/^Début/).fill('2027-06-21');
    const start = page.getByRole('group', { name: /^Heure de début/ });
    await start.getByLabel('Heures').selectOption('19');
    await start.getByLabel('Minutes').selectOption('00');
    // Fin préremplie avec le début
    await expect(page.getByLabel(/^Fin/)).toHaveValue('2027-06-21');
    await page.getByLabel(/^Fin/).fill('2027-06-20');
    await page.getByRole('textbox', { name: /^E-mail de contact/ }).fill('comite@');
    await page.getByRole('button', { name: 'Publier', exact: true }).click();

    const summary = page.getByRole('alert').filter({ hasText: '3 erreurs empêchent la publication' });
    await expect(summary).toBeFocused();
    await expect(summary).toContainText('Choisissez une catégorie');
    await expect(summary).toContainText('La fin doit être après le début (lundi 21 juin à 19 h).');
    await expect(summary).toContainText("L'e-mail de contact n'est pas valide");
    await expect(page.getByRole('region', { name: /Dates et lieu/ })).toContainText('1 erreur');
    await expectNoViolations(page);
    if ((page.viewportSize()?.width ?? 1440) >= 1200) {
      await expect(page.getByRole('navigation', { name: 'Sommaire du formulaire' }).getByRole('link', { name: /Dates et lieu.*erreurs/ })).toBeVisible();
    }
    // Le lien du récapitulatif amène au champ
    await summary.getByRole('link', { name: /La fin doit être après le début/ }).click();
    await expect(page.getByLabel(/^Fin/)).toBeFocused();
  });

  test('plusieurs jours, montant, inscription : envoyé en heure de Paris', async ({ page }) => {
    const { bodies } = await open(page, '/agenda/nouvelle');
    await title(page).fill('Fête de la musique');
    await page.getByRole('combobox', { name: /^Catégorie/ }).selectOption({ label: 'Fête' });
    await page.getByLabel(/^Début/).fill('2027-06-21');
    const start = page.getByRole('group', { name: /^Heure de début/ });
    await start.getByLabel('Heures').selectOption('19');
    await start.getByLabel('Minutes').selectOption('00');
    await page.getByLabel(/^Fin/).fill('2027-06-22');
    await page.getByRole('group', { name: /^Heure de fin/ }).getByLabel('Heures').selectOption('01');

    await expect(page.getByRole('textbox', { name: /^Montant/ })).toHaveCount(0);
    await page.getByRole('radio', { name: 'Montant' }).check();
    await page.getByRole('button', { name: 'Publier', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: '1 erreur empêche la publication' })).toContainText('Indiquez le montant');
    await page.getByRole('textbox', { name: /^Montant/ }).fill('5 €');

    await page.getByRole('switch', { name: 'Inscription obligatoire' }).click();
    await page.getByLabel(/^Date limite d'inscription/).fill('2027-06-15');
    await page.getByRole('textbox', { name: /^Nombre de places/ }).fill('120');
    await page.getByRole('button', { name: 'Publier', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: '« Fête de la musique » est publié.' })).toBeVisible();

    const sent = writes(bodies, 'evenements').at(-1)!;
    expect(sent.call).toBe('POST published');
    expect(sent.body.data).toMatchObject({
      category: 'celebration',
      start_date: '2027-06-21T17:00:00.000Z',
      end_date: '2027-06-21T23:00:00.000Z',
      price: '5 €',
      registration_required: true,
      registration_deadline: '2027-06-15T21:59:00.000Z',
      max_participants: 120,
      scheduled_at: null,
    });
  });
});
