/**
 * Inscription d'une mairie en libre-service (#309) : demande, confirmation par la boîte officielle de
 * la mairie, choix du mot de passe du demandeur.
 */
import { expect, test } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

test('demande : commune choisie dans la liste, confirmation envoyée à l’adresse officielle, sans violation', async ({ page }) => {
  const { posts } = await mockApi(page, { loggedIn: false });
  await page.goto('/connexion');
  await page.getByRole('link', { name: 'Créer le site de la commune' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Créer le site de votre commune' })).toBeVisible();

  // Sans commune ni conditions : récapitulatif des erreurs
  await page.getByRole('button', { name: 'Créer le site' }).click();
  const summary = page.getByRole('alert').filter({ hasText: 'à corriger' });
  await expect(summary).toContainText('Choisissez votre commune dans la liste');
  await expect(summary).toContainText('Acceptez les conditions d’utilisation');
  await expectNoViolations(page);

  const search = page.getByLabel('Votre commune');
  await search.fill('bourg');
  const results = page.getByRole('list', { name: 'Communes trouvées' });
  await results.getByRole('button', { name: /Bourg-Neuf/ }).click();
  await expect(search).toHaveValue('Bourg-Neuf (58100) · Nièvre');
  await page.getByRole('textbox', { name: 'Prénom' }).fill('Julie');
  await page.getByRole('textbox', { name: 'Nom', exact: true }).fill('Martin');
  await page.getByLabel('Votre e-mail').fill('julie@gmail.test');
  await page.getByLabel(/J’accepte les conditions/).check();
  await page.getByRole('button', { name: 'Créer le site' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Vérifiez la boîte de la mairie' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'adresse officielle' })).toContainText('m***@bourg-neuf.fr');
  expect(posts['/api/signup']?.at(-1)).toMatchObject({ insee: '58999', first_name: 'Julie', last_name: 'Martin', email: 'julie@gmail.test', terms: true, website: '' });
  await expectNoViolations(page);
});

test('commune déjà sur Communeo : pas proposée, l’explication est donnée', async ({ page }) => {
  await mockApi(page, { loggedIn: false });
  await page.goto('/inscription');
  await page.getByLabel('Votre commune').fill('saint');
  const results = page.getByRole('list', { name: 'Communes trouvées' });
  await expect(results).toContainText('Déjà sur Communeo');
  await expect(results.getByRole('button')).toHaveCount(0);
});

test('sans adresse officielle connue : vérification par l’équipe', async ({ page }) => {
  await mockApi(page, { loggedIn: false });
  await page.goto('/inscription');
  await page.getByLabel('Votre commune').fill('annuaire');
  await page.getByRole('list', { name: 'Communes trouvées' }).getByRole('button').click();
  await page.getByRole('textbox', { name: 'Prénom' }).fill('Paul');
  await page.getByRole('textbox', { name: 'Nom', exact: true }).fill('Durand');
  await page.getByLabel('Votre e-mail').fill('paul@mairie.test');
  await page.getByLabel(/J’accepte les conditions/).check();
  await page.getByRole('button', { name: 'Créer le site' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Demande enregistrée' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'L’équipe Communeo vérifie la demande' })).toBeVisible();
});

test('compte existant : message de l’API annoncé', async ({ page }) => {
  await mockApi(page, { loggedIn: false });
  await page.goto('/inscription');
  await page.getByLabel('Votre commune').fill('bourg-neuf');
  await page.getByRole('list', { name: 'Communes trouvées' }).getByRole('button').click();
  await page.getByRole('textbox', { name: 'Prénom' }).fill('Sophie');
  await page.getByRole('textbox', { name: 'Nom', exact: true }).fill('Leroy');
  await page.getByLabel('Votre e-mail').fill('existe@saint-aubin.fr');
  await page.getByLabel(/J’accepte les conditions/).check();
  await page.getByRole('button', { name: 'Créer le site' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Un compte existe déjà' })).toBeFocused();
});

test('confirmation par la mairie, puis mot de passe du demandeur, sans violation', async ({ page }) => {
  const { posts } = await mockApi(page, { loggedIn: false });
  await page.goto('/inscription/confirmer?jeton=jeton-inscription');
  await expect(page.getByRole('heading', { level: 1, name: 'Créer le site de Bourg-Neuf' })).toBeVisible();
  await expect(page.getByText('Julie Martin')).toBeVisible();
  await expectNoViolations(page);
  await page.getByRole('button', { name: 'Confirmer la création du site' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Bienvenue, Julie' })).toBeVisible();
  await expect(page).toHaveURL(/\/invitation\?jeton=jeton-inscription-invitation/);
  expect(posts['/api/signup/confirm']?.at(-1)).toEqual({ jeton: 'jeton-inscription' });
});

test('lien expiré ou déjà utilisé : refaire la demande', async ({ page }) => {
  await mockApi(page, { loggedIn: false });
  await page.goto('/inscription/confirmer?jeton=jeton-inscription-expire');
  await expect(page.getByRole('heading', { level: 1, name: 'Ce lien a expiré' })).toBeVisible();
  await page.goto('/inscription/confirmer?jeton=autre');
  await expect(page.getByRole('heading', { level: 1, name: 'Ce lien ne fonctionne pas' })).toBeVisible();
  await page.getByRole('link', { name: 'Refaire la demande' }).click();
  await expect(page).toHaveURL(/\/inscription$/);
});
