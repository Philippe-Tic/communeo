#!/usr/bin/env node
/**
 * Parité build statique / mode serveur (preview) : pour chaque thème et chaque page de la commune de
 * démonstration, le HTML rendu par le serveur doit être identique au HTML du site statique.
 * C'est la garantie que la preview montre exactement ce qui sera publié.
 *
 * Préalable : node e2e/build.mjs (sites statiques). Ce script construit la version serveur.
 */
import { execSync, spawn } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { outDir, themes } from './themes.mjs';

/**
 * Retire ce qui dépend légitimement du mode de build : chemins des bundles JS, styles de composants.
 * Les feuilles de styles liées restent comparées : en mode serveur, où tous les thèmes sont chargés,
 * une page ne doit lier que celle de son thème (noms par empreinte de contenu, identiques d'un build à l'autre).
 */
const normalize = (html) =>
  html
    .replace(/<script\b[^>]*\bsrc="[^"]*"[^>]*><\/script>/g, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '')
    .replace(/<script type="module"[^>]*>[\s\S]*?<\/script>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const port = 4600;
let failures = 0;

for (const theme of themes) {
  const staticDir = fileURLToPath(outDir(theme));
  const serverDir = fileURLToPath(new URL(`../.e2e/${theme}-server/`, import.meta.url));
  rmSync(serverDir, { recursive: true, force: true });
  execSync('pnpm astro build', {
    stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, THEME: theme, DATA_SOURCE: 'fixtures', OUT_DIR: serverDir, RENDER_MODE: 'server' },
  });

  const server = spawn('node', [`${serverDir}server/entry.mjs`], { env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) }, stdio: 'ignore' });
  for (let i = 0; i < 50; i += 1) {
    if (await fetch(`http://127.0.0.1:${port}/`).then((r) => r.ok).catch(() => false)) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const pages = JSON.parse(readFileSync(`${staticDir}pages.json`, 'utf8'));
  let different = 0;
  for (const path of pages) {
    const expected = normalize(readFileSync(`${staticDir}${path === '/' ? 'index' : path.slice(1)}.html`, 'utf8'));
    const actual = normalize(await fetch(`http://127.0.0.1:${port}${path}`).then((r) => r.text()));
    if (expected.length < 500 || !expected.includes('id="contenu"')) {
      different += 1;
      console.error(`✗ ${theme} ${path} : page statique vide ou incomplète`);
      continue;
    }
    if (expected !== actual) {
      different += 1;
      const at = [...expected].findIndex((char, i) => char !== actual[i]);
      console.error(`✗ ${theme} ${path}\n  statique : …${expected.slice(Math.max(0, at - 80), at + 120)}…\n  serveur  : …${actual.slice(Math.max(0, at - 80), at + 120)}…`);
    }
  }
  server.kill();
  console.log(`${different ? '✗' : '✓'} ${theme} : ${pages.length - different}/${pages.length} pages identiques en statique et en mode serveur`);
  failures += different;
}

// Un seul serveur, tous les thèmes : chaque page ne lie que la feuille de styles de son thème (#290)
const stylesheets = (html) => [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map((match) => match[0]).join(' ');
const shared = fileURLToPath(new URL(`../.e2e/${themes.at(-1)}-server/`, import.meta.url));
const server = spawn('node', [`${shared}server/entry.mjs`], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), RENDER_MODE: 'server', DATA_SOURCE: 'fixtures' },
  stdio: 'ignore',
});
for (let i = 0; i < 50; i += 1) {
  if (await fetch(`http://127.0.0.1:${port}/`).then((r) => r.ok).catch(() => false)) break;
  await new Promise((resolve) => setTimeout(resolve, 200));
}
for (const theme of themes) {
  const expected = stylesheets(readFileSync(`${fileURLToPath(outDir(theme))}contact.html`, 'utf8'));
  const actual = stylesheets(await fetch(`http://127.0.0.1:${port}/contact`, { headers: { Cookie: `communeo_preview_theme=${theme}` } }).then((r) => r.text()));
  const ok = expected !== '' && actual === expected;
  console.log(`${ok ? '✓' : '✗'} ${theme} : seule sa feuille de styles en preview${ok ? '' : `\n  attendu : ${expected}\n  reçu    : ${actual}`}`);
  if (!ok) failures += 1;
}
server.kill();

process.exit(failures ? 1 : 0);
