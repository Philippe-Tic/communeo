/**
 * Écrans de V3 (un contenu, quatre thèmes), dans l'ordre du montage : l'écran Apparence de l'admin, son
 * aperçu plein écran dans chacun des quatre thèmes (le vrai site de démonstration, servi par l'aperçu
 * simulé selon le paramètre `theme` de l'adresse), puis l'accueil de Saint-Aubin dans chaque thème.
 * Un mardi à 10 h : la mairie est « Ouverte ».
 */
import type { Page } from '@playwright/test';
import type { Plan } from '../../lib/plans';

const MARDI_10H = '2026-10-06T10:00:00+02:00';
const THEMES = ['institutionnel', 'moderne', 'journal', 'bourg'] as const;
const NOMS: Record<(typeof THEMES)[number], string> = { institutionnel: 'Institutionnel', moderne: 'Moderne', journal: 'Journal', bourg: 'Bourg' };

/** Bouton du thème dans la barre de l'aperçu (« Institutionnel actif » pour le thème en place) */
const bascule = (nom: string) => (p: Page) => p.getByRole('dialog').locator('fieldset label', { hasText: new RegExp(`^${nom}`) });

/** L'aperçu affiche le thème demandé : page chargée, polices et photos comprises */
async function apercuCharge(page: Page, theme: string) {
  await page.locator(`iframe[src*="theme=${theme}"]`).waitFor();
  const cadre = page.frameLocator(`iframe[src*="theme=${theme}"]`);
  await cadre.locator('body').waitFor();
  const frame = await page.locator(`iframe[src*="theme=${theme}"]`).elementHandle().then((e) => e?.contentFrame());
  await frame?.waitForLoadState('load');
  // Les images visibles de l'aperçu (celles plus bas, chargées en différé, ne viennent jamais)
  await cadre.locator('body').evaluate(async () => {
    await document.fonts.ready;
    const visibles = [...document.images].filter((img) => img.loading !== 'lazy' && !img.complete);
    await Promise.race([Promise.all(visibles.map((img) => new Promise((fin) => img.addEventListener('load', fin, { once: true })))), new Promise((fin) => setTimeout(fin, 3000))]);
  });
  await page.waitForTimeout(800);
}

async function ouvrirApercu(page: Page) {
  await page.getByRole('button', { name: 'Prévisualiser le thème Institutionnel' }).click();
  await page.getByRole('dialog').waitFor();
  await apercuCharge(page, 'institutionnel');
}

const choisir = (theme: (typeof THEMES)[number]) => async (page: Page) => {
  await ouvrirApercu(page);
  await bascule(NOMS[theme])(page).click();
  await apercuCharge(page, theme);
  // Le pointeur quitte la barre : pas de survol dans l'image
  await page.mouse.move(1430, 890);
};

const APERCU = {
  barre: (p: Page) => p.getByRole('dialog').locator('fieldset').first(),
  page: (p: Page) => p.getByRole('dialog').locator('iframe').first(),
  ...Object.fromEntries(THEMES.map((t) => [t, bascule(NOMS[t])])),
};

const apercu = (theme: (typeof THEMES)[number]): Plan => ({
  nom: `apercu-${theme}`,
  ou: 'admin',
  chemin: '/mon-site/apparence',
  url: 'app.communeo.fr/mon-site/apparence',
  heure: MARDI_10H,
  avant: theme === 'institutionnel' ? ouvrirApercu : choisir(theme),
  elements: APERCU,
});

export const captures: Plan[] = [
  {
    nom: 'apparence',
    ou: 'admin',
    chemin: '/mon-site/apparence',
    url: 'app.communeo.fr/mon-site/apparence',
    heure: MARDI_10H,
    elements: {
      titre: (p) => p.getByRole('heading', { level: 1 }),
      themes: (p) => p.getByRole('list', { name: 'Thèmes' }),
      previsualiser: (p) => p.getByRole('button', { name: 'Prévisualiser le thème Institutionnel' }),
    },
  },
  ...THEMES.map(apercu),
  // L'accueil du site dans chaque thème, toute la page (fin : les quatre côte à côte)
  ...THEMES.map(
    (theme): Plan => ({
      nom: `site-${theme}`,
      ou: 'site',
      theme,
      chemin: '/',
      heure: MARDI_10H,
      pleinePage: true,
      url: 'saint-aubin.communeo.fr',
    }),
  ),
];
