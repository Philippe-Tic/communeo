/**
 * Référencement et partage, pour chaque thème : titre de l'accueil, image de partage générée
 * (PNG 1200 × 630), balises Open Graph absolues, un seul fil d'Ariane dans les données structurées,
 * sitemap sans pages exclues et avec dates.
 */
import { expect, test } from '@playwright/test';

test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, 'Même HTML à toutes les largeurs');

test('accueil : « Mairie de … – site officiel » et image de partage générée', async ({ page, request }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Mairie de Saint-Aubin-sur-Loire – site officiel');
  const og = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(og).toMatch(/^https:\/\/[^/]+\/og\.png$/);
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');

  const png = await request.get('/og.png');
  expect(png.headers()['content-type']).toContain('image/png');
  const body = await png.body();
  // En-tête PNG : largeur et hauteur (octets 16 à 23)
  expect(body.subarray(1, 4).toString()).toBe('PNG');
  expect([body.readUInt32BE(16), body.readUInt32BE(20)]).toEqual([1200, 630]);
});

test('actualité : type article, description, un seul fil d’Ariane, signée par la mairie', async ({ page }) => {
  await page.goto('/actualites/reouverture-de-la-mediatheque');
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{40,}/);
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!) as Array<Record<string, unknown>>;
  expect(ld.filter((item) => item['@type'] === 'BreadcrumbList')).toHaveLength(1);
  expect(ld.find((item) => item['@type'] === 'NewsArticle')?.publisher).toMatchObject({ name: 'Mairie de Saint-Aubin-sur-Loire' });
});

test('événement : la description donne la date et le lieu', async ({ page }) => {
  await page.goto('/agenda/concert-de-rentree');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /^Samedi 3 octobre.* · Salle des fêtes/);
});

test('sitemap : dates de mise à jour, jamais la recherche ni les fiches démarches', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  expect(xml).toContain('<lastmod>');
  expect(xml).not.toContain('/recherche');
  expect(xml).not.toContain('/demarches/fiche');
  expect(xml).toMatch(/<loc>https:\/\/[^<]+\/<\/loc>/);
});
