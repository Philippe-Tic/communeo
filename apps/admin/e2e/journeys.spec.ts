/**
 * Parcours de référence du handoff (« Parcours et 1366 », #148), de bout en bout, à 1366 × 768 et à
 * 390 px, en clair et en sombre :
 * - A : créer et publier une actualité depuis le tableau de bord (erreur de publication corrigée
 *   depuis le récapitulatif, image décrite, publication, retour à la liste, mise en ligne) ;
 * - B : changer de thème avec aperçu (voir aussi appearance.spec.ts ; le parcours part d'une commune
 *   en Journal et passe en Institutionnel).
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

const narrow = (page: Page) => (page.viewportSize()?.width ?? 1440) < 1024;

for (const scheme of ['light', 'dark'] as const) {
  test.describe(scheme === 'light' ? 'mode clair' : 'mode sombre', () => {
    test.beforeEach(async ({ page }) => {
      const width = page.viewportSize()?.width ?? 0;
      test.skip(width !== 1366 && width !== 390, 'parcours à 1366 et 390 px');
      await page.emulateMedia({ colorScheme: scheme });
    });

    test('parcours A : créer et publier une actualité', async ({ page }) => {
      const { bodies, calls } = await mockApi(page, { alertSet: 'none' });
      // 1. Tableau de bord → « Nouvelle actualité »
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1, name: 'Bonjour Sophie' })).toBeVisible();
      await page
        .getByRole('navigation', { name: 'Raccourcis' })
        .getByRole('link', { name: 'Nouvelle actualité' })
        .click();

      // 2. Titre, catégorie ; un bloc Texte laissé vide
      await expect(page.getByRole('heading', { level: 1, name: 'Nouvelle actualité' })).toBeVisible();
      await page
        .getByRole('textbox', { name: 'Titre', exact: true })
        .fill('Nouveaux horaires de la déchetterie à partir du 1er octobre');
      await page.getByRole('combobox', { name: /^Catégorie/ }).selectOption({ label: 'Vie pratique' });
      await page.getByRole('button', { name: 'Ajouter un bloc', exact: true }).last().click();
      await page.getByRole('dialog', { name: 'Ajouter un bloc' }).getByRole('button', { name: 'Texte' }).click();

      // 4. Publier : refusé, récapitulatif focalisé, son lien amène au bloc ; rien n'est perdu
      await page.getByRole('button', { name: 'Publier', exact: true }).click();
      const summary = page.getByRole('alert').filter({ hasText: /empêchen? la publication/ });
      await expect(summary).toBeFocused();
      await summary.getByRole('link').first().click();
      const text = page.getByRole('textbox', { name: 'Texte' });
      await expect(text).toBeFocused();
      await text.pressSequentially(
        'À partir du 1er octobre, la déchetterie intercommunale ouvre du mardi au samedi, de 9 h à 12 h et de 14 h à 18 h.',
      );

      // 3. Une image de la médiathèque, décrite avant d'être insérée
      await page.getByRole('button', { name: 'Ajouter un bloc', exact: true }).last().click();
      await page.getByRole('dialog', { name: 'Ajouter un bloc' }).getByRole('button', { name: 'Image' }).click();
      // Le bouton du bloc, pas celui de l'image principale de l'actualité
      await page
        .getByRole('group', { name: 'Image (obligatoire)' })
        .getByRole('button', { name: 'Choisir une image' })
        .click();
      const picker = page.getByRole('dialog', { name: 'Choisir une image' });
      await picker.getByRole('button', { name: /forum-associations/ }).click();
      await picker.getByRole('textbox', { name: /Texte alternatif/ }).fill('Entrée de la déchetterie avec ses bennes');
      await picker.getByRole('button', { name: "Insérer l'image" }).click();
      await expect(picker).toBeHidden();
      await expectNoViolations(page);

      // 5. Publication : toast, mise en ligne du site en attente
      await page.getByRole('button', { name: 'Publier', exact: true }).click();
      await expect(page.getByRole('status').filter({ hasText: 'est publiée' })).toBeVisible();
      const published =
        bodies.filter((entry) => entry.type === 'articles' && entry.call === 'POST published').at(-1) ??
        bodies.filter((entry) => entry.type === 'articles' && entry.call === 'PUT published').at(-1);
      expect(published?.body.data).toMatchObject({
        title: 'Nouveaux horaires de la déchetterie à partir du 1er octobre',
        category: 'vie-pratique',
      });

      // 6. Retour à la liste : la nouvelle actualité en tête, publiée
      await page.getByRole('link', { name: 'Retour aux actualités' }).click();
      await expect(page.getByRole('heading', { level: 1, name: 'Actualités' })).toBeVisible();
      await expect(
        page
          .getByRole('link', { name: 'Nouveaux horaires de la déchetterie à partir du 1er octobre' })
          .locator('visible=true'),
      ).toBeVisible();
      expect(calls.some((call) => call.startsWith('GET /api/articles'))).toBe(true);
      await expectNoViolations(page);
    });

    test('parcours B : changer de thème avec aperçu, puis mise en ligne', async ({ page }) => {
      const { bodies, calls } = await mockApi(page, { theme: 'journal' });
      await page.goto('/');
      // Mon site → Apparence
      if (narrow(page)) await page.getByRole('button', { name: 'Menu' }).click();
      await page.getByRole('button', { name: 'Mon site' }).click();
      // Barre latérale en icônes à 1366 : « Mon site » ouvre un menu ; sinon il déplie ses liens
      await page
        .getByRole('menuitem', { name: 'Apparence' })
        .or(page.getByRole('link', { name: 'Apparence' }))
        .click();
      await expect(page.getByRole('heading', { level: 1, name: 'Apparence' })).toBeVisible();

      // 1-2. Aperçu plein écran du vrai site dans le thème
      await page.getByRole('button', { name: 'Prévisualiser le thème Institutionnel' }).click();
      const preview = page.getByRole('dialog', { name: /Aperçu de votre site dans le thème Institutionnel/ });
      await expect(preview.getByTitle(/Votre site dans le thème Institutionnel/)).toHaveAttribute(
        'src',
        /theme=institutionnel/,
      );

      // 3. Confirmation, mise en ligne immédiate cochée
      await preview.getByRole('button', { name: 'Choisir le thème Institutionnel' }).click();
      const confirm = page.getByRole('alertdialog', { name: 'Passer au thème Institutionnel ?' });
      await expect(confirm.getByRole('checkbox', { name: /Mettre en ligne immédiatement/ })).toBeChecked();
      await expectNoViolations(page);
      await confirm.getByRole('button', { name: 'Passer au thème Institutionnel' }).click();

      // 4. Enregistré, mise en ligne lancée ; Institutionnel est le thème actif
      await expect(confirm).toBeHidden();
      expect(bodies.filter((entry) => entry.call === 'PUT site').at(-1)!.body.data).toEqual({
        theme: 'institutionnel',
      });
      await expect.poll(() => calls).toContain('POST /api/deployment/trigger');
      await expect(
        page.getByRole('list', { name: 'Thèmes' }).getByRole('listitem').filter({ hasText: 'Institutionnel' }),
      ).toContainText('Thème actif');
    });
  });
}
