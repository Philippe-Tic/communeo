/**
 * Critères RGAA qu'axe ne vérifie pas, pour chaque thème et chaque page de la commune de démonstration :
 * - 10.11 / WCAG 1.4.10 : à 320 px de large, pas de défilement horizontal (mobile) ;
 * - 10.12 / WCAG 1.4.12 : espacement du texte augmenté, rien ne déborde ni n'est coupé (ordinateur) ;
 * - 10.7 / WCAG 2.4.7 : chaque élément atteint au clavier a une prise de focus visible (ordinateur) ;
 * - 10.4 / WCAG 1.4.4 : texte seul agrandi à 200 %, rien ne déborde ni n'est coupé (ordinateur) ;
 * - 12.6 : une seule zone d'en-tête, de contenu principal et de pied de page, à chaque largeur ;
 * - 6.1 : aucun lien dont l'intitulé seul (« En savoir plus », « Lire la suite »…) ne dit pas la destination.
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

/**
 * Texte seul agrandi à 200 % : taille de police par défaut du navigateur doublée (réglage « Taille de
 * la police » de Chrome). Les tailles et les points de rupture en rem ou em suivent, comme chez
 * l'internaute.
 */
async function zoomText(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Page.setFontSizes', { fontSizes: { standard: 32, fixed: 26 } });
}

/** Blocs de texte qui masquent leur débordement vertical : le texte y est coupé */
const clippedText = (page: Page) =>
  page.evaluate(() =>
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

/** Intitulés qui ne disent rien hors contexte (un complément masqué pour les lecteurs d'écran suffit) */
const AMBIGUOUS_LINK = /^(en savoir plus|lire la suite|la suite|suite|voir|voir plus|plus|ici|cliquez ici|lien)( \(nouvelle fenêtre\))?$/i;

for (const path of PAGES) {
  test(`zones d'en-tête, de contenu et de pied de page uniques ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('contentinfo')).toHaveCount(1);
  });

  test(`liens explicites ${path}`, async ({ page }, info) => {
    test.skip(!info.project.name.endsWith('desktop'), 'Intitulés identiques à chaque largeur');
    await page.goto(path);
    const names = await page.getByRole('link', { name: AMBIGUOUS_LINK, includeHidden: true }).evaluateAll((links) =>
      links.map((link) => `« ${link.textContent!.trim()} » → ${link.getAttribute('href')}`),
    );
    expect(names).toEqual([]);
  });

  test(`texte agrandi à 200 % ${path}`, async ({ page }, info) => {
    test.skip(!info.project.name.endsWith('desktop'), 'Agrandissement vérifié sur ordinateur');
    await page.setViewportSize({ width: 1280, height: 800 });
    await zoomText(page);
    await page.goto(path);
    const result = await overflowing(page, 1280);
    expect(result.scrollWidth, result.found.join(', ')).toBeLessThanOrEqual(1280);
    expect(await clippedText(page)).toEqual([]);
  });

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
    expect(await clippedText(page)).toEqual([]);
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
