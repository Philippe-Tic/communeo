#!/usr/bin/env node
/**
 * Démonstration publique (#359) : la commune fictive Saint-Aubin-sur-Loire construite par le renderer,
 * dans chaque thème, sous `dist/demo/<thème>/` (servie à `communeo.fr/demo/<thème>`). Lancé après
 * `astro build` (script `build`).
 *
 * Chaque site est un vrai build statique (fixtures `complete`) en mode démonstration (`DEMO=1` : bandeau
 * « Site de démonstration » avec le choix du thème, noindex, formulaires qui n'envoient rien), servi sous
 * un sous-dossier (`BASE_PATH`). Les emplacements hachurés des fixtures y sont remplacés par les vraies
 * photos de packages/fixtures/photos/ (comme pour les captures des thèmes), puis la recherche est indexée.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEMO_THEMES = ['institutionnel', 'moderne', 'journal', 'bourg'];

const renderer = fileURLToPath(new URL('../../renderer/', import.meta.url));
const photos = fileURLToPath(new URL('../../../packages/fixtures/photos/', import.meta.url));
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const site = 'https://communeo.fr';

/** Fichiers texte du site construit (pages, flux, manifeste, index des démarches) */
function textFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'pagefind' ? [] : textFiles(path);
    return /\.(html|xml|json|webmanifest|txt)$/.test(name) ? [path] : [];
  });
}

const names = readdirSync(photos)
  .filter((name) => name.endsWith('.jpg'))
  .map((name) => name.slice(0, -'.jpg'.length));
const photo = new RegExp(`(/fixtures/(?:${names.join('|')}))\\.svg`, 'g');

rmSync(join(dist, 'demo'), { recursive: true, force: true });
for (const theme of DEMO_THEMES) {
  const out = join(dist, 'demo', theme);
  console.log(`▸ Démonstration : thème ${theme}`);
  execFileSync('pnpm', ['astro', 'build'], {
    cwd: renderer,
    stdio: ['ignore', 'ignore', 'inherit'],
    env: {
      ...process.env,
      THEME: theme,
      DATA_SOURCE: 'fixtures',
      RENDER_MODE: 'static',
      DEMO: '1',
      DEMO_THEMES: DEMO_THEMES.join(','),
      BASE_PATH: `/demo/${theme}`,
      SITE_URL: `${site}/demo/${theme}`,
      OUT_DIR: out,
    },
  });
  // Vraies photos à la place des images hachurées de même nom
  for (const name of names) copyFileSync(join(photos, `${name}.jpg`), join(out, 'fixtures', `${name}.jpg`));
  for (const file of textFiles(out)) {
    const text = readFileSync(file, 'utf8');
    const replaced = text.replace(photo, '$1.jpg');
    if (replaced !== text) writeFileSync(file, replaced);
  }
  execFileSync('node', ['scripts/pagefind.mjs', out], { cwd: renderer, stdio: ['ignore', 'ignore', 'inherit'] });
  if (!existsSync(join(out, 'index.html'))) throw new Error(`Démonstration ${theme} : index.html manquant`);
}
console.log(`✓ Démonstration : ${DEMO_THEMES.length} thèmes dans dist/demo/`);
