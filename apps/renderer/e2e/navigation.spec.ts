/**
 * Navigation comme chez l'hébergeur : les liens internes, les adresses canoniques et les résultats de
 * recherche mènent à la page sans redirection (pas de `/actualites` → `/actualites/`, pas de `.html`).
 */
import { expect, test } from '@playwright/test';

test('les liens internes de l’accueil répondent sans redirection', async ({ page, request }) => {
  await page.goto('/');
  const hrefs = await page.locator('a[href^="/"]').evaluateAll((links) => [...new Set(links.map((a) => a.getAttribute('href')!))]);
  expect(hrefs.length).toBeGreaterThan(5);
  for (const href of hrefs.filter((h) => !h.startsWith('/fixtures/') && !/\.(pdf|ics|xml|svg)$/.test(h))) {
    const response = await request.get(href.split('#')[0]!, { maxRedirects: 0 });
    expect(response.status(), href).toBe(200);
  }
});

test('l’adresse canonique est celle de la page servie', async ({ page }) => {
  await page.goto('/actualites');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/actualites$/);
});

test('les résultats de recherche mènent aux pages, sans .html', async ({ page, request }) => {
  await page.goto('/recherche?q=mairie');
  const links = page.locator('[data-cn-search-results] a');
  await expect(links.first()).toBeVisible();
  for (const href of await links.evaluateAll((items) => items.map((a) => a.getAttribute('href')!))) {
    expect(href).not.toMatch(/\.html$/);
    expect((await request.get(href, { maxRedirects: 0 })).status(), href).toBe(200);
  }
});
