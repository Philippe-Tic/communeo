/**
 * Shell de l'admin (#131) : accessibilité (axe, WCAG 2.2 AA) en clair et en sombre, navigation au clavier,
 * barre latérale complète / en icônes / tiroir mobile, état de mise en ligne.
 */
import { expect, test, type Page } from '@playwright/test';
import { INVALID_LOGIN, mockApi } from './api';
import { expectNoViolations } from './axe';

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;

test.describe('accessibilité', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`shell sans violation (${scheme === 'light' ? 'clair' : 'sombre'})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await mockApi(page);
      await page.goto('/actualites');
      await expect(page.getByRole('heading', { level: 1, name: 'Actualités' })).toBeVisible();
      await expect(page.locator('html')).toHaveClass(scheme === 'dark' ? /dark/ : /^(?!.*dark)/);
      await expectNoViolations(page);
      if (isMobile(page)) {
        await page.getByRole('button', { name: 'Menu' }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await expectNoViolations(page);
      }
    });
  }

  test('page de connexion sans violation', async ({ page }) => {
    await mockApi(page, { loggedIn: false });
    await page.goto('/connexion');
    await expectNoViolations(page);
  });
});

test.describe('structure et clavier', () => {
  test('lien d’évitement, repères et titre', async ({ page }) => {
    await mockApi(page);
    await page.goto('/agenda');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page).toHaveTitle('Agenda — Saint-Aubin-sur-Loire · Communeo');
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('banner')).toHaveCount(1);

    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Aller au contenu' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
  });

  test('l’entrée active porte aria-current et la navigation amène le focus au titre', async ({ page }) => {
    test.skip(isMobile(page), 'navigation mobile testée plus bas');
    await mockApi(page);
    await page.goto('/pages');
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    await expect(nav.getByRole('link', { name: 'Pages', exact: true })).toHaveAttribute('aria-current', 'page');

    await nav.getByRole('link', { name: /^Messages/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Messages' })).toBeFocused();
    await expect(nav.getByRole('link', { name: /^Messages/ })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'Pages', exact: true })).not.toHaveAttribute('aria-current');
  });

  test('« Mon site » se déplie au clavier', async ({ page }) => {
    test.skip(isMobile(page), 'navigation mobile testée plus bas');
    await mockApi(page);
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    const wide = (page.viewportSize()?.width ?? 0) >= 1440;
    if (wide) {
      const toggle = nav.getByRole('button', { name: 'Mon site' });
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await toggle.focus();
      await page.keyboard.press('Enter');
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await nav.getByRole('link', { name: 'Menu du site' }).click();
    } else {
      await nav.getByRole('button', { name: 'Mon site' }).focus();
      await page.keyboard.press('Enter');
      await page.getByRole('menuitem', { name: 'Menu du site' }).click();
    }
    await expect(page.getByRole('heading', { level: 1, name: 'Menu du site' })).toBeVisible();
  });

  test('barre latérale en icônes à 1366 px, avec des noms accessibles', async ({ page }) => {
    test.skip(page.viewportSize()?.width !== 1366, 'largeur 1366 seulement');
    await mockApi(page, { unread: 3 });
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    const box = await nav.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(64);
    await expect(nav.getByRole('link', { name: 'Actualités' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Messages (3 non lus)' })).toBeVisible();
  });

  test('tiroir mobile : focus piégé, fermeture par Échap', async ({ page }) => {
    test.skip(!isMobile(page), 'mobile seulement');
    await mockApi(page);
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Menu' });
    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 40; i += 1) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await dialog.getByRole('link', { name: 'Agenda' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();
  });
});

test.describe('session et rôles', () => {
  test('sans session : page de connexion, puis retour à la page demandée', async ({ page }) => {
    await mockApi(page, { loggedIn: false });
    await page.goto('/agenda');
    await expect(page).toHaveURL(/\/connexion/);
    await page.getByRole('textbox', { name: 'E-mail' }).fill('sophie.leroy@saint-aubin.fr');
    await page.getByLabel('Mot de passe', { exact: true }).fill('mauvais');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    const error = page.getByRole('alert').filter({ hasText: INVALID_LOGIN });
    await expect(error).toBeVisible();
    await expect(error).toBeFocused();

    await page.getByLabel('Mot de passe', { exact: true }).fill('bon-mot-de-passe');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();
    // Aucun jeton dans le navigateur : la session est un cookie HttpOnly
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toMatch(/jwt|jeton/i);
  });

  test('se déconnecter ferme la session et ramène à la connexion', async ({ page }) => {
    const { calls } = await mockApi(page);
    await page.goto('/');
    if (isMobile(page)) {
      await page.getByRole('button', { name: /^Compte de/ }).click();
    } else {
      await page.getByRole('button', { name: 'Compte de Sophie Leroy' }).click();
    }
    await page.getByRole('menuitem', { name: 'Se déconnecter' }).click();
    await expect(page).toHaveURL(/\/connexion/);
    expect(calls).toContain('POST /api/session/logout');
    await page.goto('/agenda');
    await expect(page).toHaveURL(/\/connexion/);
  });

  test('un éditeur ne voit ni Utilisateurs ni Apparence', async ({ page }) => {
    test.skip(page.viewportSize()?.width !== 1440, 'une largeur suffit');
    await mockApi(page, { user: 'editor' });
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    await expect(nav.getByRole('link', { name: 'Utilisateurs' })).toHaveCount(0);
    await nav.getByRole('button', { name: 'Mon site' }).click();
    await expect(nav.getByRole('link', { name: 'Apparence' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Menu du site' })).toBeVisible();
  });
});

test.describe('mise en ligne', () => {
  test('en attente : bouton « Mettre en ligne », puis « en cours »', async ({ page }) => {
    const { calls } = await mockApi(page, { publication: 'pending' });
    await page.goto('/');
    if (isMobile(page)) await page.getByRole('button', { name: 'Menu' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Modifications en attente de mise en ligne' }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Mettre en ligne' }).first().click();
    await expect(page.getByText('Mise en ligne en cours…').filter({ visible: true })).toBeVisible();
    expect(calls).toContain('POST /api/deployment/trigger');
  });

  test('à jour : pas de bouton', async ({ page }) => {
    test.skip(isMobile(page), 'une largeur suffit');
    await mockApi(page, { publication: 'ok' });
    await page.goto('/');
    await expect(page.getByText('Site à jour')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mettre en ligne' })).toHaveCount(0);
  });
});
