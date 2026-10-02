/**
 * Démonstration publique (#359) : la commune fictive sous /demo/<thème>, construite par le renderer avec
 * la politique de sécurité de /demo (netlify.toml). Accessible (axe, WCAG 2.2 AA), jamais indexée, hors
 * du plan du site de communeo.fr ; liens, recherche, démarches et choix du thème restent dans la
 * démonstration ; les formulaires n'envoient rien.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const THEMES = [
  { id: 'institutionnel', name: 'Institutionnel' },
  { id: 'moderne', name: 'Moderne' },
  { id: 'journal', name: 'Journal' },
  { id: 'bourg', name: 'Bourg' },
];

/** Page de démonstration ouverte sans dépendre d'internet (météo simulée), erreurs du navigateur relevées */
async function open(page: Page, path: string) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        current: { temperature_2m: 14, weather_code: 1 },
        daily: { time: ['2026-10-06', '2026-10-07', '2026-10-08'], temperature_2m_max: [16, 17, 15], temperature_2m_min: [8, 9, 7], weather_code: [1, 2, 3] },
      }),
    }),
  );
  const response = await page.goto(path);
  return { response, errors };
}

async function expectAccessible(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

for (const theme of THEMES) {
  for (const path of ['', 'actualites', 'contact']) {
    test(`démonstration ${theme.name} /${path} : accessible, bandeau, jamais indexée`, async ({ page }) => {
      const { response, errors } = await open(page, `/demo/${theme.id}/${path}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
      const banner = page.getByRole('complementary', { name: 'Site de démonstration' });
      await expect(banner).toContainText('commune fictive');
      await expect(banner.getByRole('link', { name: 'Découvrir Communeo' })).toHaveAttribute('href', 'https://communeo.fr/');
      await expect(banner.getByRole('navigation', { name: 'Thème de la démonstration' }).getByRole('link', { name: theme.name })).toHaveAttribute('aria-current', 'page');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://communeo.fr/demo/${theme.id}${path ? `/${path}` : '/'}`);
      await expectAccessible(page);
      expect(errors).toEqual([]);
    });
  }
}

test('les liens restent dans la démonstration ; la même page dans un autre thème', async ({ page }) => {
  await open(page, '/demo/institutionnel/');
  // Les photos remplacent les images hachurées des fixtures
  const photo = page.locator('img[src$=".jpg"]').first();
  await expect(photo).toBeVisible();
  expect(await photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  const hrefs = await page.locator('a[href^="/"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')!));
  expect(hrefs.length).toBeGreaterThan(20);
  expect(hrefs.filter((href) => !href.startsWith('/demo/institutionnel/'))).toEqual([]);

  await page.goto('/demo/institutionnel/actualites/le-marche-du-samedi-s-agrandit');
  await page.getByRole('navigation', { name: 'Thème de la démonstration' }).getByRole('link', { name: 'Journal' }).click();
  await expect(page).toHaveURL(/\/demo\/journal\/actualites\/le-marche-du-samedi-s-agrandit$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Le marché du samedi s’agrandit');
});

test('/demo mène à la démonstration dans le thème Institutionnel', async ({ page }) => {
  await page.goto('/demo');
  await expect(page).toHaveURL(/\/demo\/institutionnel\/$/);
});

test('recherche du site et démarches dans la démonstration', async ({ page }) => {
  const { errors } = await open(page, '/demo/moderne/recherche?q=march%C3%A9');
  const result = page.getByRole('link', { name: 'Le marché du samedi s’agrandit' });
  await expect(result).toHaveAttribute('href', '/demo/moderne/actualites/le-marche-du-samedi-s-agrandit');

  // Démarches : l'arborescence (page construite), puis une fiche rendue dans le navigateur
  await page.goto('/demo/moderne/demarches');
  const fiches = await page.locator('a[href*="/demarches/fiche?id="]').evaluateAll((all) => all.map((link) => link.getAttribute('href')!));
  expect(fiches.length).toBeGreaterThan(0);
  expect(fiches.filter((href) => !href.startsWith('/demo/moderne/demarches/fiche?id='))).toEqual([]);
  await page.goto('/demo/moderne/demarches/fiche?id=F1234&public=particuliers');
  const links = page.locator('[data-cn-demarche] a[href^="/"]');
  await expect(links.first()).toBeAttached();
  expect((await links.evaluateAll((all) => all.map((link) => link.getAttribute('href')!))).filter((href) => !href.startsWith('/demo/moderne/'))).toEqual([]);
  expect(errors).toEqual([]);
});

test('les formulaires de la démonstration n’envoient rien', async ({ page }) => {
  const posts: string[] = [];
  page.on('request', (request) => request.method() === 'POST' && posts.push(request.url()));
  await open(page, '/demo/bourg/contact');
  const form = page.locator('form[method="post"]').first();
  const note = page.locator('.cn-demo-form').first();
  await expect(note).toHaveText('Formulaire de démonstration : rien ne sera envoyé.');
  await expect(note).toHaveAttribute('role', 'status');
  await form.evaluate((element: HTMLFormElement) => element.requestSubmit());
  await expect(note).toHaveText('Démonstration : rien n’a été envoyé, la commune est fictive.');
  expect(posts).toEqual([]);
});

test('la démonstration est hors du plan du site de communeo.fr, robots.txt inchangé', async ({ page }) => {
  const sitemap = await (await page.request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('https://communeo.fr/themes');
  expect(sitemap).not.toContain('/demo');
  const robots = await (await page.request.get('/robots.txt')).text();
  expect(robots).toBe('User-agent: *\nAllow: /\n\nSitemap: https://communeo.fr/sitemap.xml\n');
  // Les sites de démonstration ferment leur propre robots.txt (sans plan du site)
  expect(await (await page.request.get('/demo/journal/robots.txt')).text()).toBe('User-agent: *\nDisallow: /\n');
});
