/**
 * Éditeur de blocs (#135), sur la page de référence /editeur-de-blocs (5 blocs : Texte, Encadré,
 * Image, Questions / réponses, Vidéo sans titre).
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

const cards = (page: Page) => page.locator('[data-block-key]');
const order = (page: Page) => cards(page).locator('[data-block-toggle] .font-semibold').allInnerTexts();
const labels = async (page: Page) => (await order(page)).map((text) => text.split(',')[0]!.trim());
/** Ordre des blocs affiché (attend la fin du rendu) */
const expectOrder = (page: Page, expected: string[]) => expect.poll(() => labels(page)).toEqual(expected);
const live = (page: Page) => page.locator('section[aria-labelledby] > [aria-live="polite"]');

async function open(page: Page) {
  await mockApi(page);
  await page.goto('/editeur-de-blocs');
  await expect(page.getByRole('heading', { level: 1, name: 'Éditeur de blocs' })).toBeVisible();
  await expect(cards(page)).toHaveCount(5);
}

test.describe('accessibilité', () => {
  test('sans violation : blocs repliés, bloc ouvert, catalogue, erreurs', async ({ page }) => {
    await open(page);
    await expectNoViolations(page);
    await page.getByRole('button', { name: /^Texte, position 1 sur 5/ }).click();
    await expect(page.getByRole('toolbar', { name: 'Mise en forme' })).toBeVisible();
    await expectNoViolations(page);
    await page.getByRole('button', { name: 'Ajouter un bloc', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Ajouter un bloc' })).toBeVisible();
    await expectNoViolations(page);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Publier', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'empêche' })).toBeVisible();
    await expectNoViolations(page);
  });
});

test.describe('organiser les blocs', () => {
  test('déplacer au clavier : Espace saisit, flèche déplace, Espace dépose, position annoncée', async ({ page }) => {
    await open(page);
    const handle = page.getByRole('button', { name: /^Déplacer le bloc Texte/ });
    await handle.focus();
    await page.keyboard.press('Space');
    await expect(page.getByText(/Bloc Texte saisi, position 1 sur 5/)).toBeAttached();
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(250);
    await page.keyboard.press('Space');
    await expect(page.getByText('Bloc Texte déplacé en position 2 sur 5.')).toBeAttached();
    await expectOrder(page, ['Encadré', 'Texte', 'Image', 'Questions / réponses', 'Vidéo']);
  });

  test('Échap annule le déplacement', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: /^Déplacer le bloc Encadré/ }).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(250);
    await page.keyboard.press('Escape');
    await expect(page.getByText(/Déplacement annulé, bloc Encadré reste en position 2 sur 5/)).toBeAttached();
    await expectOrder(page, ['Texte', 'Encadré', 'Image', 'Questions / réponses', 'Vidéo']);
  });

  test('monter et descendre par boutons, le focus suit le bloc', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('button', { name: 'Monter le bloc Texte' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Descendre le bloc Vidéo' })).toBeDisabled();
    await page.getByRole('button', { name: 'Descendre le bloc Texte' }).click();
    await expectOrder(page, ['Encadré', 'Texte', 'Image', 'Questions / réponses', 'Vidéo']);
    await expect(page.getByRole('button', { name: 'Descendre le bloc Texte' })).toBeFocused();
    await expect(live(page)).toHaveText('Bloc Texte déplacé en position 2 sur 5.');
  });

  test('dupliquer, puis supprimer et annuler la suppression', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Dupliquer le bloc Encadré' }).click();
    await expectOrder(page, ['Texte', 'Encadré', 'Encadré', 'Image', 'Questions / réponses', 'Vidéo']);
    await expect(page.getByRole('button', { name: /^Encadré, position 3 sur 6/ })).toBeFocused();

    await page.getByRole('button', { name: 'Supprimer le bloc Image' }).click();
    await expectOrder(page, ['Texte', 'Encadré', 'Encadré', 'Questions / réponses', 'Vidéo']);
    await expect(page.getByRole('button', { name: /^Questions \/ réponses, position 4 sur 5/ })).toBeFocused();
    const notice = page.getByRole('status').filter({ hasText: 'Bloc « Image » supprimé.' });
    await notice.getByRole('button', { name: 'Annuler' }).click();
    await expectOrder(page, ['Texte', 'Encadré', 'Encadré', 'Image', 'Questions / réponses', 'Vidéo']);
  });

  test('ajouter un bloc à une position choisie depuis le catalogue', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Ajouter un bloc en position 2 sur 6' }).click();
    const catalog = page.getByRole('dialog', { name: 'Ajouter un bloc' });
    await expect(catalog).toHaveAccessibleDescription('Le bloc sera inséré en position 2 sur 6.');
    await expect(page.getByText('Le bloc sera inséré ici')).toBeVisible();
    // Blocs de la médiathèque : présents mais pas encore disponibles
    await expect(catalog.getByRole('button', { name: 'Galerie' })).toHaveAttribute('aria-disabled', 'true');
    await catalog.getByRole('button', { name: 'Contact / lieu' }).click();
    await expect(catalog).toBeHidden();
    await expectOrder(page, ['Texte', 'Contact / lieu', 'Encadré', 'Image', 'Questions / réponses', 'Vidéo']);
    await expect(page.getByRole('textbox', { name: 'Nom du service ou du lieu' })).toBeFocused();
  });

  test('Échap ferme le catalogue et rend le focus au bouton', async ({ page }) => {
    await open(page);
    const add = page.getByRole('button', { name: 'Ajouter un bloc', exact: true });
    await add.click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(add).toBeFocused();
  });
});

