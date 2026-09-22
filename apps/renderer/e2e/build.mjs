#!/usr/bin/env node
/**
 * Construit la commune de démonstration dans chaque thème (build statique) et liste les pages produites.
 * Préalable aux tests Playwright.
 */
import { execSync } from 'node:child_process';
import { readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { outDir, themes } from './themes.mjs';

function pages(dir, prefix = '') {
  return readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`;
    if (statSync(path).isDirectory()) return name.startsWith('_') || name === 'fixtures' ? [] : pages(path, `${prefix}/${name}`);
    return name === 'index.html' ? [prefix || '/'] : [];
  });
}

for (const theme of themes) {
  const dir = fileURLToPath(outDir(theme));
  rmSync(dir, { recursive: true, force: true });
  console.log(`▸ Build du thème ${theme}`);
  execSync('pnpm astro build', {
    stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, THEME: theme, DATA_SOURCE: 'fixtures', OUT_DIR: dir, RENDER_MODE: 'static' },
  });
  const list = pages(dir.replace(/\/$/, '')).sort();
  writeFileSync(`${dir}/pages.json`, JSON.stringify(list, null, 2));
  console.log(`  ${list.length} pages`);
}
