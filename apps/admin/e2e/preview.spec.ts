/**
 * Panneau de preview (#136) : vraie page du serveur de preview dans une iframe, rechargée après chaque
 * enregistrement, largeurs mobile / tablette / bureau, redimensionnable, masquable, plein écran.
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi, type MockOptions } from './api';
import { expectNoViolations } from './axe';

const width = (page: Page) => page.viewportSize()?.width ?? 1440;
const frame = (page: Page) => page.getByTitle('Aperçu de « Location de la salle des fêtes »').first();

async function open(page: Page, path = '/pages/p-salle', options: MockOptions = {}) {
  await page.clock.install();
  const mock = await mockApi(page, { publication: 'ok', ...options });
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  return mock;
}

test.describe('panneau à côté de l’éditeur (1200 px et plus)', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1200, 'panneau affiché à partir de 1200 px');

  test('affiche la page du brouillon et se recharge après chaque enregistrement', async ({ page }) => {
    await open(page);
    const panel = page.getByRole('complementary', { name: 'Aperçu du brouillon' });
    await expect(panel).toContainText('Aperçu du brouillon — thème Institutionnel');
    // Une seule commande d'aperçu dans la barre : le plein écran (le tiroir est pour les petits écrans)
    await expect(page.getByRole('button', { name: 'Aperçu', exact: true }).filter({ visible: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Aperçu plein écran' }).filter({ visible: true })).toHaveCount(2);
    await expect(frame(page)).toHaveAttribute('src', 'http://preview.test/location-salle-des-fetes?token=jeton-signe&v=0');
    await expect(page.frameLocator('iframe').first().locator('#version')).toHaveText('version 0');

    await page.getByRole('textbox', { name: 'Titre', exact: true }).fill('Location de la salle des fêtes (2026)');
    await page.clock.fastForward(5500);
    await expect(page.getByTitle(/^Aperçu de/).first()).toHaveAttribute('src', /&v=1$/);
    await expect(page.frameLocator('iframe').first().locator('#version')).toHaveText('version 1');
    await expectNoViolations(page);
  });

  test('largeur de l’appareil au clavier (boutons radio) et cadre de téléphone', async ({ page }) => {
    await open(page);
    const group = page.getByRole('radiogroup', { name: "Largeur de l'aperçu" });
    await expect(group.getByRole('radio', { name: 'Bureau (1280 px)' })).toHaveAttribute('aria-checked', 'true');
    await group.getByRole('radio', { name: 'Bureau (1280 px)' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(group.getByRole('radio', { name: 'Mobile (390 px)' })).toHaveAttribute('aria-checked', 'true');
    await expect(group.getByRole('radio', { name: 'Mobile (390 px)' })).toBeFocused();
    // L'iframe a la vraie largeur d'un téléphone, réduite pour tenir dans le cadre
    await expect(frame(page)).toHaveCSS('width', '390px');
    await expect(frame(page)).toHaveCSS('transform', /matrix\(0\.[5-8]/);
  });

  test('séparateur redimensionnable au clavier, panneau masquable (mémorisé)', async ({ page }) => {
    await open(page);
    const separator = page.getByRole('separator', { name: "Largeur de l'aperçu" });
    // 520 px par défaut, 420 px sous 1440 px
    const initial = width(page) >= 1440 ? 520 : 420;
    await expect(separator).toHaveAttribute('aria-valuenow', String(initial));
    await separator.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(separator).toHaveAttribute('aria-valuenow', String(initial + 24));
    await page.keyboard.press('End');
    await expect(separator).toHaveAttribute('aria-valuenow', '380');

    await page.getByRole('button', { name: "Masquer l'aperçu" }).click();
    await expect(page.getByRole('complementary', { name: 'Aperçu du brouillon' })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('button', { name: "Afficher l'aperçu" })).toBeVisible();
    await page.getByRole('button', { name: "Afficher l'aperçu" }).click();
    await expect(page.getByRole('separator', { name: "Largeur de l'aperçu" })).toHaveAttribute('aria-valuenow', '380');
  });

  test('plein écran, fermé par Échap', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Aperçu plein écran' }).first().click();
    const dialog = page.getByRole('dialog', { name: /Aperçu plein écran/ });
    await expect(dialog.getByTitle(/^Aperçu de/)).toBeVisible();
    await expectNoViolations(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test("nouvelle page : l'aperçu attend le premier enregistrement", async ({ page }) => {
    await open(page, '/pages/nouvelle');
    await expect(page.getByRole('complementary', { name: 'Aperçu du brouillon' })).toContainText("L'aperçu s'affichera après le premier enregistrement.");
  });

  test('serveur de preview indisponible : message clair', async ({ page }) => {
    await open(page, '/pages/p-salle', { previewUnavailable: true });
    await expect(page.getByRole('complementary', { name: 'Aperçu du brouillon' })).toContainText('Aperçu indisponible pour le moment.');
  });
});

test('sous 1200 px : aperçu en tiroir ; sur mobile : plein écran', async ({ page }) => {
  test.skip(width(page) >= 1200, 'panneau affiché à partir de 1200 px');
  await open(page);
  await expect(page.getByRole('complementary', { name: 'Aperçu du brouillon' })).toBeHidden();
  await page.getByRole('button', { name: 'Aperçu', exact: true }).filter({ visible: true }).click();
  const dialog = width(page) < 768 ? page.getByRole('dialog', { name: /Aperçu plein écran/ }) : page.getByRole('dialog', { name: 'Aperçu' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTitle(/^Aperçu de/)).toBeVisible();
  await expectNoViolations(page);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
