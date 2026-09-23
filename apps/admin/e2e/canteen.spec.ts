/**
 * Cantine (#141, handoff « 6.13 Cantine — mode détaillé ») : semaine, école, grille jour × plat
 * (cartes par jour sur mobile), plats et labels en popover, « Pas de cantine », plat principal
 * obligatoire, dupliquer la semaine précédente, publier ; mode simple (PDF).
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

const WEEK = '/cantine?semaine=2026-09-21';
const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;
/** Le bouton d'un plat (grille ou carte mobile, selon la largeur) */
const dish = (page: Page, label: string) =>
  page.getByRole('button', { name: new RegExp(`^${label} :`) }).locator('visible=true');

async function editDish(page: Page, label: string, name: string, labels: string[] = []) {
  await dish(page, label).click();
  const popover = page.getByRole('dialog', { name: label });
  await popover.getByRole('textbox', { name: 'Plat' }).fill(name);
  for (const item of labels) await popover.getByRole('checkbox', { name: item }).check();
  await popover.getByRole('button', { name: 'Valider' }).click();
  await expect(popover).toBeHidden();
}

test('semaine vide : grille, navigation, sans violation', async ({ page }) => {
  await mockApi(page);
  await page.goto(WEEK);
  await expect(page.getByRole('heading', { level: 1, name: 'Cantine' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Semaine' })).toContainText('Semaine du 21 au 25 septembre');
  await expect(page.getByText('Pas encore de menu pour cette semaine')).toBeAttached();
  await expect(page.getByRole('button', { name: 'Publier la semaine' })).toBeDisabled();
  await expectNoViolations(page);
  await page.getByRole('button', { name: 'Semaine suivante', exact: true }).click();
  await expect(page).toHaveURL(/semaine=2026-09-28/);
  await expect(page.getByRole('navigation', { name: 'Semaine' })).toContainText('Semaine du 28 septembre au 2 octobre');
});

test('saisir la semaine : plats, labels, jour sans cantine, plat principal obligatoire, publiée', async ({ page }) => {
  const { bodies } = await mockApi(page);
  await page.goto(WEEK);
  await editDish(page, 'Lundi, Entrée', 'Salade de tomates', ['Bio', 'Local']);
  await expect(dish(page, 'Lundi, Entrée')).toHaveAccessibleName(
    'Lundi, Entrée : Salade de tomates (Bio, Local). Modifier',
  );
  await editDish(page, 'Lundi, Plat', 'Sauté de bœuf');
  await editDish(page, 'Mardi, Plat', 'Lasagnes de légumes', ['Végétarien']);
  await editDish(page, 'Jeudi, Plat', 'Filet de poisson');
  await page.getByRole('checkbox', { name: 'Pas de cantine' }).locator('visible=true').nth(2).check();
  await expect(page.getByText('Menu non publié')).toBeAttached();

  // Vendredi ouvert sans plat : refusé, expliqué
  await page.getByRole('button', { name: 'Publier la semaine' }).click();
  const alert = page.getByRole('alert').filter({ hasText: 'sans plat' });
  await expect(alert).toBeFocused();
  await expect(alert).toContainText('Indiquez le plat du vendredi, ou cochez « Pas de cantine ».');
  await expect(dish(page, 'Vendredi, Plat')).toHaveAccessibleName(/plat obligatoire/);
  expect(bodies.filter((entry) => entry.call === 'POST menu')).toHaveLength(0);
  await expectNoViolations(page);

  await editDish(page, 'Vendredi, Plat', 'Poulet rôti');
  await expect(alert).toBeHidden();
  await page.getByRole('button', { name: 'Publier la semaine' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Menu de la semaine du 21 au 25 septembre publié.' }),
  ).toBeVisible();
  const sent = bodies.find((entry) => entry.call === 'POST menu')!.body.data;
  expect(sent).toMatchObject({
    week_start: '2026-09-21',
    school_name: null,
    menu_mode: 'manual',
    menu_pdf: null,
    menu_image: null,
  });
  const meals = sent.meals as Array<Record<string, unknown>>;
  expect(meals.map((meal) => meal.day)).toEqual(['lundi', 'mardi', 'jeudi', 'vendredi']);
  expect(meals[0]).toMatchObject({
    starter: 'Salade de tomates',
    main_course: 'Sauté de bœuf',
    labels: { starter: ['bio', 'local'] },
  });
  expect(meals[1]).toMatchObject({ main_course: 'Lasagnes de légumes', labels: { main: ['vegetarien'] } });
  await expect(page.getByText('Semaine publiée')).toBeAttached();
});

test('dupliquer la semaine précédente, puis changer de semaine : confirmation', async ({ page }) => {
  await mockApi(page);
  await page.goto(WEEK);
  await page.getByRole('button', { name: 'Dupliquer la semaine précédente' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Menu de la semaine précédente repris.' })).toBeVisible();
  await expect(dish(page, 'Lundi, Entrée')).toHaveAccessibleName('Lundi, Entrée : Carottes râpées (Bio). Modifier');
  await expect(dish(page, 'Jeudi, Plat')).toHaveAccessibleName('Jeudi, Plat : Omelette (Végétarien). Modifier');
  // Mercredi : pas de repas la semaine d'avant
  await expect(page.getByRole('checkbox', { name: 'Pas de cantine' }).locator('visible=true').nth(2)).toBeChecked();

  await page.getByRole('button', { name: 'Semaine précédente', exact: true }).click();
  await expect(page.getByRole('alertdialog', { name: 'Modifications non enregistrées' })).toBeVisible();
  await page.getByRole('button', { name: 'Rester' }).click();
  await expect(page).toHaveURL(/semaine=2026-09-21/);
});

test('école : menus séparés, choix dans la liste', async ({ page }) => {
  await mockApi(page);
  await page.goto(WEEK);
  const school = page.getByRole('combobox', { name: 'École' });
  await expect(school.getByRole('option')).toHaveText(['Toutes les écoles', 'École Jules-Ferry', 'Ajouter une école…']);
  await school.selectOption('École Jules-Ferry');
  await expect(page).toHaveURL(/ecole=/);
  await expect(dish(page, 'Lundi, Plat')).toHaveAccessibleName('Lundi, Plat : Couscous. Modifier');
  await expect(page.getByText('Semaine publiée')).toBeAttached();
});

test('mode simple : PDF obligatoire, envoyé comme menu_pdf', async ({ page }) => {
  const { bodies } = await mockApi(page);
  await page.goto(WEEK);
  await page.getByRole('radio', { name: 'Simple (PDF)' }).click();
  await page.getByRole('button', { name: 'Publier la semaine' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Joignez le menu' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choisir le fichier' })).toBeFocused();
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'menu-semaine.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF\n') });
  await expect(page.getByRole('link', { name: 'menu-semaine.pdf' })).toBeVisible();
  await page.getByRole('button', { name: 'Publier la semaine' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'publié' })).toBeVisible();
  expect(bodies.find((entry) => entry.call === 'POST menu')!.body.data).toMatchObject({
    menu_mode: 'image',
    menu_pdf: 1001,
    menu_image: null,
    meals: [],
  });
});

test('mobile : une carte par jour', async ({ page }) => {
  test.skip(!isMobile(page), 'sous 768 px');
  await mockApi(page);
  await page.goto(WEEK);
  await expect(page.getByRole('heading', { level: 2, name: 'Lundi 21 sept.' })).toBeVisible();
  await expect(page.getByRole('table')).toBeHidden();
  await expectNoViolations(page);
});

test('mobile : une erreur de publication ne recouvre pas la barre « Publier la semaine »', async ({ page }) => {
  test.skip(!isMobile(page), 'sous 768 px');
  await mockApi(page);
  await page.route('**/api/school-menus', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: { status: 500, message: 'Erreur serveur' } }),
        })
      : route.fallback(),
  );
  await page.goto(WEEK);
  await editDish(page, 'Lundi, Plat', 'Couscous');
  for (const day of [1, 2, 3, 4])
    await page.getByRole('checkbox', { name: 'Pas de cantine' }).locator('visible=true').nth(day).check();
  await page.getByRole('button', { name: 'Publier la semaine' }).click();
  await expect(page.getByRole('alert').filter({ hasText: "Le menu n'a pas pu être publié" })).toBeVisible();
  // Toujours cliquable : le toast est au-dessus de la barre
  await page.getByRole('button', { name: 'Publier la semaine' }).click({ trial: true, timeout: 2000 });
});
