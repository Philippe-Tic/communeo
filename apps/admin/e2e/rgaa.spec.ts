/**
 * Critères RGAA qu'axe ne vérifie pas, sur chaque écran de l'admin :
 * - 10.11 / WCAG 1.4.10 : à 320 px de large, pas de défilement horizontal de la page ;
 * - 10.7 / WCAG 2.4.7 : chaque élément atteint au clavier a une prise de focus visible (1366 px) ;
 * - 10.4 / WCAG 1.4.4 : texte seul agrandi à 200 % (1280 px), pas de défilement horizontal ;
 * - 12.6 / 6.1 : une seule zone de contenu principal, aucun lien à l'intitulé vague (« En savoir plus »…).
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { PLATFORM_ROUTES, ROUTES } from './routes';

/** Largeur de la page et éléments les plus profonds qui dépassent à droite de la fenêtre */
const overflow = (page: Page) =>
  page.evaluate(() => {
    const culprits: string[] = [];
    for (const element of document.body.querySelectorAll('*')) {
      const box = element.getBoundingClientRect();
      if (box.width === 0 || box.right <= window.innerWidth + 1 || element.closest('.sr-only')) continue;
      // Élément le plus profond qui dépasse : c'est lui qu'il faut corriger
      if ([...element.children].some((child) => child.getBoundingClientRect().right >= box.right - 0.5)) continue;
      culprits.push(`${element.tagName.toLowerCase()}.${[...element.classList].slice(0, 3).join('.')} (${Math.round(box.right)} px)`);
    }
    return { width: document.documentElement.scrollWidth, culprits: culprits.slice(0, 3) };
  });

async function reflow(page: Page, routes: string[]) {
  const found: string[] = [];
  for (const route of routes) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 }), route).toBeVisible();
    const result = await overflow(page);
    if (result.width > 320) found.push(`${route} — ${result.width} px : ${result.culprits.join(', ')}`);
  }
  expect(found).toEqual([]);
}

/** Intitulés qui ne disent rien hors contexte (un complément masqué pour les lecteurs d'écran suffit) */
const AMBIGUOUS_LINK = /^(en savoir plus|lire la suite|la suite|suite|voir|voir plus|plus|ici|cliquez ici|lien)( \(nouvelle fenêtre\))?$/i;

async function structure(page: Page, routes: string[]) {
  const found: string[] = [];
  for (const route of routes) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 }), route).toBeVisible();
    const mains = await page.getByRole('main').count();
    if (mains !== 1) found.push(`${route} — ${mains} zones de contenu principal`);
    const vague = await page.getByRole('link', { name: AMBIGUOUS_LINK }).evaluateAll((links) =>
      links.map((link) => `« ${link.textContent!.trim()} » → ${link.getAttribute('href')}`),
    );
    for (const link of vague) found.push(`${route} — lien ${link}`);
  }
  expect(found).toEqual([]);
}

async function textZoom(page: Page, routes: string[]) {
  const found: string[] = [];
  for (const route of routes) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 }), route).toBeVisible();
    // Zoom du texte seul du navigateur : la taille de base double, les tailles en rem suivent
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    const result = await overflow(page);
    if (result.width > 1280) found.push(`${route} — ${result.width} px : ${result.culprits.join(', ')}`);
  }
  expect(found).toEqual([]);
}

async function focusVisible(page: Page, routes: string[]) {
  const found: string[] = [];
  for (const route of routes) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 }), route).toBeVisible();
    for (let step = 0; step < 40; step += 1) {
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        if (!element || element === document.body) return null;
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const ring = (candidate: Element) => {
          const own = getComputedStyle(candidate);
          return own.outlineStyle !== 'none' && parseFloat(own.outlineWidth) > 0;
        };
        // Anneau de focus : contour, ou ombre (anneau Tailwind) sur l'élément lui-même ; un conteneur
        // peut aussi le porter (:has(:focus-visible))
        let visible = ring(element) || style.boxShadow !== 'none';
        for (let parent = element.parentElement, depth = 0; !visible && parent && depth < 4; parent = parent.parentElement, depth += 1) {
          visible = ring(parent);
        }
        return {
          visible,
          onScreen: box.width > 0 && box.height > 0,
          label: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${element.getAttribute('type') ? `[${element.getAttribute('type')}]` : ''} « ${(element.getAttribute('aria-label') ?? element.textContent ?? '').trim().slice(0, 30)} »`,
        };
      });
      if (!focus) break;
      if (focus.onScreen && !focus.visible) found.push(`${route} — ${focus.label}`);
    }
  }
  expect([...new Set(found)]).toEqual([]);
}

test('320 px : aucun écran de la commune ne défile à l’horizontale', async ({ page }) => {
  test.skip(page.viewportSize()?.width !== 390, 'vérifié à 320 px depuis le profil mobile');
  test.setTimeout(ROUTES.length * 4_000);
  await page.setViewportSize({ width: 320, height: 640 });
  await mockApi(page);
  await reflow(page, ROUTES);
});

test("320 px : aucun écran de l'espace équipe ne défile à l’horizontale", async ({ page }) => {
  test.skip(page.viewportSize()?.width !== 390, 'vérifié à 320 px depuis le profil mobile');
  await page.setViewportSize({ width: 320, height: 640 });
  await mockApi(page, { user: 'super_admin' });
  await reflow(page, PLATFORM_ROUTES);
});

test('focus visible au clavier sur chaque écran de la commune', async ({ page }) => {
  test.skip(page.viewportSize()?.width !== 1366, 'parcours clavier à 1366 px');
  test.setTimeout(ROUTES.length * 8_000);
  await mockApi(page);
  await focusVisible(page, ROUTES);
});

test('zones et liens explicites sur chaque écran de la commune', async ({ page }) => {
  test.skip(page.viewportSize()?.width !== 1440, 'structure vérifiée à 1440 px');
  test.setTimeout(ROUTES.length * 4_000);
  await mockApi(page);
  await structure(page, ROUTES);
});

test("zones et liens explicites sur chaque écran de l'espace équipe", async ({ page }) => {
  test.skip(page.viewportSize()?.width !== 1440, 'structure vérifiée à 1440 px');
  await mockApi(page, { user: 'super_admin' });
  await structure(page, PLATFORM_ROUTES);
});

test('texte agrandi à 200 % sur chaque écran de la commune', async ({ page }) => {
  test.skip(page.viewportSize()?.width !== 1366, 'agrandissement vérifié à 1280 px');
  test.setTimeout(ROUTES.length * 4_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await mockApi(page);
  await textZoom(page, ROUTES);
});

test("texte agrandi à 200 % sur chaque écran de l'espace équipe", async ({ page }) => {
  test.skip(page.viewportSize()?.width !== 1366, 'agrandissement vérifié à 1280 px');
  await page.setViewportSize({ width: 1280, height: 800 });
  await mockApi(page, { user: 'super_admin' });
  await textZoom(page, PLATFORM_ROUTES);
});
