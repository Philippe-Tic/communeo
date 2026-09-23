/**
 * Médiathèque dans les contenus (#142) : blocs Image, Galerie et Documents, image principale, fenêtre
 * de sélection (texte alternatif saisi au choix de l'image, enregistré avec le fichier) ; une image
 * sans texte alternatif est signalée avant publication et se corrige depuis le récapitulatif.
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

const picker = (page: Page, name: string) => page.getByRole('dialog', { name });

/** Dernier brouillon envoyé, après avoir laissé passer le délai d'enregistrement automatique */
function lastDraft(page: Page, bodies: Array<{ type?: string; body: { data: Record<string, unknown> } }>) {
  return async () => {
    await page.clock.fastForward(5500);
    return bodies.filter((entry) => entry.type === 'pages').at(-1)?.body.data;
  };
}

async function addBlock(page: Page, label: string) {
  await page.getByRole('button', { name: 'Ajouter un bloc', exact: true }).last().click();
  await page.getByRole('dialog', { name: 'Ajouter un bloc' }).getByRole('button', { name: label }).click();
}

test('bloc Image : image choisie sans texte alternatif, décrite dans la fenêtre, insérée', async ({ page }) => {
  const { bodies } = await mockApi(page);
  await page.clock.install();
  await page.goto('/pages/p-salle');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await addBlock(page, 'Image');
  await page
    .getByRole('region', { name: /Contenu de la page/ })
    .getByRole('button', { name: 'Choisir une image' })
    .click();
  const dialog = picker(page, 'Choisir une image');
  await expect(dialog.getByRole('button', { name: "Insérer l'image" })).toBeDisabled();
  // Documents exclus : seulement les images
  await expect(dialog.getByRole('list', { name: 'Fichiers' }).getByRole('listitem')).toHaveCount(4);
  await dialog.getByRole('button', { name: /forum-associations/ }).click();
  await dialog.getByRole('button', { name: "Insérer l'image" }).click();
  await expect(dialog.getByRole('alert')).toHaveText(
    "Décrivez l'image avant de l'insérer : le texte alternatif est obligatoire.",
  );
  await expect(dialog.getByRole('textbox', { name: /Texte alternatif/ })).toBeFocused();
  await expectNoViolations(page);
  await dialog.getByRole('textbox', { name: /Texte alternatif/ }).fill('Stands des associations');
  await dialog.getByRole('button', { name: "Insérer l'image" }).click();
  await expect(dialog).toBeHidden();

  expect(bodies.find((entry) => entry.call === 'PUT media mi-2')!.body.data).toEqual({
    alt_text: 'Stands des associations',
  });
  await expect(page.getByText('« Stands des associations »')).toBeVisible();
  const draft = lastDraft(page, bodies);
  await expect
    .poll(async () => ((await draft())?.blocks as Array<Record<string, unknown>> | undefined)?.at(-1))
    .toMatchObject({ __component: 'blocks.image', image: 502 });
});

