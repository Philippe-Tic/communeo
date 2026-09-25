/**
 * Critères RGAA qu'axe ne vérifie pas, pour chaque thème et chaque page de la commune de démonstration :
 * - 10.11 / WCAG 1.4.10 : à 320 px de large, pas de défilement horizontal (mobile) ;
 * - 10.12 / WCAG 1.4.12 : espacement du texte augmenté, rien ne déborde ni n'est coupé (ordinateur) ;
 * - 10.7 / WCAG 2.4.7 : chaque élément atteint au clavier a une prise de focus visible (ordinateur).
 */
import { expect, test, type Page } from '@playwright/test';
import { PAGES } from './pages';

/** Éléments qui dépassent à droite de la fenêtre (pour un message d'erreur utile) */
const overflowing = (page: Page, width: number) =>
  page.evaluate((limit) => {
    const describe = (element: Element) =>
      `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${[...element.classList].slice(0, 2).map((c) => `.${c}`).join('')}`;
    const found: string[] = [];
    for (const element of document.body.querySelectorAll('*')) {
      const box = element.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      // Contenus défilants voulus (listes horizontales) : leur conteneur ne déborde pas
      if (element.closest('[data-scroll-x], .cn-sr-only')) continue;
      if (box.right > limit + 1) found.push(`${describe(element)} (${Math.round(box.right)} px)`);
    }
    return { scrollWidth: document.documentElement.scrollWidth, found: found.slice(0, 5) };
  }, width);

/** Espacement du texte de WCAG 1.4.12 */
const TEXT_SPACING = `
  * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
  p { margin-bottom: 2em !important; }
`;

for (const path of PAGES) {
  test(`320 px sans défilement horizontal ${path}`, async ({ page }, info) => {
    test.skip(!info.project.name.endsWith('mobile'), 'Reflow vérifié à 320 px');
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(path);
    const result = await overflowing(page, 320);
    expect(result.scrollWidth, result.found.join(', ')).toBeLessThanOrEqual(320);
  });

  test(`espacement du texte augmenté ${path}`, async ({ page }, info) => {
    test.skip(!info.project.name.endsWith('desktop'), 'Espacement vérifié sur ordinateur');
    await page.goto(path);
    await page.addStyleTag({ content: TEXT_SPACING });
    const viewport = page.viewportSize()!.width;
    const result = await overflowing(page, viewport);
    expect(result.scrollWidth, result.found.join(', ')).toBeLessThanOrEqual(viewport);
    // Texte coupé : un bloc de texte qui masque son débordement vertical
    const clipped = await page.evaluate(() =>
      [...document.body.querySelectorAll<HTMLElement>('p, li, h1, h2, h3, a, button, label, dt, dd, span')]
        .filter((element) => {
          const style = getComputedStyle(element);
          if (!['hidden', 'clip'].includes(style.overflowY) || element.closest('.cn-sr-only, [aria-hidden="true"]')) return false;
          // Masqué visuellement à dessein (libellé pour lecteurs d'écran, piège à robots)
          if (element.offsetWidth <= 1 || element.offsetHeight <= 1 || style.clipPath !== 'none') return false;
          if (style.textOverflow === 'ellipsis' || style.webkitLineClamp !== 'none') return false;
          return element.scrollHeight > element.clientHeight + 2 && element.textContent!.trim() !== '';
        })
        .slice(0, 5)
        .map((element) => `${element.tagName.toLowerCase()}.${[...element.classList].join('.')} « ${element.textContent!.trim().slice(0, 40)} »`),
    );
    expect(clipped).toEqual([]);
  });

  test(`focus visible au clavier ${path}`, async ({ page }, info) => {
    test.skip(!info.project.name.endsWith('desktop'), 'Parcours clavier sur ordinateur');
    await page.goto(path);
    const invisible: string[] = [];
    for (let step = 0; step < 40; step += 1) {
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        if (!element || element === document.body) return null;
        const box = element.getBoundingClientRect();
        const outlined = (candidate: Element) => {
          const own = getComputedStyle(candidate);
          return own.outlineStyle !== 'none' && parseFloat(own.outlineWidth) > 0;
        };
        // Le focus peut être dessiné sur un conteneur (cartes cliquables : :has(a:focus-visible)) ; une
        // ombre ne compte que sur l'élément lui-même (une carte peut avoir une ombre permanente)
        let visible = outlined(element) || getComputedStyle(element).boxShadow !== 'none';
        for (let parent = element.parentElement, depth = 0; !visible && parent && depth < 5; parent = parent.parentElement, depth += 1) {
          visible = outlined(parent);
        }
        return {
          visible,
          onScreen: box.width > 0 && box.height > 0,
          label: `${element.tagName.toLowerCase()}${element.className ? `.${String(element.className).split(' ')[0]}` : ''} « ${(element.textContent ?? '').trim().slice(0, 30)} »`,
        };
      });
      if (!focus) break;
      if (focus.onScreen && !focus.visible) invisible.push(focus.label);
    }
    expect(invisible).toEqual([]);
  });
}
