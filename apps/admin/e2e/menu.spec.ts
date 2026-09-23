/**
 * Menu du site (#137) : arbre du menu (limites, types, indentation), clavier, glisser-déposer,
 * enregistrement explicite, aperçu en direct du menu non enregistré, « Afficher dans le menu »
 * dans l'éditeur de page.
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

const desktopOnly = (page: Page) => test.skip((page.viewportSize()?.width ?? 1440) < 1200, 'aperçu en colonne : 1200 px et plus');
const entry = (page: Page, label: string) => page.locator('li[data-entry]').filter({ has: page.getByText(label, { exact: true }) }).first();
const save = (page: Page) => page.getByRole('button', { name: 'Enregistrer', exact: true });

async function openMenu(page: Page, options: Parameters<typeof mockApi>[1] = {}) {
  const mock = await mockApi(page, { pageSet: 'many', ...options });
  await page.goto('/mon-site/menu');
  await expect(page.getByRole('heading', { level: 1, name: 'Menu du site' })).toBeVisible();
  await expect(entry(page, 'Actualités')).toBeVisible();
  return mock;
}

async function addEntry(page: Page, type: string, fill: (dialog: ReturnType<Page['getByRole']>) => Promise<unknown>, button = 'Ajouter une entrée') {
  await page.getByRole('button', { name: button }).click();
  const dialog = page.getByRole('dialog');
  if (type) await dialog.getByRole('radio', { name: new RegExp(`^${type}`) }).check();
  await fill(dialog);
  await dialog.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await expect(dialog).toBeHidden();
}

test.describe('accessibilité', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`menu sans violation (${scheme === 'light' ? 'clair' : 'sombre'})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await openMenu(page);
      await expect(page.getByText('3 entrées sur 7 · un seul niveau de sous-menu · 10 liens par sous-menu')).toBeVisible();
      await expect(entry(page, 'Vie pratique')).toContainText('2 sous-entrées sur 10');
      await expect(entry(page, 'Location de la salle des fêtes')).toContainText('/location-salle-des-fetes');
      await expectNoViolations(page);
    });
  }

  test('fenêtre d’ajout sans violation, erreurs récapitulées', async ({ page }) => {
    await openMenu(page);
    await page.getByRole('button', { name: 'Ajouter une entrée' }).click();
    const dialog = page.getByRole('dialog', { name: 'Ajouter une entrée au menu' });
    await dialog.getByRole('radio', { name: /^Lien externe/ }).check();
    await dialog.getByRole('textbox', { name: /^Adresse/ }).fill('javascript:alert(1)');
    await dialog.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await expect(dialog.getByRole('alert').filter({ hasText: '2 champs à compléter' })).toBeFocused();
    await expect(dialog.getByText("L'adresse doit commencer par https://, mailto: ou tel:").first()).toBeVisible();
    await expectNoViolations(page);
  });
});

test.describe('arbre du menu', () => {
  test('ajouter une rubrique, une page (brouillon signalé), un lien', async ({ page }) => {
    await openMenu(page);
    await addEntry(page, 'Rubrique', (dialog) => dialog.getByRole('combobox', { name: /^Rubrique/ }).selectOption({ label: 'Contact' }));
    await addEntry(page, 'Page', (dialog) => dialog.getByRole('combobox', { name: /^Page/ }).selectOption({ label: 'Jardins familiaux (brouillon)' }));
    await expect(entry(page, 'Jardins familiaux')).toContainText('Page en brouillon : elle apparaîtra dans le menu une fois publiée.');
    await expect(page.getByText('5 entrées sur 7')).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Modifications non enregistrées' })).toBeVisible();
    // Focus sur la nouvelle entrée
    await expect(entry(page, 'Jardins familiaux').getByRole('button', { name: 'Modifier « Jardins familiaux »' })).toBeFocused();
  });

  test('7 entrées : ajout désactivé, limite expliquée', async ({ page }) => {
    await openMenu(page, {
      navigation: { main: ['actualites', 'agenda', 'documents', 'equipe', 'associations', 'dechets', 'contact'].map((section) => ({ type: 'section', section })), footer: [] },
    });
    await expect(page.getByText('7 entrées sur 7')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ajouter une entrée' })).toBeDisabled();
    await expect(page.getByText('Menu complet : retirez une entrée pour en ajouter une.')).toBeVisible();
  });

  test('indenter crée le sous-menu, désindenter en sort ; blocages expliqués', async ({ page }) => {
    await openMenu(page);
    // « Agenda » sous le groupe « Vie pratique » : indentable
    await page.getByRole('button', { name: /^Indenter « Agenda »/ }).click();
    await expect(entry(page, 'Vie pratique')).toContainText('3 sous-entrées sur 10');
    await expect(page.getByRole('status').filter({ hasText: '« Agenda » placé dans le groupe « Vie pratique ».' })).toBeAttached();
    // Le focus suit l'entrée déplacée
    await expect(page.getByRole('button', { name: /^Désindenter « Agenda »/ })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByText('3 entrées sur 7')).toBeVisible();

    // « Actualités » n'a pas de groupe au-dessus : action bloquée, raison lisible, toujours focalisable
    const blocked = page.getByRole('button', { name: /^Indenter « Actualités »/ });
    await expect(blocked).toHaveAttribute('aria-disabled', 'true');
    await expect(blocked).toHaveAccessibleName(/placez cette entrée juste sous un groupe/);
    await blocked.focus();
    await expect(page.getByRole('tooltip')).toContainText('placez cette entrée juste sous un groupe');
  });

  test('monter / descendre au clavier, annoncé, focus conservé', async ({ page }) => {
    await openMenu(page);
    await page.getByRole('button', { name: 'Descendre « Actualités »' }).click();
    await expect(page.getByRole('status').filter({ hasText: '« Actualités » déplacé en position 2 sur 3.' })).toBeAttached();
    await expect(page.getByRole('button', { name: 'Descendre « Actualités »' })).toBeFocused();
    const labels = page.locator('section[aria-labelledby="menu-principal"] > ol > li[data-entry] > div > span > span:first-child');
    await expect(labels).toHaveText(['Vie pratique', 'Actualités', 'Agenda']);
  });

  test('glisser-déposer au clavier avec la poignée', async ({ page }) => {
    await openMenu(page);
    await page.getByRole('button', { name: 'Déplacer « Agenda », position 3 sur 3' }).focus();
    await page.keyboard.press('Space');
    await expect(page.getByText(/« Agenda » saisi, position 3 sur 3/)).toBeAttached();
    // Le temps que dnd-kit mesure les positions (un humain n'est jamais aussi rapide)
    await page.waitForTimeout(250);
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(250);
    await page.keyboard.press('Space');
    await expect(page.getByText('« Agenda » déplacé en position 2 sur 3.')).toBeAttached();
    await expect(page.getByRole('button', { name: 'Déplacer « Agenda », position 2 sur 3' })).toBeVisible();
  });

  test('supprimer un groupe retire ses sous-entrées', async ({ page }) => {
    await openMenu(page);
    await page.getByRole('button', { name: 'Supprimer « Vie pratique »' }).click();
    await expect(page.getByRole('status').filter({ hasText: '« Vie pratique » retiré du menu, avec ses 2 sous-entrées.' })).toBeAttached();
    await expect(page.getByText('2 entrées sur 7')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ajouter une entrée' })).toBeFocused();
  });

  test('liens de pied de page, pages obligatoires ajoutées automatiquement', async ({ page }) => {
    await openMenu(page);
    const footer = page.locator('section[aria-labelledby="pied-de-page"]');
    await expect(footer).toContainText('ajoutées automatiquement');
    await expect(entry(page, 'Service-Public')).toContainText('www.service-public.fr');
    await addEntry(page, 'Rubrique', (dialog) => dialog.getByRole('combobox', { name: /^Rubrique/ }).selectOption({ label: 'Contact' }), 'Ajouter un lien de pied de page');
    await expect(footer).toContainText('2 liens sur 12');
    // Pas de groupe dans le pied de page
    await page.getByRole('button', { name: 'Ajouter un lien de pied de page' }).click();
    await expect(page.getByRole('dialog').getByRole('radio', { name: /^Groupe/ })).toHaveCount(0);
  });
});

test.describe('enregistrement et aperçu', () => {
  test('aperçu en direct du menu non enregistré, puis enregistrement', async ({ page }) => {
    desktopOnly(page);
    const { previewPosts, bodies, site } = await openMenu(page);
    const preview = page.frameLocator('aside[aria-label="Aperçu du menu"] iframe');
    await expect(preview.getByRole('navigation', { name: 'Menu principal' })).toContainText('Vie pratique');

    await page.getByRole('button', { name: 'Modifier « Agenda »' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: /^Libellé/ }).fill('Sorties');
    await dialog.getByRole('button', { name: 'Appliquer' }).click();
    // Le serveur de preview reçoit le menu non enregistré, avec le jeton
    await expect(preview.getByRole('navigation', { name: 'Menu principal' })).toContainText('Sorties');
    expect(previewPosts.at(-1)).toMatchObject({ token: 'jeton-signe' });
    await expect(page.getByText("Aperçu de l'accueil avec vos modifications — thème Institutionnel")).toBeVisible();
    expect(bodies.filter((entry) => entry.call === 'PUT site')).toHaveLength(0);

    await save(page).click();
    await expect(page.getByRole('status').filter({ hasText: 'Menu enregistré.' })).toBeVisible();
    await expect(save(page)).toBeDisabled();
    expect((site.navigation_config as { main: Array<{ label: string | null }> }).main[2]).toEqual({ type: 'section', section: 'agenda', label: 'Sorties' });
  });

  test('annuler les modifications rétablit le menu enregistré', async ({ page }) => {
    await openMenu(page);
    await page.getByRole('button', { name: 'Supprimer « Agenda »' }).click();
    await page.getByRole('button', { name: 'Annuler les modifications' }).click();
    await expect(entry(page, 'Agenda')).toBeVisible();
    await expect(save(page)).toBeDisabled();
  });

  test('quitter avec des modifications : enregistrer et quitter', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 1440) < 768, 'navigation dans le tiroir sur mobile');
    const { bodies } = await openMenu(page);
    await page.getByRole('button', { name: 'Supprimer « Agenda »' }).click();
    await page.getByRole('link', { name: 'Pages' }).first().click();
    const dialog = page.getByRole('alertdialog', { name: 'Modifications non enregistrées' });
    await dialog.getByRole('button', { name: 'Enregistrer et quitter' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Pages' })).toBeVisible();
    expect(bodies.filter((entry) => entry.call === 'PUT site')).toHaveLength(1);
  });
});

test.describe('« Afficher dans le menu » (éditeur de page)', () => {
  test('ajoute la page à la fin du menu, puis l’en retire ; la liste suit', async ({ page }) => {
    const { site } = await mockApi(page, { pageSet: 'many' });
    await page.goto('/pages/p-2');
    const toggle = page.getByRole('switch', { name: 'Afficher dans le menu' });
    await expect(toggle).not.toBeChecked();
    await toggle.click();
    await expect(page.getByRole('status').filter({ hasText: 'Page ajoutée à la fin du menu.' })).toBeVisible();
    await expect(toggle).toBeChecked();
    expect((site.navigation_config as { main: unknown[] }).main.at(-1)).toEqual({ type: 'page', pageDocumentId: 'p-2', label: null });

    // Déjà dans un sous-menu : l'interrupteur est coché, le retirer la sort du groupe
    await page.goto('/pages/p-salle');
    await expect(toggle).toBeChecked();
    await toggle.click();
    await expect(toggle).not.toBeChecked();
    expect(JSON.stringify(site.navigation_config)).not.toContain('p-salle');
  });

  test('menu plein : la page n’est pas ajoutée, message clair', async ({ page }) => {
    await mockApi(page, { pageSet: 'many', navigation: { main: ['actualites', 'agenda', 'documents', 'equipe', 'associations', 'dechets', 'contact'].map((section) => ({ type: 'section', section })), footer: [] } });
    await page.goto('/pages/p-2');
    await page.getByRole('switch', { name: 'Afficher dans le menu' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Le menu est plein (7 entrées)' })).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Afficher dans le menu' })).not.toBeChecked();
  });

  test('colonne « Dans le menu » de la liste des pages', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 1440) < 768, 'tableau');
    await mockApi(page, { pageSet: 'many' });
    await page.goto('/pages');
    const row = page.getByRole('table').locator('tbody tr').filter({ has: page.getByRole('link', { name: 'Location de la salle des fêtes', exact: true }) });
    await expect(row).toContainText('Oui');
  });
});
