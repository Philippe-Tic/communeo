/**
 * Kit de formulaires (#133), sur la page de référence /composants : libellés reliés, erreurs annoncées,
 * fenêtres de confirmation, notifications, garde des modifications non enregistrées.
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

/** Contrôle d'un champ du kit (id dérivé du nom du champ) */
const field = (page: Page, name: string) => page.locator(`#champ-${name}`);

async function open(page: Page) {
  await mockApi(page);
  await page.goto('/composants');
  await expect(page.getByRole('heading', { level: 1, name: 'Composants' })).toBeVisible();
}

test('sans violation, au repos, en erreur et en sombre', async ({ page }) => {
  await open(page);
  await expectNoViolations(page);
  await page.getByRole('button', { name: 'Publier', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'empêchent la publication' })).toBeVisible();
  await expectNoViolations(page);
  // Mode sombre du système (la bascule est dans le tiroir sur mobile)
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.waitForTimeout(300); // fin de la transition de couleurs
  await expectNoViolations(page);
});

test('chaque champ a un libellé relié', async ({ page }) => {
  await open(page);
  await page.getByRole('group', { name: /^Tarif/ }).getByRole('radio', { name: 'Montant' }).check();
  const unnamed = await page.locator('main').locator('input, select, textarea, [role="switch"]').evaluateAll((controls) =>
    controls
      // Champ natif caché que Radix ajoute à l'interrupteur (aria-hidden, hors tabulation)
      .filter((control) => control.getAttribute('aria-hidden') !== 'true')
      .filter((control) => {
        const labelled = (control as HTMLInputElement).labels?.length || control.getAttribute('aria-label') || control.getAttribute('aria-labelledby');
        return !labelled;
      })
      .map((control) => control.outerHTML.slice(0, 120)),
  );
  expect(unnamed).toEqual([]);
  // Libellés utilisables pour atteindre les contrôles
  await expect(page.getByRole('textbox', { name: 'Titre', exact: true })).toBeVisible();
  await expect(page.getByRole('switch', { name: "Mettre à la une sur la page d'accueil" })).toBeVisible();
  await expect(page.getByRole('group', { name: /Heure de début/ }).getByLabel('Minutes')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Montant (€)', exact: true })).toBeVisible();
  // Obligatoire : astérisque expliqué en tête de formulaire et aria-required ; facultatif : dans le libellé
  await expect(page.getByText("Les champs marqués d'un astérisque (*) sont obligatoires.")).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Titre', exact: true })).toHaveAttribute('aria-required', 'true');
  await expect(page.getByRole('textbox', { name: 'Description (facultatif)' })).toBeVisible();
});

test('les erreurs sont annoncées, reliées aux champs et atteignables depuis le récapitulatif', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Publier', exact: true }).click();

  const summary = page.getByRole('alert').filter({ hasText: 'empêchent la publication' });
  await expect(summary).toBeFocused();
  await expect(summary).toContainText('5 erreurs empêchent la publication');
  await expect(summary.getByRole('link')).toHaveText([
    'Le titre est obligatoire',
    'Choisissez une catégorie',
    'La date de début est obligatoire',
    'La date de fin est obligatoire',
    "Confirmez l'exactitude des informations",
  ]);

  const title = page.getByRole('textbox', { name: 'Titre', exact: true });
  await expect(title).toHaveAttribute('aria-invalid', 'true');
  await expect(title).toHaveAccessibleDescription('Le titre est obligatoire');
  await summary.getByRole('link', { name: 'Choisissez une catégorie' }).click();
  await expect(page.getByRole('combobox', { name: 'Catégorie', exact: true })).toBeFocused();

  // Nombre d'erreurs par section, repris dans le titre de la section
  await expect(page.getByRole('heading', { level: 2, name: "L'événement 2 erreurs" })).toBeVisible();

  // Correction à la saisie
  await title.fill('Fête de la musique');
  await expect(title).not.toHaveAttribute('aria-invalid');
  await expect(summary.getByRole('link')).toHaveCount(4);
});

test("l'erreur de cohérence des dates apparaît avec les autres, dès la première tentative", async ({ page }) => {
  await open(page);
  await field(page, 'startDate').fill('2026-06-21');
  await field(page, 'endDate').fill('2026-06-20');
  await page.getByRole('button', { name: 'Publier', exact: true }).click();
  const summary = page.getByRole('alert').filter({ hasText: 'empêchent la publication' });
  await expect(summary.getByRole('link')).toHaveText([
    'Le titre est obligatoire',
    'Choisissez une catégorie',
    'La date de fin doit être après la date de début',
    "Confirmez l'exactitude des informations",
  ]);
});

