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
 *
 * Préalables : admin compilé (`--build` le recompile), builds de démonstration du renderer
 * (`E2E_THEMES=institutionnel,moderne,journal,bourg node e2e/build.mjs` dans apps/renderer).
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ChildProcess } from 'node:child_process';
import { chromium, type Browser, type BrowserContext } from '@playwright/test';
import { mockApi } from '../../../apps/admin/e2e/api';
import type { Plan } from '../src/lib/plans';
import { arreter, executer, RACINE, serveur, VIDEOS, videoDemandee } from './outils';

const id = videoDemandee();
const PORT_ADMIN = 4810;
const PORT_SITE = 4820;
const ORDINATEUR = { width: 1440, height: 900 };
const TELEPHONE = { width: 390, height: 844 };

const { captures, preparer } = (await import(`../src/videos/${id}/captures.ts`)) as { captures: Plan[]; preparer?: () => void };
const sortie = join(VIDEOS, 'public', 'captures', id);
await mkdir(sortie, { recursive: true });
preparer?.();

const serveurs: ChildProcess[] = [];
const sites = new Map<string, number>();

let adminPret = false;

async function admin(): Promise<string> {
  if (!adminPret) {
    if (process.argv.includes('--build') || !existsSync(join(RACINE, 'apps/admin/dist/index.html'))) {
      executer('pnpm', ['--filter', '@communeo/admin', 'exec', 'vite', 'build'], RACINE);
    }
    serveurs.push(await serveur('pnpm', ['--filter', '@communeo/admin', 'exec', 'vite', 'preview', '--port', String(PORT_ADMIN), '--strictPort', '--host', '127.0.0.1'], `http://127.0.0.1:${PORT_ADMIN}/connexion`));
    adminPret = true;
  }
  return `http://127.0.0.1:${PORT_ADMIN}`;
}

async function site(theme: string): Promise<string> {
  if (!existsSync(join(RACINE, `apps/renderer/.e2e/${theme}/index.html`))) {
    throw new Error(`Site de démonstration « ${theme} » absent : E2E_THEMES=${theme} node e2e/build.mjs dans apps/renderer`);
  }
  if (!sites.has(theme)) {
    const port = PORT_SITE + sites.size;
    serveurs.push(await serveur('node', ['e2e/serve.mjs', theme, String(port)], `http://127.0.0.1:${port}/`, join(RACINE, 'apps/renderer')));
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

const browser = await chromium.launch({ args: ['--lang=fr-FR'] });
try {
  for (const plan of captures) {
    const base = plan.ou === 'admin' ? await admin() : await site(plan.theme ?? 'institutionnel');
    const context = await contexte(browser, plan);
    const page = await context.newPage();
    if (plan.ou === 'admin') await mockApi(page, plan.options);
    await page.goto(base + plan.chemin);
    await page.waitForLoadState('networkidle');
    if (plan.ou === 'admin') await page.getByRole('heading', { level: 1 }).first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await plan.avant?.(page);
    // Pas de curseur clignotant ni d'animation dans les images
    await page.addStyleTag({ content: '*, *::before, *::after { caret-color: transparent !important; transition: none !important; animation: none !important; }' });
    const elements: Record<string, { x: number; y: number; width: number; height: number }> = {};
    for (const [nom, localiser] of Object.entries(plan.elements ?? {})) {
      const boite = await localiser(page).first().boundingBox();
      if (!boite) throw new Error(`${plan.nom} : élément « ${nom} » introuvable ou invisible`);
      elements[nom] = { x: Math.round(boite.x), y: Math.round(boite.y), width: Math.round(boite.width), height: Math.round(boite.height) };
    }
    const taille = page.viewportSize()!;
    await page.screenshot({ path: join(sortie, `${plan.nom}.png`) });
    const meta = { image: `captures/${id}/${plan.nom}.png`, largeur: taille.width, hauteur: taille.height, echelle: 2, url: plan.url, elements };
    await writeFile(join(sortie, `${plan.nom}.json`), `${JSON.stringify(meta, null, 2)}\n`);
    console.log(`✓ ${plan.nom} (${Object.keys(elements).length} éléments)`);
    await context.close();
  }
} finally {
  await browser.close();
  serveurs.forEach(arreter);
}