test('publication : image sans texte alternatif signalée, corrigée depuis le récapitulatif', async ({ page }) => {
  const { bodies } = await mockApi(page, { pageImageWithoutAlt: true });
  await page.goto('/pages/p-salle');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Publier', exact: true }).click();
  const summary = page.getByRole('alert').filter({ hasText: 'empêche la publication' });
  await expect(summary).toBeFocused();
  await expect(summary).toContainText("Bloc 3 (Image) : Texte alternatif manquant sur l'image");
  expect(bodies.filter((entry) => entry.call === 'PUT published')).toHaveLength(0);

  await summary.getByRole('link', { name: /Texte alternatif manquant/ }).click();
  const fix = page.getByRole('button', { name: 'Ajouter le texte alternatif' });
  await expect(fix).toBeFocused();
  await fix.click();
  const dialog = page.getByRole('dialog', { name: 'Texte alternatif' });
  await dialog
    .getByRole('textbox', { name: /Ce que montre l'image/ })
    .fill('Stands des associations dans la salle omnisports');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toBeHidden();
  expect(bodies.find((entry) => entry.call === 'PUT media mi-2')!.body.data).toEqual({
    alt_text: 'Stands des associations dans la salle omnisports',
  });

  await page.getByRole('button', { name: 'Publier', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'est publiée' })).toBeVisible();
});

test('galerie : plusieurs images, ordre ; documents : fichiers de la médiathèque', async ({ page }) => {
  const { bodies } = await mockApi(page);
  await page.clock.install();
  await page.goto('/pages/p-salle');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await addBlock(page, 'Galerie');
  await page.getByRole('button', { name: 'Choisir des images' }).click();
  const gallery = picker(page, 'Ajouter des images');
  await gallery.getByRole('button', { name: /salle-des-fetes-exterieur/ }).click();
  await gallery.getByRole('button', { name: /blason/ }).click();
  await gallery.getByRole('button', { name: /conseil-municipal/ }).click();
  await expect(gallery.getByText('3 sélectionnés')).toBeVisible();
  await gallery.getByRole('button', { name: 'Ajouter les images' }).click();
  // conseil-municipal.jpg n'a pas de texte alternatif : demandé avant d'ajouter
  await expect(gallery.getByRole('alert')).toContainText("Décrivez l'image avant de l'insérer");
  await gallery.getByRole('textbox', { name: /Texte alternatif/ }).fill('Le conseil municipal en séance');
  await gallery.getByRole('button', { name: 'Ajouter les images' }).click();
  await expect(gallery).toBeHidden();
  await expect(page.getByText('3 images sur 12 au maximum.')).toBeVisible();
  await page.getByRole('button', { name: 'Reculer salle-des-fetes-exterieur.jpg' }).click();

  await addBlock(page, 'Documents');
  await page.getByRole('button', { name: 'Choisir des documents' }).click();
  const documents = picker(page, 'Ajouter des documents');
  await expect(documents.getByRole('list', { name: 'Fichiers' }).getByRole('listitem')).toHaveCount(1);
  await documents.getByRole('button', { name: /reglement-salle/ }).click();
  await documents.getByRole('button', { name: 'Ajouter les documents' }).click();
  await expect(page.getByText('reglement-salle.pdf')).toBeVisible();

  const draft = lastDraft(page, bodies);
  await expect
    .poll(async () => ((await draft())?.blocks as Array<Record<string, unknown>> | undefined)?.slice(-2))
    .toEqual([
      expect.objectContaining({ __component: 'blocks.gallery', images: [504, 501, 505] }),
      expect.objectContaining({ __component: 'blocks.documents', files: [503] }),
    ]);
});

test('image principale : choisie, envoyée, retirée', async ({ page }) => {
  const { bodies } = await mockApi(page);
  await page.clock.install();
  await page.goto('/pages/p-salle');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page
    .getByRole('group', { name: /Image principale/ })
    .getByRole('button', { name: 'Choisir une image' })
    .click();
  const dialog = picker(page, 'Choisir une image');
  await dialog.getByRole('button', { name: /salle-des-fetes-exterieur/ }).click();
  await expect(dialog.getByRole('textbox', { name: /Texte alternatif/ })).toHaveValue(
    'Façade de la salle des fêtes Jean-Moulin',
  );
  await dialog.getByRole('button', { name: "Insérer l'image" }).click();
  const draft = lastDraft(page, bodies);
  await expect.poll(async () => (await draft())?.featured_image).toBe(501);
  await page
    .getByRole('group', { name: /Image principale/ })
    .getByRole('button', { name: 'Retirer' })
    .click();
  await expect.poll(async () => (await draft())?.featured_image).toBeNull();
});

test('envoyer depuis la fenêtre : le fichier envoyé est choisi', async ({ page }) => {
  await mockApi(page);
  await page.goto('/actualites/a-conseil');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page
    .getByRole('group', { name: /^Image/ })
    .getByRole('button', { name: 'Choisir une image' })
    .click();
  const dialog = picker(page, 'Choisir une image');
  await dialog.getByRole('tab', { name: 'Envoyer un fichier' }).click();
  await dialog
    .locator('input[type=file]')
    .setInputFiles({ name: 'marche.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgo=', 'base64') });
  await expect(dialog.getByRole('tab', { name: 'Médiathèque' })).toHaveAttribute('aria-selected', 'true');
  await expect(dialog.getByRole('button', { name: /marche\.png/ })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('textbox', { name: /Texte alternatif/ }).fill('Le marché du samedi');
  await dialog.getByRole('button', { name: "Insérer l'image" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('« Le marché du samedi »')).toBeVisible();
});
