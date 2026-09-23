/**
 * Collecte des déchets (#141, handoff 6.13) : tableau Type · Jour · Fréquence · Zone (cartes sur
 * mobile), fiche en panneau latéral avec prochains passages calculés en direct, collectes sans jour,
 * rang dans le mois, saison ; notes affichées sur le site.
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;

test('tableau des collectes, sans violation', async ({ page }) => {
  await mockApi(page);
  await page.goto('/dechets');
  await expect(page.getByRole('heading', { level: 1, name: 'Collecte des déchets' })).toBeVisible();
  await expect(page.getByText('5 collectes')).toBeVisible();
  if (!isMobile(page)) {
    const rows = page.getByRole('table').locator('tbody tr');
    await expect(rows).toHaveCount(5);
    await expect(rows.nth(1)).toContainText('Tri sélectif');
    await expect(rows.nth(1)).toContainText('Semaines paires');
    await expect(rows.nth(2)).toContainText("Verre—Points d'apport volontaire4 points");
    await expect(rows.nth(3)).toContainText("Chaque semaine, d'avril à novembre");
  } else {
    await expect(page.getByRole('listitem').filter({ hasText: 'Verre' })).toContainText(
      "Points d'apport volontaire · 4 points",
    );
  }
  await expect(page.getByRole('textbox', { name: 'Notes affichées sur le site' })).toHaveValue(
    'Déchetterie ouverte du mardi au samedi.',
  );
  await expectNoViolations(page);
});

test('ajouter : jour requis, prochains passages en direct, mensuel et saison', async ({ page }) => {
  const { bodies } = await mockApi(page);
  await page.clock.setFixedTime(new Date('2026-09-22T10:00:00+02:00'));
  await page.goto('/dechets');
  await page.getByRole('button', { name: 'Ajouter une collecte' }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Nouvelle collecte' });
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  const summary = sheet.getByRole('alert').filter({ hasText: '2 champs à corriger' });
  await expect(summary).toBeFocused();
  await expect(summary).toContainText('Choisissez le jour de collecte');

  await sheet.getByRole('combobox', { name: /^Type de déchets/ }).selectOption({ label: 'Encombrants' });
  await sheet.getByRole('combobox', { name: /^Fréquence/ }).selectOption({ label: 'Une fois par mois' });
  await sheet.getByRole('combobox', { name: /^Semaine du mois/ }).selectOption({ label: '1er' });
  await sheet.getByRole('combobox', { name: /^Jour/ }).selectOption({ label: 'Mercredi' });
  await expect(sheet.getByText(/^Prochains passages/)).toHaveText(
    'Prochains passages : 7 octobre 2026, 4 novembre 2026, 2 décembre 2026.',
  );

  await sheet.getByRole('switch', { name: "Seulement une partie de l'année" }).click();
  await sheet.getByRole('combobox', { name: /^Au mois de/ }).selectOption({ label: 'Octobre' });
  await expect(sheet.getByText(/^Prochains passages/)).toHaveText(
    'Prochains passages : 7 octobre 2026, 7 avril 2027, 5 mai 2027.',
  );
  await expectNoViolations(page);
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();

  await expect(sheet).toBeHidden();
  await expect(
    page.getByRole('status').filter({ hasText: 'La nouvelle collecte « Encombrants » est enregistrée.' }),
  ).toBeVisible();
  expect(bodies.find((entry) => entry.call === 'POST waste')!.body.data).toEqual({
    waste_type: 'encombrants',
    frequency: 'mensuel',
    collection_day: 'mercredi',
    month_rank: 1,
    season_start_month: 4,
    season_end_month: 10,
    start_date: null,
    zone: null,
    notes: null,
    active: true,
  });
});

test('apport volontaire : pas de jour, pas de date ; masquer une collecte', async ({ page }) => {
  const { bodies } = await mockApi(page);
  await page.goto('/dechets');
  await page
    .getByRole('button', { name: 'Modifier la collecte « Tri sélectif » (Bourg)' })
    .locator('visible=true')
    .click();
  const sheet = page.getByRole('dialog', { name: 'Tri sélectif' });
  await sheet.getByRole('combobox', { name: /^Fréquence/ }).selectOption({ label: "Points d'apport volontaire" });
  await expect(sheet.getByRole('combobox', { name: /^Jour/ })).toHaveCount(0);
  await expect(
    sheet.getByText("Points d'apport volontaire : pas de date de passage affichée sur le site."),
  ).toBeVisible();
  await sheet.getByRole('switch', { name: 'Affichée sur le site' }).click();
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(sheet).toBeHidden();
  expect(bodies.find((entry) => entry.call === 'PUT waste w-tri')!.body.data).toMatchObject({
    frequency: 'apport-volontaire',
    collection_day: null,
    active: false,
  });
  await expect(page.getByText('Masquée').locator('visible=true')).toBeVisible();
});

test('supprimer une collecte : confirmation', async ({ page }) => {
  const { waste } = await mockApi(page);
  await page.goto('/dechets');
  await page.getByRole('button', { name: 'Modifier la collecte « Encombrants »' }).locator('visible=true').click();
  await page.getByRole('dialog', { name: 'Encombrants' }).getByRole('button', { name: 'Supprimer' }).click();
  await page
    .getByRole('alertdialog', { name: 'Supprimer la collecte « Encombrants » ?' })
    .getByRole('button', { name: 'Supprimer' })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'La collecte « Encombrants » a été supprimée.' }),
  ).toBeVisible();
  expect(waste.map((item) => item.documentId)).not.toContain('w-enc');
});

test('notes affichées sur le site : enregistrées sur le Site', async ({ page }) => {
  const { bodies } = await mockApi(page);
  await page.goto('/dechets');
  const notes = page.getByRole('textbox', { name: 'Notes affichées sur le site' });
  await expect(page.getByRole('button', { name: 'Enregistrer les notes' })).toBeDisabled();
  await notes.fill('Sortez vos bacs la veille au soir.');
  await page.getByRole('button', { name: 'Enregistrer les notes' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Notes enregistrées.' })).toBeVisible();
  expect(bodies.filter((entry) => entry.call === 'PUT site').at(-1)!.body.data).toEqual({
    waste_notes: 'Sortez vos bacs la veille au soir.',
  });
});

test('aucune collecte : explication et ajout', async ({ page }) => {
  await mockApi(page, { wasteSet: 'none' });
  await page.goto('/dechets');
  await expect(page.getByRole('heading', { level: 2, name: 'Indiquez les jours de collecte' })).toBeVisible();
  await expectNoViolations(page);
});