test('cohérence des dates, montant conditionnel et e-mail', async ({ page }) => {
  await open(page);
  await page.getByRole('textbox', { name: 'Titre', exact: true }).fill('Fête de la musique');
  await page.getByRole('combobox', { name: 'Catégorie', exact: true }).selectOption('fête');
  await field(page, 'startDate').fill('2026-06-21');
  await page.getByRole('group', { name: /Heure de début/ }).getByLabel('Heures').selectOption('19');
  await expect(page.getByRole('group', { name: /Heure de début/ }).getByLabel('Minutes').locator('option')).toHaveText(['--', '00', '15', '30', '45']);
  await field(page, 'endDate').fill('2026-06-20');
  await page.getByRole('group', { name: /^Tarif/ }).getByRole('radio', { name: 'Montant' }).check();
  await page.getByRole('textbox', { name: 'E-mail de contact (facultatif)' }).fill('pas-un-email');
  await page.getByRole('checkbox', { name: "Je confirme l'exactitude des informations" }).check();
  await page.getByRole('button', { name: 'Publier', exact: true }).click();

  await expect(field(page, 'endDate')).toHaveAccessibleDescription(/La date de fin doit être après la date de début/);
  await expect(page.getByRole('textbox', { name: 'Montant (€)', exact: true })).toHaveAccessibleDescription('Indiquez le montant en euros (par exemple 5 ou 7,50)');
  await expect(page.getByRole('textbox', { name: 'E-mail de contact (facultatif)' })).toHaveAccessibleDescription("L'e-mail de contact n'est pas valide");
  // L'aide reste lue avec l'erreur
  await expect(field(page, 'endDate')).toHaveAccessibleDescription(/Un événement peut durer plusieurs jours/);
});

test('publication réussie : notification annoncée', async ({ page }) => {
  await open(page);
  await page.getByRole('textbox', { name: 'Titre', exact: true }).fill('Fête de la musique');
  await page.getByRole('combobox', { name: 'Catégorie', exact: true }).selectOption('fête');
  await field(page, 'startDate').fill('2026-06-21');
  await field(page, 'endDate').fill('2026-06-21');
  await page.getByRole('checkbox', { name: "Je confirme l'exactitude des informations" }).check();
  await page.getByRole('button', { name: 'Publier', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '« Fête de la musique » est publié.' })).toBeVisible();
  await page.getByRole('button', { name: 'Fermer la notification' }).click();
  await expect(page.getByText('« Fête de la musique » est publié.')).toHaveCount(0);
});

test('suppression : alertdialog, focus sur Annuler, Échap rend le focus', async ({ page }) => {
  await open(page);
  const trigger = page.getByRole('button', { name: 'Supprimer', exact: true });
  await trigger.click();
  const dialog = page.getByRole('alertdialog', { name: 'Supprimer « Fête de la musique » ?' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleDescription(/Cette action est définitive/);
  await expect(dialog.getByRole('button', { name: 'Annuler' })).toBeFocused();
  await expectNoViolations(page);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await dialog.getByRole('button', { name: 'Supprimer' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('status').filter({ hasText: 'a été supprimé' })).toBeVisible();
});

test("notification d'erreur : persistante, dans une alerte", async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: "Notification d'erreur" }).click();
  const alert = page.getByRole('alert').filter({ hasText: 'La publication a échoué' });
  await expect(alert).toBeVisible();
  await expect(alert.getByRole('button', { name: 'Réessayer' })).toBeVisible();
  await page.waitForTimeout(6500);
  await expect(alert).toContainText('La publication a échoué');
});

test('modifications non enregistrées : Rester, puis Quitter sans enregistrer', async ({ page }) => {
  await open(page);
  await page.getByRole('textbox', { name: 'Titre', exact: true }).fill('Brocante');
  await page.getByRole('link', { name: 'quittez la page' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Modifications non enregistrées' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Rester' }).click();
  await expect(page.getByRole('textbox', { name: 'Titre', exact: true })).toHaveValue('Brocante');

  await page.getByRole('link', { name: 'quittez la page' }).click();
  await dialog.getByRole('button', { name: 'Quitter sans enregistrer' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tableau de bord' })).toBeVisible();
});
