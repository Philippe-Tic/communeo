/**
 * Captures d'une vidéo : `pnpm videos:captures <vidéo>`.
 *
 * Lit `src/videos/<vidéo>/captures.ts` et enregistre chaque écran en 2x (retina) dans
 * public/captures/<vidéo>/<nom>.png, avec un JSON à côté : taille en pixels CSS, adresse affichée, et le
 * rectangle des éléments repérés (getBoundingClientRect). Curseur, zooms et saisies partent de ce JSON.
 *
 * Aucune donnée réelle, jamais la production :
 * - admin : le build de l'admin servi en local (vite preview), API Strapi simulée par le mock des tests
 *   (apps/admin/e2e/api.ts : commune fictive Saint-Aubin-sur-Loire, données publiques, devis simulés) ;
 * - site : le site de démonstration construit par le renderer à partir des fixtures.
 * Les images de démonstration (emplacements hachurés) sont remplacées par les photos libres de droits de
 * packages/fixtures/photos/ (voir son README), sur le site comme dans l'admin : les fixtures ne changent pas.
 *
 * Préalables : admin compilé (`--build` le recompile), builds de démonstration du renderer
 * (`E2E_THEMES=institutionnel,moderne,journal,bourg node e2e/build.mjs` dans apps/renderer).
 */
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import type { ChildProcess } from 'node:child_process';
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { mockApi } from '../../../apps/admin/e2e/api';
import type { Plan } from '../src/lib/plans';
import { arreter, executer, partage, ports, RACINE, serveur, VIDEOS, videoDemandee } from './outils';

const id = videoDemandee();
const { admin: PORT_ADMIN, site: PORT_SITE } = ports(id);
const ORDINATEUR = { width: 1440, height: 900 };
const TELEPHONE = { width: 390, height: 844 };

const { captures, preparer } = (await import(`../src/videos/${id}/captures.ts`)) as { captures: Plan[]; preparer?: () => void };
const sortie = join(VIDEOS, 'public', 'captures', id);
// Aucune capture périmée d'un plan retiré : le dossier est refait à chaque fois
await rm(sortie, { recursive: true, force: true });
await mkdir(sortie, { recursive: true });
preparer?.();

const serveurs: ChildProcess[] = [];
const sites = new Map<string, number>();

let adminPret = false;

async function admin(): Promise<string> {
  if (!adminPret) {
    // Le build de l'admin de cette copie de travail : le mock de l'API (et donc ses changements) est
    // appliqué au moment de la capture, mais un changement d'un écran de l'admin demande `--build`
    if (process.argv.includes('--build') || !existsSync(join(RACINE, 'apps/admin/dist/index.html'))) {
      executer('pnpm', ['--filter', '@communeo/admin', 'exec', 'vite', 'build'], RACINE);
    }
    serveurs.push(await serveur('pnpm', ['--filter', '@communeo/admin', 'exec', 'vite', 'preview', '--port', String(PORT_ADMIN), '--strictPort', '--host', '127.0.0.1'], `http://127.0.0.1:${PORT_ADMIN}/connexion`));
    adminPret = true;
  }
  return `http://127.0.0.1:${PORT_ADMIN}`;
}

async function site(theme: string): Promise<string> {
  // Builds de démonstration : ceux de cette copie de travail, sinon ceux du dépôt principal
  const renderer = partage(`apps/renderer/.e2e/${theme}/index.html`).replace(/\.e2e\/[^/]+\/index\.html$/, '');
  if (!existsSync(join(renderer, `.e2e/${theme}/index.html`))) {
    throw new Error(`Site de démonstration « ${theme} » absent : E2E_THEMES=${theme} node e2e/build.mjs dans apps/renderer`);
  }
  if (!sites.has(theme)) {
    const port = PORT_SITE + sites.size;
    serveurs.push(await serveur('node', ['e2e/serve.mjs', theme, String(port)], `http://127.0.0.1:${port}/`, renderer));
    sites.set(theme, port);
  }
  return `http://127.0.0.1:${sites.get(theme)}`;
}

async function contexte(browser: Browser, plan: Plan): Promise<BrowserContext> {
  const telephone = plan.appareil === 'telephone';
  const context = await browser.newContext({
    viewport: telephone ? TELEPHONE : ORDINATEUR,
    deviceScaleFactor: 2,
    isMobile: telephone,
    hasTouch: telephone,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    reducedMotion: 'reduce',
  });
  // Choix des cookies déjà fait : pas de bandeau de consentement dans les images
  await context.addInitScript(() => localStorage.setItem('communeo-consent-v1', JSON.stringify({ media: false, decidedAt: new Date().toISOString() })));
  return context;
}

const TYPES: Record<string, string> = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json' };

/** Thèmes des builds de démonstration servis par l'aperçu */
const THEMES_APERCU = ['institutionnel', 'moderne', 'journal', 'bourg'];

/** Thème demandé à l'aperçu (`?theme=<id>`, comme le vrai serveur de preview) : par la page, ou par celle qui la charge */
function themeApercu(url: URL, referent?: string): string | undefined {
  const theme = url.searchParams.get('theme') ?? (referent?.startsWith('http://preview.test/') ? new URL(referent).searchParams.get('theme') : null);
  return theme && THEMES_APERCU.includes(theme) ? theme : undefined;
}

