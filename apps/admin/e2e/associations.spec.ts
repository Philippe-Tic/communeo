/**
 * Associations (#140, handoff 6.13) : onglets Publiées / Propositions à examiner (compteur),
 * proposition avec les coordonnées du demandeur, Publier, Modifier avant de publier, Refuser avec
 * un motif (raccourcis) envoyé par e-mail ; ajout par la mairie, publié tout de suite.
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

const tabs = (page: Page) => page.getByRole('navigation', { name: 'Associations' });
const proposals = (page: Page) => page.getByRole('list', { name: 'Propositions à examiner' });

test('publiées : annuaire, compteurs, sans violation', async ({ page }) => {
  await mockApi(page);
  await page.goto('/associations');
  await expect(page.getByRole('heading', { level: 1, name: 'Associations' })).toBeVisible();
  await expect(page.getByText('3 publiées · 2 propositions à examiner')).toBeVisible();
  await expect(tabs(page).getByRole('button', { name: 'Publiées 3' })).toHaveAttribute('aria-current', 'true');
  const list = page.getByRole('list', { name: 'Publiées' });
  await expect(list.getByRole('listitem')).toHaveCount(3);
  await expect(list.getByRole('listitem').first()).toContainText('Comité des fêtes');
  await expect(list.getByRole('listitem').first()).toContainText('comite.example.fr');
  // Pas d'onglet « Refusées » sans refus
  await expect(tabs(page).getByRole('button', { name: /^Refusées/ })).toHaveCount(0);
  await expectNoViolations(page);
});

test('proposition : dépliée, coordonnées du demandeur, publier', async ({ page }) => {
  const { directory } = await mockApi(page);
  await page.goto('/associations');
  await tabs(page)
    .getByRole('button', { name: /^Propositions à examiner/ })
    .click();
  await expect(page).toHaveURL(/onglet=propositions/);
  const first = proposals(page).getByRole('button', { name: /Les Jardins partagés de la Loire/ });
  await expect(first).toHaveAttribute('aria-expanded', 'true');
  await expect(proposals(page)).toContainText('Hélène Garnier');
  await expect(proposals(page).getByRole('link', { name: 'h.garnier@example.org' })).toBeVisible();
  await expect(proposals(page)).toContainText('12 chemin des Vignes');
  await expectNoViolations(page);

  await proposals(page).getByRole('button', { name: 'Publier', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: '« Les Jardins partagés de la Loire » est publiée.' }),
  ).toBeVisible();
  expect(directory.find((item) => item.documentId === 'as-jardins')!.status).toBe('published');
  await expect(tabs(page).getByRole('button', { name: /^Propositions à examiner/ })).toContainText('1');
  // La suivante se déplie
  await expect(proposals(page).getByRole('button', { name: /Club de pétanque/ })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
});

test('refuser : motif obligatoire, raccourci, envoyé ; onglet Refusées', async ({ page }) => {
  const { directory, posts } = await mockApi(page);
  await page.goto('/associations?onglet=propositions');
  await proposals(page).getByRole('button', { name: 'Refuser…' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Refuser « Les Jardins partagés de la Loire » ?' });
  await expect(dialog).toContainText('Hélène Garnier recevra votre motif par e-mail.');
  await dialog.getByRole('button', { name: 'Refuser et envoyer le motif' }).click();
  await expect(dialog.getByText('Écrivez le motif : il est envoyé au demandeur.')).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: /^Motif/ })).toBeFocused();

  await dialog.getByRole('button', { name: 'Informations incomplètes' }).click();
  await expect(dialog.getByRole('button', { name: 'Informations incomplètes' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(dialog.getByRole('textbox', { name: /^Motif/ })).toHaveValue(/numéro RNA/);
  await expectNoViolations(page);
  await dialog.getByRole('button', { name: 'Refuser et envoyer le motif' }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole('status').filter({ hasText: 'est refusée, le motif a été envoyé.' })).toBeVisible();
  expect(posts['/api/associations/as-jardins/reject']).toEqual([{ reason: expect.stringContaining('numéro RNA') }]);
  expect(directory.find((item) => item.documentId === 'as-jardins')!.status).toBe('rejected');

  await tabs(page)
    .getByRole('button', { name: /^Refusées/ })
    .click();
  const refused = page.getByRole('list', { name: 'Refusées' });
  await expect(refused).toContainText('Les Jardins partagés de la Loire');
  await expect(refused).toContainText('Motif : Bonjour, merci pour votre proposition.');
});

test('refuser sans e-mail du demandeur : prévenu, bouton adapté', async ({ page }) => {
  await mockApi(page);
  await page.goto('/associations?onglet=propositions');
  await proposals(page)
    .getByRole('button', { name: /Club de pétanque/ })
    .click();
  await proposals(page).getByRole('button', { name: 'Refuser…' }).click();
  const dialog = page.getByRole('alertdialog', { name: /Club de pétanque/ });
  await expect(dialog).toContainText("Aucune adresse e-mail n'a été donnée");
  await dialog.getByRole('button', { name: 'Déjà référencée' }).click();
  await dialog.getByRole('button', { name: 'Refuser', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: '« Club de pétanque saint-aubinois » est refusée.' }),
  ).toBeVisible();
});

test('modifier avant de publier : enregistré puis publié', async ({ page }) => {
  const { bodies, directory } = await mockApi(page);
  await page.goto('/associations?onglet=propositions');
  await proposals(page).getByRole('button', { name: 'Modifier avant de publier' }).click();
  const sheet = page.getByRole('dialog', { name: 'Proposition : Les Jardins partagés de la Loire' });
  await sheet.getByRole('textbox', { name: /^Site web/ }).fill('jardins.fr');
  await sheet.getByRole('button', { name: 'Enregistrer et publier' }).click();
  await expect(sheet.getByRole('alert').filter({ hasText: '1 champ à corriger' })).toBeFocused();
  await sheet.getByRole('textbox', { name: /^Site web/ }).fill('https://jardins.fr');
  await sheet.getByRole('textbox', { name: /^Nom du contact/ }).fill('Hélène Garnier');
  await sheet.getByRole('button', { name: 'Enregistrer et publier' }).click();
  await expect(sheet).toBeHidden();
  await expect(
    page.getByRole('status').filter({ hasText: '« Les Jardins partagés de la Loire » est publiée.' }),
  ).toBeVisible();
  expect(bodies.filter((entry) => entry.call === 'PUT associations').at(-1)!.body.data).toMatchObject({
    website: 'https://jardins.fr',
    contact_name: 'Hélène Garnier',
    category: 'environnement',
  });
  expect(directory.find((item) => item.documentId === 'as-jardins')!.status).toBe('published');
});

test('ajouter une association : publiée tout de suite', async ({ page }) => {
  const { bodies } = await mockApi(page);
  await page.goto('/associations');
  await page.getByRole('button', { name: 'Ajouter une association' }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Nouvelle association' });
  await expect(sheet.getByRole('button', { name: 'Enregistrer et publier' })).toHaveCount(0);
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(sheet.getByRole('alert').filter({ hasText: '2 champs à corriger' })).toBeFocused();
  await sheet.getByRole('textbox', { name: /^Nom/ }).first().fill('Chorale Saint-Aubin');
  await sheet.getByRole('combobox', { name: /^Catégorie/ }).selectOption({ label: 'Culture' });
  await sheet.getByRole('textbox', { name: /^E-mail/ }).fill('chorale@example.fr');
  await expectNoViolations(page);
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(sheet).toBeHidden();
  await expect(
    page.getByRole('status').filter({ hasText: "« Chorale Saint-Aubin » est ajoutée à l'annuaire." }),
  ).toBeVisible();
  expect(bodies.filter((entry) => entry.call === 'POST associations').at(-1)!.body.data).toMatchObject({
    name: 'Chorale Saint-Aubin',
    category: 'culture',
    contact_email: 'chorale@example.fr',
    status: 'published',
    submission_source: 'manual',
  });
  await expect(page.getByRole('list', { name: 'Publiées' })).toContainText('Chorale Saint-Aubin');
});

test('supprimer : confirmation', async ({ page }) => {
  const { directory } = await mockApi(page);
  await page.goto('/associations');
  await page.getByRole('button', { name: 'Actions pour « Restos du cœur »' }).click();
  await page.getByRole('menuitem', { name: 'Supprimer…' }).click();
  await page
    .getByRole('alertdialog', { name: 'Supprimer « Restos du cœur » ?' })
    .getByRole('button', { name: 'Supprimer' })
    .click();
  await expect(page.getByRole('status').filter({ hasText: '« Restos du cœur » a été supprimée.' })).toBeVisible();
  expect(directory.map((item) => item.documentId)).not.toContain('as-restos');
});

test('aucune association : explication et ajout', async ({ page }) => {
  await mockApi(page, { associationSet: 'none' });
  await page.goto('/associations');
  await expect(page.getByRole('heading', { level: 2, name: 'Présentez les associations de la commune' })).toBeVisible();
  await expectNoViolations(page);
});
