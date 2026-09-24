/**
 * Thème Moderne : méga-menu plein écran (dialog modal). Accessible ouvert, Échap pour fermer,
 * focus rendu au bouton ; la loupe ouvre le menu dans la recherche ; sous-menus dépliables sur mobile.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// eslint-disable-next-line no-empty-pattern -- signature imposée par Playwright (fixtures, testInfo)
test.beforeEach(({}, info) => {
  test.skip(info.project.metadata.theme !== 'moderne', 'Méga-menu propre au thème Moderne');
});

test('méga-menu : ouvert sans violation, Échap le ferme et rend le focus au bouton', async ({ page }) => {
  await page.goto('/actualites');
  const button = page.locator('#menu').getByRole('button', { name: 'Menu' });
  await button.click();
  const menu = page.getByRole('dialog', { name: /menu complet/ });
  await expect(menu).toBeVisible();
  await expect(button).toHaveAttribute('aria-expanded', 'true');

  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const violations = results.violations.map((v) => ({ rule: v.id, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);

  // Page courante signalée dans le menu
  await expect(menu.locator('a[aria-current="page"]').filter({ visible: true })).toHaveText('Actualités');

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(button).toBeFocused();
  await expect(button).toHaveAttribute('aria-expanded', 'false');
});

test('la loupe ouvre le menu dans le champ de recherche ; « Fermer » le referme', async ({ page }) => {
  await page.goto('/');
  await page.locator('#menu').getByRole('link', { name: 'Rechercher' }).click();
  const menu = page.getByRole('dialog', { name: /menu complet/ });
  await expect(menu.getByRole('searchbox', { name: 'Rechercher sur le site' })).toBeFocused();
  await menu.getByRole('button', { name: /Fermer/ }).click();
  await expect(menu).toBeHidden();
  await expect(page.locator('#menu').getByRole('link', { name: 'Rechercher' })).toBeFocused();
});

test('mobile : les rubriques se déplient dans le menu', async ({ page }, info) => {
  test.skip(!info.project.name.endsWith('mobile'), 'Liste dépliable affichée sur mobile');
  await page.goto('/');
  await page.locator('#menu').getByRole('button', { name: 'Menu' }).click();
  const menu = page.getByRole('dialog', { name: /menu complet/ });
  const group = menu.locator('summary', { hasText: 'Vie pratique' });
  await group.click();
  await expect(menu.getByRole('link', { name: 'Collecte des déchets' })).toBeVisible();
});

test('page de contenu : la galerie s’agrandit sans violation, Échap rend le focus à la vignette', async ({ page }) => {
  await page.goto('/salle-des-fetes');
  const first = page.locator('[data-cn-gallery] a').first();
  await first.click();
  const dialog = page.getByRole('dialog', { name: 'Image agrandie' });
  await expect(dialog).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(first).toBeFocused();
});

test('page de contenu : le sommaire mène aux sections', async ({ page }, info) => {
  await page.goto('/salle-des-fetes');
  const mobile = info.project.name.endsWith('mobile');
  if (mobile) await page.locator('.mo-toc-mobile summary').click();
  const toc = mobile ? page.locator('.mo-toc-mobile') : page.getByRole('navigation', { name: 'Sur cette page' });
  await toc.getByRole('link', { name: 'Tarifs' }).click();
  await expect(page).toHaveURL(/#tarifs$/);
});

test('proposer une association : erreurs récapitulées et reliées aux champs', async ({ page }) => {
  await page.goto('/associations/proposer');
  await page.getByRole('button', { name: "Proposer l'association" }).click();
  const summary = page.locator('[data-mo-form-status]');
  await expect(summary).toBeFocused();
  await expect(summary).toContainText('Le formulaire contient 3 erreurs');
  await expect(page.getByLabel("Nom de l'association")).toHaveAttribute('aria-invalid', 'true');
  await summary.getByRole('link', { name: /Votre e-mail/ }).click();
  await expect(page.getByLabel('Votre e-mail')).toBeFocused();
});

test('contact : récapitulatif des erreurs, message sous chaque champ, envoi réussi', async ({ page }) => {
  await page.route('**/api/contact-submissions/public', (route) => route.fulfill({ status: 201, contentType: 'application/json', body: '{}' }));
  await page.goto('/contact');
  await page.getByRole('button', { name: 'Envoyer la demande' }).click();
  const summary = page.locator('[data-mo-form-status]');
  await expect(summary).toBeFocused();
  await expect(summary).toContainText('Le formulaire contient 6 erreurs');
  await expect(page.locator('#ct-consent-erreur')).toBeVisible();

  await page.getByLabel('Prénom').fill('Claire');
  await page.getByLabel('Nom', { exact: true }).fill('Martin');
  await page.getByLabel('E-mail').fill('claire.martin@exemple.fr');
  await page.getByLabel('Objet').fill('Acte de naissance');
  await page.getByLabel('Message').fill('Bonjour, je souhaite une copie de mon acte de naissance.');
  await page.getByLabel(/J'accepte que mes données/).check();
  await page.getByRole('button', { name: 'Envoyer la demande' }).click();
  await expect(summary).toContainText('Votre message a bien été envoyé');
});
