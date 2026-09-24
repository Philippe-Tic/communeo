/**
 * Thème Bourg : menu en pastilles (ordinateur) ou déplié sous l'en-tête (mobile), panneau « Pratique »
 * en colonne (ordinateur) ou dans un tiroir ouvert depuis la barre du bas (mobile), page de contenu.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// eslint-disable-next-line no-empty-pattern -- signature imposée par Playwright (fixtures, testInfo)
test.beforeEach(({}, info) => {
  test.skip(info.project.metadata.theme !== 'bourg', 'Composants propres au thème Bourg');
});

test('ordinateur : rubrique courante marquée, sous-menu déroulant, panneau « Pratique » à droite', async ({ page }, info) => {
  test.skip(!info.project.name.endsWith('desktop'), 'Menu et colonne sur ordinateur');
  await page.goto('/actualites');
  const menu = page.locator('#menu');
  await expect(menu.getByRole('link', { name: 'Actualités' })).toHaveAttribute('aria-current', 'page');
  await menu.locator('summary', { hasText: 'Vie pratique' }).click();
  await expect(menu.getByRole('link', { name: 'Collecte des déchets' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu.getByRole('link', { name: 'Collecte des déchets' })).toBeHidden();

  const pratique = page.getByRole('complementary', { name: 'Pratique' });
  await expect(pratique).toBeVisible();
  await expect(pratique.getByRole('heading', { name: 'Prochaines collectes' })).toBeVisible();
  await expect(pratique.getByRole('link', { name: 'Nous écrire' })).toHaveAttribute('href', '/contact');
  await expect(page.getByRole('button', { name: /Pratique/ })).toBeHidden();
});

test('mobile : « Menu » déplie le menu, Échap le referme et rend le focus', async ({ page }, info) => {
  test.skip(!info.project.name.endsWith('mobile'), 'Bouton Menu sur mobile');
  await page.goto('/agenda');
  const toggle = page.locator('[data-cn-menu-toggle]');
  await expect(toggle).toHaveAccessibleName('Menu');
  await toggle.click();
  const menu = page.locator('#menu');
  await expect(menu).toBeVisible();
  await expect(toggle).toHaveAccessibleName('Fermer');
  expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations.map((v) => v.id)).toEqual([]);
  await menu.getByRole('link', { name: 'Agenda' }).focus();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('mobile : la barre du bas ouvre le tiroir « Pratique » sans violation, Échap le ferme et rend le focus', async ({ page }, info) => {
  test.skip(!info.project.name.endsWith('mobile'), 'Barre et tiroir sur mobile');
  await page.goto('/salle-des-fetes');
  // Le panneau n'est pas dans la page tant que le tiroir est fermé
  await expect(page.getByRole('complementary', { name: 'Pratique' })).toBeHidden();
  const opener = page.getByRole('button', { name: /Pratique/ });
  await opener.click();
  const drawer = page.getByRole('dialog', { name: 'Pratique' });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Fermer' })).toBeFocused();
  await expect(drawer.getByRole('heading', { name: 'Mairie' })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations.map((v) => v.id)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(opener).toBeFocused();
  // Rendu à sa place : une seule copie du panneau dans la page
  await expect(page.locator('#pratique')).toHaveCount(1);
  await expect(page.locator('.bo-columns > #pratique')).toHaveCount(1);

  await opener.click();
  await drawer.getByRole('button', { name: 'Fermer' }).click();
  await expect(drawer).toBeHidden();
  await expect(opener).toBeFocused();
});

test('page de contenu : la galerie s’agrandit sans violation, Échap rend le focus à la vignette', async ({ page }) => {
  await page.goto('/salle-des-fetes');
  const first = page.locator('[data-cn-gallery] a').first();
  await first.click();
  const dialog = page.getByRole('dialog', { name: 'Image agrandie' });
  await expect(dialog).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations.map((v) => v.id)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(first).toBeFocused();
});

test('page de contenu : le sommaire en pastilles mène aux sections', async ({ page }) => {
  await page.goto('/salle-des-fetes');
  await page.getByRole('navigation', { name: 'Sommaire' }).getByRole('link', { name: 'Tarifs' }).click();
  await expect(page).toHaveURL(/#tarifs$/);
  await expect(page.getByRole('heading', { name: 'Tarifs', level: 2 })).toBeInViewport();
});

test('proposer une association : erreurs récapitulées et reliées aux champs', async ({ page }) => {
  await page.goto('/associations/proposer');
  await page.getByRole('button', { name: "Proposer l'association" }).click();
  const summary = page.locator('[data-bo-form-status]');
  await expect(summary).toBeFocused();
  await expect(summary).toContainText('Le formulaire contient 3 erreurs');
  await expect(page.getByLabel("Nom de l'association")).toHaveAttribute('aria-invalid', 'true');
  expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);
  await summary.getByRole('link', { name: /Votre e-mail/ }).click();
  await expect(page.getByLabel('Votre e-mail')).toBeFocused();
});

test('contact : récapitulatif des erreurs, message sous chaque champ, envoi réussi', async ({ page }) => {
  await page.route('**/api/contact-submissions/public', (route) => route.fulfill({ status: 201, contentType: 'application/json', body: '{}' }));
  await page.goto('/contact');
  await page.getByRole('button', { name: 'Envoyer la demande' }).click();
  const summary = page.locator('[data-bo-form-status]');
  await expect(summary).toBeFocused();
  await expect(summary).toContainText('Le formulaire contient 6 erreurs');
  await expect(page.locator('#ct-consent-erreur')).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);

  await page.getByLabel('Prénom').fill('Claire');
  await page.getByLabel('Nom', { exact: true }).fill('Martin');
  await page.getByLabel('E-mail').fill('claire.martin@exemple.fr');
  await page.getByLabel('Objet').fill('Acte de naissance');
  await page.getByLabel('Message').fill('Bonjour, je souhaite une copie de mon acte de naissance.');
  await page.getByLabel(/J'accepte que mes données/).check();
  await page.getByRole('button', { name: 'Envoyer la demande' }).click();
  await expect(summary).toContainText('Votre message a bien été envoyé');
});
