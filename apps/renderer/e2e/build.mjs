#!/usr/bin/env node
/**
 * Construit la commune de démonstration dans chaque thème (build statique) et liste les pages produites.
 * Préalable aux tests Playwright.
 */
import { execSync } from 'node:child_process';
import { readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { outDir, themes, variants } from './themes.mjs';

/** Pages du site : `actualites.html` → `/actualites` (index.html seulement à la racine). */
function pages(dir, prefix = '') {
  return readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`;
    if (statSync(path).isDirectory()) return name.startsWith('_') || ['fixtures', 'pagefind'].includes(name) ? [] : pages(path, `${prefix}/${name}`);
    if (!name.endsWith('.html') || name === '404.html') return [];
    if (name === 'index.html') {
      // Une page en dossier/index.html serait redirigée par l'hébergeur vers dossier/ (voir astro.config.mjs)
      if (prefix) throw new Error(`Page générée en ${prefix}/index.html : elle doit être ${prefix}.html`);
      return ['/'];
    }
    return [`${prefix}/${name.slice(0, -'.html'.length)}`];
  });
}

const builds = [...themes.map((theme) => ({ id: theme, theme, env: {} })), ...variants];
for (const { id, theme, env } of builds) {
  const dir = fileURLToPath(outDir(id));
  rmSync(dir, { recursive: true, force: true });
  console.log(`▸ Build ${id === theme ? `du thème ${theme}` : `${id} (thème ${theme})`}`);
  execSync('pnpm astro build', {
    stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, ...env, THEME: theme, DATA_SOURCE: 'fixtures', OUT_DIR: dir, RENDER_MODE: 'static' },
  });
  // Index de recherche : les tests parcourent le site comme un visiteur
  execSync(`node scripts/pagefind.mjs ${dir}`, { stdio: ['ignore', 'ignore', 'inherit'] });
  const list = pages(dir.replace(/\/$/, '')).sort();
  writeFileSync(`${dir}/pages.json`, JSON.stringify(list, null, 2));
  console.log(`  ${list.length} pages`);
}