/**
 * Aperçu de l'éditeur : les vraies pages du site de démonstration (comme les captures de la doc) plutôt
 * que la page simulée des tests. Une adresse du mock est rapprochée d'une page du même type. Le thème
 * vient de l'adresse (`theme`, écran Apparence), Institutionnel par défaut ; un fichier absent de son
 * build (police chargée par une feuille de style, sans le paramètre) est cherché dans les autres.
 */
async function vraiApercu(page: Page) {
  if (!existsSync(`${partage('apps/renderer/.e2e/institutionnel')}/`)) return;
  await page.route('http://preview.test/**', (route) => {
    const url = new URL(route.request().url());
    const { pathname } = url;
    const demande = themeApercu(url, route.request().headers().referer) ?? 'institutionnel';
    const sites = [demande, ...THEMES_APERCU.filter((t) => t !== demande)].map((t) => `${partage(`apps/renderer/.e2e/${t}`)}/`);
    const candidats = [
      pathname === '/' ? 'index.html' : pathname.slice(1),
      `${pathname.slice(1)}.html`,
      pathname.startsWith('/actualites/') ? 'actualites/reouverture-de-la-mediatheque.html' : '',
      extname(pathname) ? '' : 'salle-des-fetes.html',
    ].filter(Boolean);
    const fichier = sites.flatMap((site) => candidats.map((c) => `${site}${c}`)).find((p) => existsSync(p) && !p.endsWith('/'));
    if (!fichier) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ status: 200, contentType: TYPES[extname(fichier)] ?? 'application/octet-stream', body: readFileSync(fichier) });
  });
}

/** Photos libres de droits (packages/fixtures/photos/<nom>.jpg) à la place des images de démonstration de même nom */
const PHOTOS = join(RACINE, 'packages/fixtures/photos');
async function photos(page: Page) {
  // Enregistrée en dernier : prioritaire sur les routes du mock et de l'aperçu
  await page.route(/\/(fixtures|uploads)\/[\w-]+\.(svg|jpe?g|png)(\?.*)?$/, (route) => {
    const nom = new URL(route.request().url()).pathname.split('/').pop()!.replace(/\.\w+$/, '');
    const photo = join(PHOTOS, `${nom}.jpg`);
    if (!existsSync(photo)) return route.fallback();
    return route.fulfill({ status: 200, contentType: 'image/jpeg', body: readFileSync(photo) });
  });
}

const browser = await chromium.launch({ args: ['--lang=fr-FR'] });
/** Chromium complet, pour les PDF (visionneuse intégrée) : lancé seulement si un plan en montre un */
let complet: Browser | null = null;
try {
  for (const plan of captures) {
    const base = plan.ou === 'admin' ? await admin() : await site(plan.theme ?? 'institutionnel');
    if (plan.pdf) complet ??= await chromium.launch({ channel: 'chromium', args: ['--lang=fr-FR'] });
    const context = await contexte(plan.pdf ? complet! : browser, plan);
    const page = await context.newPage();
    if (plan.heure) await page.clock.setFixedTime(new Date(plan.heure));
    if (plan.ou === 'admin') {
      await mockApi(page, plan.options);
      await vraiApercu(page);
    }
    await plan.donnees?.(page);
    await photos(page);
    await page.goto(base + plan.chemin);
    await page.waitForLoadState('networkidle');
    if (plan.ou === 'admin' && !plan.pdf) await page.getByRole('heading', { level: 1 }).first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await plan.avant?.(page);
    // Pas de curseur clignotant ni d'animation dans les images
    await page.addStyleTag({ content: '*, *::before, *::after { caret-color: transparent !important; transition: none !important; animation: none !important; }' });
    if (plan.pleinePage) await page.evaluate(() => window.scrollTo(0, 0));
    const elements: Record<string, { x: number; y: number; width: number; height: number }> = {};
    for (const [nom, localiser] of Object.entries(plan.elements ?? {})) {
      const boite = await localiser(page).first().boundingBox();
      if (!boite) throw new Error(`${plan.nom} : élément « ${nom} » introuvable ou invisible`);
      elements[nom] = { x: Math.round(boite.x), y: Math.round(boite.y), width: Math.round(boite.width), height: Math.round(boite.height) };
    }
    const vue = page.viewportSize()!;
    const taille = plan.pleinePage ? { width: vue.width, height: await page.evaluate(() => document.documentElement.scrollHeight) } : vue;
    await page.screenshot({ path: join(sortie, `${plan.nom}.png`), fullPage: plan.pleinePage });
    const meta = { image: `captures/${id}/${plan.nom}.png`, largeur: taille.width, hauteur: taille.height, echelle: 2, url: plan.url, vue: vue.height, elements };
    await writeFile(join(sortie, `${plan.nom}.json`), `${JSON.stringify(meta, null, 2)}\n`);
    console.log(`✓ ${plan.nom} (${Object.keys(elements).length} éléments)`);
    await context.close();
  }
} finally {
  await browser.close();
  await complet?.close();
  serveurs.forEach(arreter);
}
