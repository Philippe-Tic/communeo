/**
 * Captures d'écran de la documentation utilisateur (docs/src/assets/captures), prises sur l'admin
 * avec les données de démonstration des tests (e2e/api.ts). Hors CI : `pnpm docs:captures`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, type Page } from '@playwright/test';
import { mockApi, type MockOptions } from './api';

const OUT = fileURLToPath(new URL('../../../docs/src/assets/captures/', import.meta.url));
/** Site de démonstration construit par le renderer (thème Institutionnel), montré dans la preview */
const SITE = fileURLToPath(new URL('../../renderer/.e2e/institutionnel/', import.meta.url));
const TYPES: Record<string, string> = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json' };

/**
 * Preview de l'admin : les vraies pages de la commune de démonstration plutôt que la page simulée des
 * tests. Les adresses du mock sont rapprochées d'une page de démonstration du même type.
 */
async function realPreview(page: Page) {
  await page.route('http://preview.test/**', (route) => {
    const { pathname } = new URL(route.request().url());
    const candidates = [
      pathname === '/' ? 'index.html' : pathname.slice(1),
      `${pathname.slice(1)}.html`,
      pathname.startsWith('/actualites/') ? 'actualites/reouverture-de-la-mediatheque.html' : '',
      pathname.startsWith('/agenda/') ? 'agenda/concert-de-rentree.html' : '',
      extname(pathname) ? '' : 'salle-des-fetes.html',
    ].filter(Boolean);
    const file = candidates.map((candidate) => `${SITE}${candidate}`).find((path) => existsSync(path) && !path.endsWith('/'));
    if (!file) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ status: 200, contentType: TYPES[extname(file)] ?? 'application/octet-stream', body: readFileSync(file) });
  });
}

interface Capture {
  /** Nom du fichier (sans extension) */
  name: string;
  route: string;
  options?: MockOptions;
  /** Largeur : ordinateur (défaut) ou mobile */
  mobile?: boolean;
  /** Préparation de l'écran avant la capture (ouvrir un panneau, un menu…) */
  before?: (page: Page) => Promise<void>;
}

const CAPTURES: Capture[] = [
  { name: 'connexion', route: '/connexion', options: { loggedIn: false } },
  { name: 'tableau-de-bord', route: '/' },
  { name: 'tableau-de-bord-mobile', route: '/', mobile: true },
  { name: 'assistant', route: '/assistant?etape=2' },
  { name: 'pages', route: '/pages' },
  { name: 'page-editeur', route: '/pages/p-salle' },
  {
    name: 'editeur-blocs',
    route: '/pages/p-salle',
    before: async (page) => {
      const toggle = page.locator('[data-block-toggle]').first();
      await toggle.click();
      await toggle.evaluate((element) => element.scrollIntoView({ block: 'start' }));
    },
  },
  {
    name: 'catalogue-blocs',
    route: '/pages/p-salle',
    before: async (page) => {
      await page.getByRole('button', { name: 'Ajouter un bloc', exact: true }).last().click();
      await page.getByRole('dialog', { name: 'Ajouter un bloc' }).waitFor();
    },
  },
  {
    name: 'programmer',
    route: '/actualites/a-conseil',
    before: async (page) => {
      await page.getByRole('button', { name: 'Programmer' }).click();
      await page.getByRole('dialog', { name: 'Programmer la publication' }).waitFor();
    },
  },
  {
    name: 'historique',
    route: '/pages/p-salle',
    before: async (page) => {
      await page.getByRole('button', { name: 'Autres actions' }).click();
      await page.getByRole('menuitem', { name: 'Historique' }).click();
      await page.getByRole('dialog').waitFor();
    },
  },
  { name: 'actualites', route: '/actualites' },
  { name: 'actualite-editeur', route: '/actualites/a-conseil' },
  { name: 'agenda', route: '/agenda' },
  { name: 'evenement-editeur', route: '/agenda/e-fete' },
  { name: 'documents', route: '/documents' },
  { name: 'document-nouveau', route: '/documents/nouvelle' },
  { name: 'equipe', route: '/equipe' },
  { name: 'associations', route: '/associations' },
  { name: 'associations-propositions', route: '/associations?onglet=propositions' },
  { name: 'alertes', route: '/alertes' },
  { name: 'alerte-nouvelle', route: '/alertes/nouvelle' },
  { name: 'dechets', route: '/dechets' },
  { name: 'cantine', route: '/cantine?semaine=2026-09-14' },
  { name: 'messages', route: '/messages?id=m-dubois' },
  { name: 'newsletter', route: '/newsletter' },
  { name: 'mediatheque', route: '/mediatheque' },
  { name: 'menu-du-site', route: '/mon-site/menu' },
  { name: 'apparence', route: '/mon-site/apparence' },
  { name: 'page-accueil', route: '/mon-site/accueil' },
  { name: 'informations', route: '/mon-site/informations' },
  { name: 'mentions-legales', route: '/mon-site/legal' },
  { name: 'accessibilite', route: '/mon-site/accessibilite' },
  { name: 'reseaux-sociaux', route: '/mon-site/reseaux' },
  { name: 'demarches', route: '/mon-site/demarches' },
  { name: 'open-data', route: '/mon-site/open-data' },
  { name: 'mise-en-ligne', route: '/mise-en-ligne' },
  { name: 'conformite', route: '/conformite' },
  { name: 'utilisateurs', route: '/utilisateurs' },
  { name: 'journal', route: '/journal' },
  { name: 'mon-compte', route: '/mon-compte' },
  { name: 'plateforme-communes', route: '/plateforme', options: { user: 'super_admin' } },
  { name: 'plateforme-commune', route: '/plateforme/communes/site-bellefontaine', options: { user: 'super_admin' } },
  { name: 'plateforme-statistiques', route: '/plateforme/statistiques', options: { user: 'super_admin' } },
];

test.skip(!process.env.DOCS_CAPTURES, 'Captures de la documentation : DOCS_CAPTURES=1 (pnpm docs:captures)');
// Champs date et nombres comme les verront les mairies
test.use({ locale: 'fr-FR', timezoneId: 'Europe/Paris', launchOptions: { args: ['--lang=fr-FR'] } });

for (const capture of CAPTURES) {
  test(`capture ${capture.name}`, async ({ page }) => {
    test.skip(page.viewportSize()?.width !== 1366, 'captures prises depuis le profil 1366 px');
    await page.setViewportSize(capture.mobile ? { width: 390, height: 844 } : { width: 1366, height: 860 });
    await mockApi(page, capture.options);
    if (existsSync(SITE)) await realPreview(page);
    // Site de la preview : choix des cookies déjà fait, pas de bandeau dans les images
    await page.context().addInitScript(() => {
      if (location.hostname === 'preview.test')
        localStorage.setItem('communeo-consent-v1', JSON.stringify({ media: false, decidedAt: new Date().toISOString() }));
    });
    await page.goto(capture.route);
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { level: 1 }).first().waitFor();
    await capture.before?.(page);
    // Pas de curseur clignotant ni d'animation dans les images
    await page.addStyleTag({ content: '*, *::before, *::after { caret-color: transparent !important; transition: none !important; animation: none !important; }' });
    await page.screenshot({ path: `${OUT}${capture.name}.png` });
  });
}
