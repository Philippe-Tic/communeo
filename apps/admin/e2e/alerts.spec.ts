/**
 * Alertes et perturbations (#141, handoff 6.13) : alerte en cours (Modifier / Prolonger / Terminer
 * maintenant), programmées, passées réutilisables ; formulaire rapide en deux étapes identique sur
 * mobile et ordinateur, fin obligatoire (début + 4 h), aperçu du bandeau, publication immédiate.
 */
import { expect, test } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

test('liste : alerte active, programmée, passées ; sans violation', async ({ page }) => {
  await mockApi(page);
  await page.goto('/alertes');
  await expect(page.getByRole('heading', { level: 1, name: 'Alertes et perturbations' })).toBeVisible();
  await expect(page.getByText('1 alerte active · 1 programmée · 2 passées')).toBeVisible();
  const active = page.getByRole('article', { name: "Coupure d'eau rue des Lilas" });
  await expect(active).toContainText('Attention · active');
  await expect(active.getByRole('button', { name: 'Terminer maintenant' })).toBeVisible();
  await expect(page.getByRole('article', { name: /Marché déplacé/ })).toContainText('Information · programmée');
  const past = page.getByRole('region', { name: 'Alertes passées' });
  await expect(past.getByRole('listitem')).toHaveCount(2);
  await expect(past.getByRole('listitem').first()).toContainText('Urgent — Route de Nevers fermée après un accident');
  await expectNoViolations(page);
});

test('nouvelle alerte : champs requis, fin = début + 4 h, aperçu, publiée', async ({ page }) => {
  const { bodies, alertStore } = await mockApi(page);
  await page.goto('/alertes/nouvelle');
  await expect(page.getByRole('heading', { level: 1, name: 'Nouvelle alerte' })).toBeVisible();
  await expect(page.getByText('Étape 1 sur 2')).toBeVisible();
  await page.getByRole('button', { name: "Voir l'aperçu" }).click();
  const summary = page.getByRole('alert').filter({ hasText: '3 champs à corriger' });
  await expect(summary).toBeFocused();
  await expect(summary).toContainText("Indiquez le titre de l'alerte");
  await expect(summary).toContainText('Choisissez la sévérité');

  // Début choisi : la fin suit, 4 heures après
  await page.getByLabel(/^Début/).fill('2031-09-25');
  const start = page.getByRole('group', { name: /^Heure de début/ });
  await start.getByLabel('Heures').selectOption('08');
  await start.getByLabel('Minutes').selectOption('00');
  await expect(page.getByLabel(/^Fin/)).toHaveValue('2031-09-25');
  const end = page.getByRole('group', { name: /^Heure de fin/ });
  await expect(end.getByLabel('Heures')).toHaveValue('12');

  await page.getByRole('textbox', { name: /^Titre/ }).fill("Coupure d'eau rue des Tilleuls");
  await page.getByText('Attention', { exact: true }).click();
  await page.getByRole('combobox', { name: /^Type/ }).selectOption({ label: "Coupure d'eau" });
  await page.getByRole('textbox', { name: /^Message/ }).fill('Intervention jeudi de 8 h à 12 h.');
  await page.getByRole('textbox', { name: /^Zone concernée/ }).fill('Rue des Tilleuls');
  await expectNoViolations(page);
  await page.getByRole('button', { name: "Voir l'aperçu" }).click();

  await expect(page.getByRole('heading', { level: 1, name: "Aperçu de l'alerte" })).toBeFocused();
  const banner = page.getByRole('figure', { name: 'Aperçu du bandeau sur le site' });
  await expect(banner).toContainText("Attention — Coupure d'eau rue des Tilleuls");
  await expect(banner).toContainText('Rue des Tilleuls · jeu. 25 sept., 8 h → 12 h');
  await expect(page.getByRole('definition').filter({ hasText: 'Automatique' })).toHaveText(
    'Automatique le jeu. 25 sept. à 12 h',
  );
  // Début dans le futur : programmée
  await expect(page.getByRole('button', { name: "Programmer l'alerte" })).toBeVisible();
  await expectNoViolations(page);
  await page.getByRole('button', { name: "Programmer l'alerte" }).click();

  await expect(page).toHaveURL(/\/alertes$/);
  const sent = bodies.find((entry) => entry.call === 'POST alertes')!.body.data;
  expect(sent).toMatchObject({
    title: "Coupure d'eau rue des Tilleuls",
    severity: 'warning',
    alert_type: 'coupure-eau',
    affected_area: 'Rue des Tilleuls',
    active: true,
    display_from: '2031-09-25T06:00:00.000Z',
    display_until: '2031-09-25T10:00:00.000Z',
    start_date: '2031-09-25',
    end_date: '2031-09-25',
  });
  expect(alertStore).toHaveLength(5);
});