test.describe('texte riche restreint', () => {
  async function openText(page: Page) {
    await open(page);
    await page.getByRole('button', { name: /^Texte, position 1 sur 5/ }).click();
    return page.getByRole('textbox', { name: 'Texte' });
  }

  test('un H1 ou du HTML collé est ramené aux éléments autorisés', async ({ page }) => {
    const editor = await openText(page);
    await editor.locator('p').click();
    await editor.evaluate((element) => {
      const data = new DataTransfer();
      data.setData('text/html', '<h1>Titre principal</h1><p style="color:red">Texte <u>souligné</u> <img src="x" onerror="alert(1)"></p><script>alert(1)</script><table><tr><td>Cellule</td></tr></table><h4>Petit titre</h4>');
      element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    });
    await expect(editor).toContainText('Titre principal');
    await expect(editor.locator('h1, h4, img, script, table, u, [style]')).toHaveCount(0);
    // Le document produit passe la validation de publication de core
    await page.getByRole('textbox', { name: 'Titre de la vidéo' }).count(); // (vidéo encore repliée)
    await page.getByRole('button', { name: 'Publier', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'empêche' }).getByRole('link')).toHaveText(['Bloc 5 (Vidéo) : Titre de la vidéo requis']);
  });

  test('barre d’outils au clavier, titres et gras', async ({ page }) => {
    const editor = await openText(page);
    const toolbar = page.getByRole('toolbar', { name: 'Mise en forme' });
    await toolbar.getByRole('combobox', { name: 'Style du paragraphe' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(toolbar.getByRole('button', { name: 'Gras' })).toBeFocused();
    await page.keyboard.press('End');
    await expect(toolbar.getByRole('button', { name: 'Liste numérotée' })).toBeFocused();

    // Le style s'applique au paragraphe où se trouve le curseur, même si la liste prend le focus
    await editor.locator('p').click();
    await toolbar.getByRole('combobox', { name: 'Style du paragraphe' }).selectOption('h3');
    await expect(editor.locator('h3')).toHaveText('La salle des fêtes accueille jusqu’à 180 personnes.');
    await expect(editor.locator('h2')).toHaveText('Tarifs de location');
    await expect(toolbar.getByRole('combobox', { name: 'Style du paragraphe' })).toHaveValue('h3');

    // Gras sur un mot sélectionné, bouton enfoncé
    // Sélection au clavier du mot « Tarifs » (Maj+flèches), comme une personne sans souris
    await editor.locator('h2').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('Home');
    for (let i = 0; i < 6; i += 1) await page.keyboard.press('Shift+ArrowRight');
    await toolbar.getByRole('button', { name: 'Gras' }).click();
    await expect(editor.locator('h2 strong')).toHaveText('Tarifs');
    await expect(toolbar.getByRole('button', { name: 'Gras' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('lien : Ctrl+K, adresse refusée puis acceptée', async ({ page }) => {
    const editor = await openText(page);
    await editor.locator('p').first().dblclick();
    await page.keyboard.press('ControlOrMeta+K');
    const address = page.getByRole('textbox', { name: 'Adresse du lien' });
    await expect(address).toBeFocused();
    await address.fill('javascript:alert(1)');
    await page.keyboard.press('Enter');
    await expect(address).toHaveAccessibleDescription('Adresse non autorisée : commencez par https://, mailto:, tel: ou /');
    await address.fill('/salle-des-fetes');
    await page.keyboard.press('Enter');
    await expect(editor.locator('a[href="/salle-des-fetes"]')).toHaveCount(1);
  });
});

test.describe('validation', () => {
  test('les blocs en erreur s’ouvrent, sont signalés et atteignables depuis le récapitulatif', async ({ page }) => {
    await open(page);
    await page.getByRole('textbox', { name: 'Titre', exact: true }).fill('');
    await page.getByRole('button', { name: 'Publier', exact: true }).click();
    const summary = page.getByRole('alert').filter({ hasText: 'empêchent' });
    await expect(summary.getByRole('link')).toHaveText(['Le titre est obligatoire', 'Bloc 5 (Vidéo) : Titre de la vidéo requis']);
    const video = page.getByRole('button', { name: /^Vidéo, position 5 sur 5/ });
    await expect(video).toHaveAttribute('aria-expanded', 'true');
    await expect(video).toContainText('1 erreur');
    await summary.getByRole('link', { name: /Titre de la vidéo requis/ }).click();
    const field = page.getByRole('textbox', { name: 'Titre de la vidéo' });
    await expect(field).toBeFocused();
    await expect(field).toHaveAccessibleDescription(/Titre de la vidéo requis/);
  });
});
