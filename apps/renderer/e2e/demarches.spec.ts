/**
 * Démarches Service-Public, pour chaque thème : recherche dans toutes les fiches (index réduit de la
 * démonstration), page d'un dossier, fiche rattachée à son dossier, et démarches dans la recherche du site.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const violations = results.violations.map((v) => ({ rule: v.id, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

test('la recherche porte sur toutes les démarches et mène au dossier puis à la fiche', async ({ page }) => {
  await page.goto('/demarches');
  const search = page.getByRole('search', { name: 'Rechercher une démarche' });
  await search.getByLabel('Rechercher parmi toutes les démarches').fill("carte d'IDENTITE");
  await search.getByRole('button', { name: 'Rechercher' }).click();

  await expect(page.getByRole('status').filter({ hasText: /démarches pour/ })).toHaveText(/^\d+ démarches pour « carte d'IDENTITE »$/);
  await expect(page).toHaveURL(/\?q=carte/);
  const results = page.locator('[data-cn-demarches-results] > li');
  // Une question-réponse, absente de l'arborescence affichée, est trouvée aussi
  await expect(page.locator('[data-cn-demarches-results]').getByRole('link', { name: "Comment remplacer une carte d'identité abîmée ?" })).toBeVisible();
  await expect(results.first().getByRole('link')).toHaveText("Carte d'identité");
  await expectAccessible(page);

  // Le dossier de l'arborescence : ses fiches par sous-dossier (démonstration : « Carte d'identité »)
  await page.goto('/demarches');
  await page.getByText('Papiers - Citoyenneté - Élections', { exact: true }).click();
  await page.locator('.cn-demarches-themes').getByRole('link', { name: "Carte d'identité" }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("Carte d'identité");
  await expect(page.getByRole('heading', { level: 2, name: 'Les fiches de ce dossier' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Pour un majeur' })).toBeVisible();
  await expectAccessible(page);

  // La fiche : son contenu complet (situations, services en ligne, « Où s'adresser » renvoyant à la mairie)
  await page.getByRole('link', { name: 'Première demande' }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("Carte d'identité d'un majeur : première demande");
  await expect(page.getByRole('complementary', { name: "Où s'adresser ?" }).first()).toBeVisible();
  await expect(page.locator('[data-cn-demarche]').getByRole('link', { name: /pré-demande/i }).first()).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: "Dans le dossier « Carte d'identité »" })).toBeVisible();
  await expect(page.locator('a[aria-current="page"]', { hasText: 'Première demande' })).toHaveCount(1);
  await expectAccessible(page);
});

test('une recherche arrive préremplie depuis l’adresse', async ({ page }) => {
  await page.goto('/demarches?q=permis%20de%20construire');
  await expect(page.getByLabel('Rechercher parmi toutes les démarches')).toHaveValue('permis de construire');
  await expect(page.locator('[data-cn-demarches-results] > li').first().getByRole('link')).toHaveText('Permis de construire (PC)');
});

test('la recherche du site propose aussi les démarches', async ({ page }) => {
  await page.goto('/recherche?q=passeport');
  const section = page.getByRole('region', { name: 'Démarches administratives' });
  await expect(section.getByRole('link', { name: 'Passeport', exact: true })).toBeVisible();
  await expect(section.getByRole('link', { name: /^Voir les \d+ démarches pour « passeport »$/ })).toHaveAttribute('href', '/demarches?q=passeport');
  await expectAccessible(page);
});
