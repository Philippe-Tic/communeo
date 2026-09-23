/**
 * Réglages du site (#143, handoff 6.10) : gabarit commun (barre « Enregistrer », sommaire avec les
 * écrans à compléter pour la conformité, fenêtre des modifications non enregistrées) et écran
 * « Informations de la commune » (identité, coordonnées, horaires, fermetures exceptionnelles).
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

const wide = (page: Page) => (page.viewportSize()?.width ?? 1440) >= 1200;
const save = (page: Page) => page.getByRole('button', { name: 'Enregistrer', exact: true });
const sent = (bodies: Array<{ call: string; body: { data: Record<string, unknown> } }>) =>
  bodies.filter((entry) => entry.call === 'PUT site').at(-1)?.body.data;

test('informations : valeurs enregistrées, sommaire des réglages, sans violation', async ({ page }) => {
  await mockApi(page);
  await page.goto('/mon-site/informations');
  await expect(page.getByRole('heading', { level: 1, name: 'Informations de la commune' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /Nom de la commune/ })).toHaveValue('Saint-Aubin-sur-Loire');
  await expect(page.getByRole('textbox', { name: /Coordonnées GPS/ })).toHaveValue('46.7412, 3.7891');
  await expect(page.getByRole('textbox', { name: /Population/ })).toHaveValue('3240');
  await expect(page.getByRole('combobox', { name: 'Lundi, plage 2 : fermeture' })).toHaveValue('17:00');
  await expect(page.getByRole('group', { name: 'Mercredi' })).toContainText('Fermé');
  await expect(page.getByRole('listitem').filter({ hasText: 'Le 11 novembre 2026 — Armistice' })).toBeVisible();
  await expect(save(page)).toBeDisabled();
  if (wide(page)) {
    const nav = page.getByRole('navigation', { name: 'Mon site' });
    await expect(nav.getByRole('link', { name: 'Informations de la commune' })).toHaveAttribute('aria-current', 'page');
    // Schéma pluriannuel manquant (niveau « partiellement conforme ») : écran à compléter
    await expect(nav.getByRole('link', { name: 'Accessibilité (à compléter pour la conformité)' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Mentions légales et RGPD' })).toBeVisible();
  }
  await expectNoViolations(page);
});

test('horaires : plage ajoutée, lundi copié, chevauchement refusé puis corrigé ; fermeture sur une période', async ({
  page,
}) => {
  const { bodies } = await mockApi(page);
  await page.goto('/mon-site/informations');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.getByRole('button', { name: 'Ajouter une plage le samedi' }).click();
  await expect(page.getByRole('combobox', { name: 'Samedi, plage 1 : ouverture' })).toBeFocused();
  await expect(page.getByRole('combobox', { name: 'Samedi, plage 1 : fermeture' })).toHaveValue('12:00');

  await page.getByRole('button', { name: 'Copier lundi sur les jours de semaine' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Horaires du lundi copiés du mardi au vendredi.' }),
  ).toBeAttached();
  await expect(page.getByRole('combobox', { name: 'Mercredi, plage 2 : ouverture' })).toHaveValue('14:00');

  // Chevauchement : l'après-midi du jeudi commence avant la fin du matin
  await page.getByRole('combobox', { name: 'Jeudi, plage 2 : ouverture' }).selectOption('11:00');
  await save(page).click();
  const summary = page.getByRole('alert').filter({ hasText: "empêche l'enregistrement" });
  await expect(summary).toBeFocused();
  await expect(summary).toContainText('Deux plages du jeudi se chevauchent');
  expect(sent(bodies)).toBeUndefined();
  await summary.getByRole('link', { name: /se chevauchent/ }).click();
  await expect(page.getByRole('combobox', { name: 'Jeudi, plage 2 : ouverture' })).toBeFocused();
  await expect(page.getByRole('group', { name: 'Jeudi' })).toHaveAccessibleDescription(
    'Deux plages du jeudi se chevauchent',
  );
  await page.getByRole('combobox', { name: 'Jeudi, plage 2 : ouverture' }).selectOption('14:00');

  await page.getByRole('button', { name: 'Ajouter une fermeture' }).click();
  const dialog = page.getByRole('dialog', { name: 'Ajouter une fermeture' });
  await dialog.getByLabel('Premier jour').fill('2026-12-24');
  await dialog.getByLabel('Dernier jour').fill('2026-12-20');
  await dialog.getByRole('button', { name: 'Ajouter la fermeture' }).click();
  await expect(dialog.getByText('Le dernier jour doit être après le premier').first()).toBeVisible();
  await dialog.getByLabel('Dernier jour').fill('2027-01-02');
  await dialog.getByRole('textbox', { name: /Motif/ }).fill("Congés de fin d'année");
  await expectNoViolations(page);
  await dialog.getByRole('button', { name: 'Ajouter la fermeture' }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('listitem').filter({ hasText: "Du 24 décembre 2026 au 2 janvier 2027 — Congés de fin d'année" }),
  ).toBeVisible();

  await save(page).click();
  await expect(page.getByRole('status').filter({ hasText: 'Informations enregistrées.' })).toBeVisible();
  const data = sent(bodies)!;
  const info = data.infos_pratiques as { opening_hours: Record<string, unknown>; latitude: number };
  expect(info.opening_hours).toEqual({
    days: {
      monday: [
        { open: '09:00', close: '12:00' },
        { open: '14:00', close: '17:00' },
      ],
      tuesday: [
        { open: '09:00', close: '12:00' },
        { open: '14:00', close: '17:00' },
      ],
      wednesday: [
        { open: '09:00', close: '12:00' },
        { open: '14:00', close: '17:00' },
      ],
      thursday: [
        { open: '09:00', close: '12:00' },
        { open: '14:00', close: '17:00' },
      ],
      friday: [
        { open: '09:00', close: '12:00' },
        { open: '14:00', close: '17:00' },
      ],
      saturday: [{ open: '09:00', close: '12:00' }],
      sunday: [],
    },
    closures: [
      { date: '2026-11-11', end: null, label: 'Armistice' },
      { date: '2026-12-24', end: '2027-01-02', label: "Congés de fin d'année" },
    ],
    // La note des horaires (non modifiée ici) est conservée
    note: 'Permanence du maire sur rendez-vous.',
  });
  expect(info.latitude).toBe(46.7412);
  await expect(save(page)).toBeDisabled();
});

test('identité et coordonnées : erreurs sous les champs, logo sans texte alternatif, nom repris dans la barre', async ({
  page,
}) => {
  const { bodies } = await mockApi(page);
  await page.goto('/mon-site/informations');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('textbox', { name: /Coordonnées GPS/ }).fill('46,7 nord');
  await page.getByRole('textbox', { name: /^E-mail/ }).fill('mairie@');
  await page.getByRole('textbox', { name: /Téléphone/ }).fill('03 86');
  await save(page).click();
  await expect(page.getByRole('alert').filter({ hasText: "3 erreurs empêchent l'enregistrement" })).toBeFocused();
  await expect(page.getByRole('textbox', { name: /Coordonnées GPS/ })).toHaveAccessibleDescription(
    /Indiquez la latitude puis la longitude/,
  );
  await page.getByRole('textbox', { name: /Coordonnées GPS/ }).fill('47.1; 2.5');
  await page.getByRole('textbox', { name: /^E-mail/ }).fill('accueil@saint-aubin-sur-loire.fr');
  await page.getByRole('textbox', { name: /Téléphone/ }).fill('');
  await page.getByRole('textbox', { name: /Nom de la commune/ }).fill('Saint-Aubin-les-Bois');

  await page.getByRole('group', { name: /^Logo/ }).getByRole('button', { name: 'Choisir une image' }).click();
  const picker = page.getByRole('dialog', { name: 'Choisir une image' });
  await picker.getByRole('button', { name: /forum-associations/ }).click();
  // Logo : pas de texte alternatif demandé (le site utilise le nom de la commune)
  await expect(picker.getByRole('textbox', { name: /Texte alternatif/ })).toHaveCount(0);
  await picker.getByRole('button', { name: "Insérer l'image" }).click();
  await expect(picker).toBeHidden();
  await expect(page.getByRole('group', { name: /^Logo/ })).toContainText('forum-associations.jpg');

  await save(page).click();
  await expect(page.getByRole('status').filter({ hasText: 'Informations enregistrées.' })).toBeVisible();
  const data = sent(bodies)!;
  expect(data).toMatchObject({
    name: 'Saint-Aubin-les-Bois',
    contact_mail: 'accueil@saint-aubin-sur-loire.fr',
    contact_phone: null,
    logo: 502,
    favicon: null,
  });
  expect(data.infos_pratiques).toMatchObject({ latitude: 47.1, longitude: 2.5, population: 3240 });
  // Le nom de la commune suit partout (barre latérale, en-tête)
  await expect(page.getByText('Saint-Aubin-les-Bois', { exact: true }).filter({ visible: true }).first()).toBeVisible();
});

test('quitter avec des modifications : rester, ou enregistrer et quitter', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1440) < 768, 'navigation dans le tiroir sur mobile');
  const { bodies } = await mockApi(page);
  await page.goto('/mon-site/informations');
  await page.getByRole('textbox', { name: /Population/ }).fill('3 300');
  const leave = () => page.getByRole('link', { name: 'Tableau de bord' }).first().click();
  await leave();
  const dialog = page.getByRole('alertdialog', { name: 'Modifications non enregistrées' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Rester' }).click();
  await expect(page).toHaveURL(/informations/);
  await expect(page.getByRole('textbox', { name: /Population/ })).toHaveValue('3 300');

  await leave();
  await dialog.getByRole('button', { name: 'Enregistrer et quitter' }).click();
  await expect(page).toHaveURL(/\/$/);
  expect((sent(bodies)!.infos_pratiques as { population: number }).population).toBe(3300);
});
