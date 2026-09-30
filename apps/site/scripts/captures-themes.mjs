#!/usr/bin/env node
/**
 * Captures de l'accueil de la commune de démonstration dans chaque thème, pour les pages Accueil et
 * Thèmes du site (src/assets/themes/<thème>.png, 1440 × 900). Préalable : les builds de démonstration
 * du renderer (`E2E_THEMES=institutionnel,moderne,journal,bourg node e2e/build.mjs` dans apps/renderer).
 *
 *   pnpm --filter @communeo/site captures:themes
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const THEMES = ['institutionnel', 'moderne', 'journal', 'bourg'];
const renderer = fileURLToPath(new URL('../../renderer/', import.meta.url));
const browser = await chromium.launch();

for (const [index, theme] of THEMES.entries()) {
  const port = 4570 + index;
  const server = spawn('node', ['e2e/serve.mjs', theme, String(port)], { cwd: renderer, stdio: 'ignore' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    // Choix des cookies déjà fait : pas de bandeau de consentement sur la capture
    await page.addInitScript(() => localStorage.setItem('communeo-consent-v1', JSON.stringify({ media: false })));
    for (let attempt = 0; ; attempt += 1) {
      try {
        await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
        break;
      } catch (error) {
        if (attempt > 20) throw error;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    await page.evaluate(() => document.fonts.ready);
    const file = fileURLToPath(new URL(`../src/assets/themes/${theme}.png`, import.meta.url));
    await page.screenshot({ path: file });
    console.log(`✓ ${theme}`);
  } finally {
    server.kill();
  }
}
await browser.close();
