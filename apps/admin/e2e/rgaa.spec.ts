/**
 * Critères RGAA qu'axe ne vérifie pas, sur chaque écran de l'admin :
 * - 10.11 / WCAG 1.4.10 : à 320 px de large, pas de défilement horizontal de la page ;
 * - 10.7 / WCAG 2.4.7 : chaque élément atteint au clavier a une prise de focus visible (1366 px).
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { PLATFORM_ROUTES, ROUTES } from './routes';

async function reflow(page: Page, routes: string[]) {
  const found: string[] = [];
  for (const route of routes) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 }), route).toBeVisible();
    const result = await page.evaluate(() => {
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
    if (result.width > 320) found.push(`${route} — ${result.width} px : ${result.culprits.join(', ')}`);
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
