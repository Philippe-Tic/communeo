/**
 * Inscription d'une mairie en libre-service (#309, #337) : demande, confirmation de l'adresse saisie,
 * choix du mot de passe ; la mairie approuve ou refuse depuis son adresse officielle ; en attendant,
 * l'administration fonctionne et le site d'essai se met en ligne (#369).
 */
import { expect, test } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

test('demande : commune choisie dans la liste, lien envoyé à l’adresse saisie, sans violation', async ({ page }) => {
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

  await expect(page.getByRole('heading', { level: 1, name: 'Vérifiez votre boîte de réception' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'confirmez votre adresse' })).toContainText('julie@gmail.test');
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

test('adresse confirmée, puis mot de passe du demandeur, sans violation', async ({ page }) => {
  const { posts } = await mockApi(page, { loggedIn: false });
  await page.goto('/inscription/confirmer?jeton=jeton-inscription');
  await expect(page.getByRole('heading', { level: 1, name: 'Créer le site de Bourg-Neuf' })).toBeVisible();
  await expect(page.getByText('julie@gmail.test')).toBeVisible();
  await expect(page.getByText('mairie devra aussi approuver la demande : si elle la refuse, le site sera retiré')).toBeVisible();
  await expectNoViolations(page);
  // Ouvrir le lien ne crée rien : seulement le clic
  expect(posts['/api/signup/confirm']).toBeUndefined();
  await page.getByRole('button', { name: 'Créer le site' }).click();
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

test('la mairie approuve depuis son adresse officielle, sans violation', async ({ page }) => {
  const { posts } = await mockApi(page, { loggedIn: false });
  await page.goto('/inscription/approuver?jeton=jeton-mairie');
  await expect(page.getByRole('heading', { level: 1, name: 'Site internet de Bourg-Neuf' })).toBeVisible();
  await expect(page.getByText('(julie@gmail.test) a créé le site internet de la commune')).toBeVisible();
  await expectNoViolations(page);
  expect(posts['/api/signup/approve']).toBeUndefined();
  await page.getByRole('button', { name: 'Approuver la demande' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Demande approuvée' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Merci. Le site de Bourg-Neuf continue son essai' })).toBeFocused();
  expect(posts['/api/signup/approve']).toEqual([{ jeton: 'jeton-mairie' }]);
});

test('la mairie refuse : confirmation, puis site supprimé', async ({ page }) => {
  const { posts } = await mockApi(page, { loggedIn: false });
  await page.goto('/inscription/approuver?jeton=jeton-mairie');
  await page.getByRole('button', { name: 'Refuser la demande' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Refuser la demande ?' });
  await expect(dialog).toContainText('ses contenus et son compte seront supprimés');
  await expectNoViolations(page);
  await dialog.getByRole('button', { name: 'Annuler' }).click();
  expect(posts['/api/signup/decline']).toBeUndefined();
  await page.getByRole('button', { name: 'Refuser la demande' }).click();
  await dialog.getByRole('button', { name: 'Refuser et supprimer' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Demande refusée' })).toBeVisible();
  expect(posts['/api/signup/decline']).toEqual([{ jeton: 'jeton-mairie' }]);
});

test('lien de la mairie expiré ou déjà utilisé', async ({ page }) => {
  await mockApi(page, { loggedIn: false });
  await page.goto('/inscription/approuver?jeton=jeton-mairie-expire');
  await expect(page.getByRole('heading', { level: 1, name: 'Ce lien a expiré' })).toBeVisible();
  await expect(page.getByText('peut vous renvoyer la demande')).toBeVisible();
  await page.goto('/inscription/approuver?jeton=autre');
  await expect(page.getByRole('heading', { level: 1, name: 'Ce lien ne fonctionne pas' })).toBeVisible();
});

test('en attendant la mairie : bandeau, renvoi de la demande, le site d’essai se met en ligne (#369)', async ({ page }) => {
  const { posts } = await mockApi(page, { trial: { endsInDays: 30 }, approval: 'townhall', publication: 'pending' });
  await page.goto('/');
  const banner = page.getByRole('region', { name: 'Inscription en attente' });
  await expect(banner).toContainText('En attente de l’approbation de la mairie.');
  await expect(banner).toContainText('La demande lui a été envoyée à m***@saint-aubin.fr le 28 septembre 2026.');
  await expect(banner).toContainText('Votre site d’essai peut être mis en ligne en attendant ; si la mairie refuse, il sera retiré.');
  await expectNoViolations(page);

  await banner.getByRole('button', { name: 'Renvoyer la demande' }).click();
  await expect(page.getByText('Demande renvoyée à m***@saint-aubin.fr.')).toBeVisible();
  expect(posts['/api/signup/approval/resend']).toHaveLength(1);

  // La mise en ligne n'attend pas la mairie
  await page.goto('/mise-en-ligne');
  await page.getByRole('button', { name: 'Mettre en ligne maintenant' }).click();
  await expect.poll(() => posts['/api/deployment/trigger']?.length ?? 0).toBe(1);
});

test('en attendant l’équipe : bandeau sans renvoi', async ({ page }) => {
  await mockApi(page, { trial: { endsInDays: 30 }, approval: 'team' });
  await page.goto('/');
  const banner = page.getByRole('region', { name: 'Inscription en attente' });
  await expect(banner).toContainText('Demande en cours de vérification.');
  await expect(banner).toContainText('L’équipe Communeo va vérifier votre demande. Votre site d’essai peut être mis en ligne en attendant');
  await expect(banner.getByRole('button')).toHaveCount(0);
});
