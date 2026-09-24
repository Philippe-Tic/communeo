#!/usr/bin/env node
/**
 * Génère la vignette 1200 × 800 d'un thème pour le sélecteur de thème de l'admin :
 * un panneau de présentation à gauche, l'accueil de la commune de démonstration à droite.
 *
 *   pnpm theme:thumbnail institutionnel
 *
 * Les couleurs et les arguments du panneau viennent du thème (--color, --tagline, --points) ;
 * --sans et --serif désignent ses polices dans le build (début du nom du fichier .woff2).
 */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    color: { type: 'string', default: '#1F5A3C' },
    tagline: { type: 'string', default: '' },
    points: { type: 'string', multiple: true, default: [] },
    port: { type: 'string', default: '4599' },
    sans: { type: 'string', default: 'source-sans-3-latin-wght-normal' },
    serif: { type: 'string', default: 'source-serif-4-latin-wght-normal' },
  },
});

const theme = positionals[0];
const root = new URL('../', import.meta.url);
if (!theme || !existsSync(new URL(`themes/${theme}/package.json`, root))) {
  console.error('Utilisation : pnpm theme:thumbnail <thème>');
  process.exit(1);
}

// Nom et description viennent du registre des thèmes (packages/core), seule source de vérité
const registry = readFileSync(new URL('packages/core/src/site/themes.ts', root), 'utf8');
const entry = new RegExp(`id: '${theme}', name: '([^']+)', description: '([^']+)'`).exec(registry);
const manifest = { name: entry?.[1] ?? theme, description: entry?.[2] ?? '' };

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${command} a échoué (${code})`))));
  });

// Même dossier que les tests : serve.mjs sait le servir
const out = fileURLToPath(new URL(`apps/renderer/.e2e/${theme}/`, root));
console.log(`▸ Build du thème ${theme}`);
await run('pnpm', ['--filter', '@communeo/renderer', 'exec', 'astro', 'build'], {
  env: { ...process.env, THEME: theme, DATA_SOURCE: 'fixtures', OUT_DIR: out, RENDER_MODE: 'static' },
});

const server = spawn(process.execPath, [fileURLToPath(new URL('apps/renderer/e2e/serve.mjs', root)), theme, values.port], { stdio: 'inherit' });

const browser = await chromium.launch();
try {
  // L'accueil, en largeur desktop : c'est lui qui fait reconnaître le thème
  const page = await browser.newPage({ viewport: { width: 1280, height: 1500 }, deviceScaleFactor: 2 });
  await page.addInitScript(() => localStorage.setItem('communeo-consent-v1', JSON.stringify({ media: false })));
  await page.goto(`http://127.0.0.1:${values.port}/`, { waitUntil: 'networkidle' });
  const shot = join(out, 'accueil.png');
  await page.screenshot({ path: shot, clip: { x: 0, y: 0, width: 1280, height: 1500 } });

  // Les polices du thème sont dans le build : la vignette les réutilise pour rester fidèle
  const assets = join(out, '_astro');
  const font = (needle) => readdirSync(assets).find((file) => file.includes(needle) && file.endsWith('.woff2'));
  const serif = font(values.serif);
  const sans = font(values.sans);
  const faces = [
    sans && `@font-face { font-family: 'Vignette Sans'; src: url('_astro/${sans}') format('woff2'); font-weight: 200 900; }`,
    serif && `@font-face { font-family: 'Vignette Serif'; src: url('_astro/${serif}') format('woff2'); font-weight: 200 900; }`,
  ]
    .filter(Boolean)
    .join('\n');

  const points = values.points.length ? values.points : ['Texte de 18 px, contrastes forts', 'Menus et pages utilisables sans JavaScript', 'Accessibilité RGAA vérifiée'];
  const card = join(out, 'vignette.html');
  writeFileSync(
    card,
    `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
<style>
  ${faces}
  * { box-sizing: border-box; margin: 0; }
  body { display: grid; grid-template-columns: 460px 1fr; width: 1200px; height: 800px; overflow: hidden;
    font-family: 'Vignette Sans', system-ui, sans-serif; background: #fff; }
  .panel { display: flex; flex-direction: column; justify-content: space-between; gap: 32px;
    padding: 56px 44px; color: #fff; background: ${values.color}; }
  .kicker { font-size: 15px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; opacity: .85; }
  h1 { margin-top: 12px; font-family: 'Vignette Serif', Georgia, serif; font-size: 52px; line-height: 1.05; }
  .tagline { margin-top: 24px; font-size: 19px; line-height: 1.5; opacity: .95; }
  ul { display: grid; gap: 12px; padding: 0; font-size: 16px; list-style: none; }
  li { display: flex; gap: 12px; align-items: center; }
  li::before { content: ''; flex: none; width: 14px; height: 14px; background: #fff; border-radius: 50%; }
  .preview { position: relative; overflow: hidden; padding: 48px 0 0 48px; background: #f7f6f1; }
  img { display: block; width: 1280px; border: 1px solid #cfd4cf; border-radius: 6px 0 0 0;
    box-shadow: 0 12px 40px rgb(28 35 33 / 16%); transform: scale(.66); transform-origin: top left; }
</style></head><body>
  <div class="panel">
    <div>
      <p class="kicker">Thème</p>
      <h1>${manifest.name}</h1>
      <p class="tagline">${values.tagline || manifest.description}</p>
    </div>
    <ul>${points.map((point) => `<li>${point}</li>`).join('')}</ul>
  </div>
  <div class="preview"><img src="accueil.png" alt="" /></div>
</body></html>`,
  );

  const thumb = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await thumb.goto(`file://${card}`, { waitUntil: 'networkidle' });
  const target = fileURLToPath(new URL(`themes/${theme}/thumbnail.png`, root));
  await thumb.screenshot({ path: target });
  console.log(`✓ Vignette écrite : themes/${theme}/thumbnail.png (1200 × 800)`);
} finally {
  await browser.close();
  server.kill();
}