test('fin avant le début : expliquée', async ({ page }) => {
  await mockApi(page);
  await page.goto('/alertes/nouvelle');
  await page.getByLabel(/^Fin/).fill('2020-01-01');
  await page.getByRole('button', { name: "Voir l'aperçu" }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'à corriger' })).toContainText(
    'La fin doit être après le début',
  );
});

test('réutiliser une alerte passée : contenu repris, nouvelles dates', async ({ page }) => {
  await mockApi(page);
  await page.goto('/alertes');
  await page.getByRole('link', { name: 'Réutiliser « Vigilance orange canicule »' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Nouvelle alerte' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /^Titre/ })).toHaveValue('Vigilance orange canicule');
  await expect(page.getByRole('radio', { name: 'Attention' })).toBeChecked();
  await page.getByRole('button', { name: "Voir l'aperçu" }).click();
  // Début maintenant : publiée tout de suite
  await expect(page.getByRole('button', { name: "Publier l'alerte" })).toBeVisible();
  await expect(
    page.getByText('Mise en ligne immédiate, sans attendre la prochaine mise en ligne du site.'),
  ).toBeVisible();
  await page.getByRole('button', { name: "Publier l'alerte" }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Alerte publiée. Elle est visible sur le site dès maintenant.' }),
  ).toBeVisible();
});

test('prolonger et terminer maintenant', async ({ page }) => {
  const { bodies, alertStore } = await mockApi(page);
  await page.goto('/alertes');
  const active = page.getByRole('article', { name: "Coupure d'eau rue des Lilas" });
  await active.getByRole('button', { name: 'Prolonger' }).click();
  const dialog = page.getByRole('dialog', { name: /^Prolonger/ });
  await dialog.getByRole('button', { name: '+ 1 jour' }).click();
  await dialog.getByRole('button', { name: 'Prolonger' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('status').filter({ hasText: 'est prolongée jusqu’au'.replace('’', "'") })).toBeVisible();
  const extended = bodies.find((entry) => entry.call === 'PUT alertes al-eau')!.body.data;
  expect(new Date(extended.display_until as string).getTime()).toBeGreaterThan(Date.now() + 20 * 3_600_000);

  await active.getByRole('button', { name: 'Terminer maintenant' }).click();
  await page
    .getByRole('alertdialog', { name: /^Terminer/ })
    .getByRole('button', { name: 'Terminer maintenant' })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: "« Coupure d'eau rue des Lilas » est terminée." }),
  ).toBeVisible();
  expect(alertStore.find((item) => item.documentId === 'al-eau')).toMatchObject({ active: false });
  await expect(page.getByRole('region', { name: 'Alertes passées' }).getByRole('listitem')).toHaveCount(3);
});

test('modifier : dates gardées, enregistrée', async ({ page }) => {
  const { bodies } = await mockApi(page);
  await page.goto('/alertes/al-eau');
  await expect(page.getByRole('heading', { level: 1, name: "Modifier l'alerte" })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /^Titre/ })).toHaveValue("Coupure d'eau rue des Lilas");
  await page.getByRole('textbox', { name: /^Message/ }).fill('Intervention prolongée.');
  await page.getByRole('button', { name: "Voir l'aperçu" }).click();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page).toHaveURL(/\/alertes$/);
  expect(bodies.find((entry) => entry.call === 'PUT alertes al-eau')!.body.data).toMatchObject({
    message: 'Intervention prolongée.',
    active: true,
  });
});

test('quitter un formulaire commencé : confirmation', async ({ page }) => {
  await mockApi(page);
  await page.goto('/alertes/nouvelle');
  await page.getByRole('textbox', { name: /^Titre/ }).fill('Brouillon');
  await page.getByRole('link', { name: 'Retour aux alertes' }).click();
  await expect(page.getByRole('alertdialog', { name: 'Modifications non enregistrées' })).toBeVisible();
});

test('aucune alerte : explication', async ({ page }) => {
  await mockApi(page, { alertSet: 'none' });
  await page.goto('/alertes');
  await expect(page.getByText('Aucune alerte en cours sur le site.')).toBeVisible();
  await expectNoViolations(page);
});
