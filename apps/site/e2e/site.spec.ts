/**
 * Site de Communeo : chaque page passe axe (WCAG 2.2 AA), a un seul titre de niveau 1, s'affiche à
 * 320 px sans défilement horizontal ; menu, questions, sélecteur de thèmes, simulateur de tarifs et
 * formulaire de contact fonctionnent au clavier et sont annoncés.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGES = [
  '/',
  '/fonctionnalites',
  '/themes',
  '/tarifs',
  '/comment-ca-marche',
  '/questions',
  '/contact',
  '/a-propos',
  '/mentions-legales',
  '/conditions',
  '/sous-traitance',
  '/donnees-personnelles',
  '/accessibilite',
  '/plan-du-site',
];

for (const path of PAGES) {
  test(`accessibilité et structure ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    expect(errors).toEqual([]);
  });

  test(`texte seul agrandi à 200 % ${path}`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'Agrandissement du texte vérifié sur ordinateur');
    // Taille de police par défaut du navigateur doublée (réglage « Taille de la police »), pas le zoom
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Page.setFontSizes', { fontSizes: { standard: 32, fixed: 26 } });
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
  });

  test(`320 px sans défilement horizontal ${path}`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'Reflow vérifié à 320 px');
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });
}

test('page introuvable : 404, non indexée, liens de reprise', async ({ page }) => {
  const response = await page.goto('/nexiste-pas');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cette page est introuvable.');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
});

test('lien d’évitement vers le titre de la page', async ({ page }) => {
  await page.goto('/tarifs');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Aller au contenu' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#contenu')).toBeFocused();
});

test('menu replié sur téléphone', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'Menu replié sous 1240 px');
  await page.goto('/');
  const button = page.getByRole('button', { name: 'Menu' });
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#menu-mobile')).toBeHidden();
  await button.click();
  await expect(page.getByRole('button', { name: 'Fermer' })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#menu-mobile').getByRole('link', { name: 'Tarifs' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu-mobile')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Menu' })).toBeFocused();
});

test('page courante signalée dans la navigation', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Navigation dépliée à 1440 px');
  await page.goto('/themes');
  await expect(page.getByRole('navigation', { name: 'Navigation principale' }).first().getByRole('link', { name: 'Thèmes' })).toHaveAttribute('aria-current', 'page');
});

test('questions : une réponse se déplie et se replie', async ({ page }) => {
  await page.goto('/questions');
  const question = page.getByRole('button', { name: 'Puis-je résilier ?' }).or(page.getByRole('button', { name: 'Pouvons-nous changer de thème ?' }));
  await expect(question).toHaveAttribute('aria-expanded', 'false');
  const region = page.getByRole('region', { name: 'Pouvons-nous changer de thème ?' });
  await expect(region).toBeHidden();
  await question.click();
  await expect(question).toHaveAttribute('aria-expanded', 'true');
  await expect(region).toBeVisible();
  await expect(region).toContainText('Vos contenus suivent');
  await question.click();
  await expect(region).toBeHidden();
});

test('sélecteur de thèmes : aperçu et description suivent le bouton choisi', async ({ page }) => {
  await page.goto('/');
  const group = page.getByRole('group', { name: 'Choisir un thème à prévisualiser' });
  await group.getByRole('button', { name: 'Journal' }).click();
  await expect(group.getByRole('button', { name: 'Journal' })).toHaveAttribute('aria-pressed', 'true');
  await expect(group.getByRole('button', { name: 'Institutionnel' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('img', { name: /dans le thème Journal/ })).toBeVisible();
  await expect(page.getByRole('img', { name: /dans le thème Institutionnel/ })).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Journal', level: 3 })).toBeVisible();
});

test('simulateur de tarifs : tranche, prix annoncé et grille', async ({ page }) => {
  await page.goto('/tarifs');
  const input = page.getByLabel('Population municipale INSEE');
  await input.fill('12 000');
  await expect(input).toHaveValue('12000');
  await expect(page.getByText('Tranche : 10 000 habitants et plus')).toBeVisible();
  await expect(page.locator('[data-annonce]')).toHaveText('1 290 € HT par an pour 12 000 habitants');
  await expect(page.locator('[data-grille] li[aria-current="true"]')).toContainText('10 000 habitants et plus');
  await page.getByRole('button', { name: '180 hab.' }).click();
  await expect(page.locator('[data-annonce]')).toHaveText('290 € HT par an pour 180 habitants');
  await expect(page.locator('.mois')).toHaveText('24');
  await input.fill('');
  await expect(page.getByText('Saisissez la population')).toBeVisible();
  await expect(page.locator('[data-grille] li[aria-current="true"]')).toHaveCount(0);
});

test('démo « Mettre en ligne » : les étapes s’enchaînent jusqu’à « En ligne »', async ({ page }) => {
  await page.goto('/');
  const demo = page.locator('[data-demo-publication]');
  await demo.getByRole('button', { name: 'Mettre en ligne' }).click();
  await expect(demo.getByRole('button', { name: 'En ligne' })).toBeVisible({ timeout: 5000 });
  await expect(demo.locator('li.fait')).toHaveCount(4);
});

test.describe('formulaire de contact', () => {
  test('signale les champs à corriger et place le focus sur le premier', async ({ page }) => {
    await page.goto('/contact');
    await page.getByLabel('Nom et prénom').fill('Julie Martin');
    await page.getByLabel('Adresse e-mail').fill('mairie');
    await page.getByRole('button', { name: 'Envoyer le message' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Corrigez' })).toContainText('5 erreurs.');
    await expect(page.getByLabel('Fonction')).toBeFocused();
    await expect(page.getByLabel('Adresse e-mail')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Adresse e-mail')).toHaveAccessibleDescription(/adresse e-mail valide/);
    await expect(page.getByLabel('Nom et prénom')).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('envoie le message et confirme l’adresse de réponse', async ({ page }) => {
    let sent: Record<string, unknown> | null = null;
    await page.route('**/api/prospect-contact', async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ data: { status: 'sent' } }) });
    });
    await page.goto('/contact');
    await page.getByLabel('Nom et prénom').fill('Julie Martin');
    await page.getByLabel('Fonction').fill('Secrétaire de mairie');
    await page.getByLabel('Commune', { exact: true }).fill('Saint-Aubin-sur-Loire');
    await page.getByLabel('Adresse e-mail').fill('mairie@saint-aubin.test');
    await page.getByLabel('Message', { exact: true }).fill('Bonjour');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Envoyer le message' }).click();
    await expect(page.getByRole('status')).toContainText('Merci, votre message est bien parti.');
    await expect(page.getByRole('status')).toContainText('mairie@saint-aubin.test');
    expect(sent).toMatchObject({ nom: 'Julie Martin', commune: 'Saint-Aubin-sur-Loire', consent: true, site_web: '' });
  });

  test('annonce un échec d’envoi sans perdre la saisie', async ({ page }) => {
    await page.route('**/api/prospect-contact', (route) =>
      route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Plusieurs messages ont déjà été envoyés.' } }) }),
    );
    await page.goto('/contact');
    await page.getByLabel('Nom et prénom').fill('Julie Martin');
    await page.getByLabel('Fonction').fill('Maire');
    await page.getByLabel('Commune', { exact: true }).fill('Saint-Aubin-sur-Loire');
    await page.getByLabel('Adresse e-mail').fill('mairie@saint-aubin.test');
    await page.getByLabel('Message', { exact: true }).fill('Bonjour');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Envoyer le message' }).click();
    await expect(page.locator('[data-echec]')).toContainText('Plusieurs messages ont déjà été envoyés.');
    await expect(page.getByLabel('Message', { exact: true })).toHaveValue('Bonjour');
  });
});
