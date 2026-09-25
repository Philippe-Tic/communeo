/**
 * Tests des thèmes sur la commune de démonstration : accessibilité (axe, WCAG 2.2 AA), structure,
 * et captures visuelles (VISUAL=1, générées dans le conteneur Playwright de la CI).
 * Préalable : node e2e/build.mjs (build statique de chaque thème).
 */
import { defineConfig, devices } from '@playwright/test';
import { PORT_BASE, themes, variants } from './e2e/themes.mjs';

const builds = [...themes, ...variants.map((variant) => variant.id)];
const isVariant = (id: string) => variants.some((variant) => variant.id === id);

const viewports = {
  mobile: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
  desktop: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  snapshotPathTemplate: 'e2e/__screenshots__/{projectName}/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' } },
  projects: builds.flatMap((theme, index) =>
    Object.entries(viewports).map(([name, device]) => ({
      name: `${theme}-${name}`,
      use: { ...device, browserName: 'chromium' as const, baseURL: `http://127.0.0.1:${PORT_BASE + index}` },
      metadata: { theme },
      // Une variante n'est testée que par sa spec ; les thèmes par toutes les autres
      ...(isVariant(theme) ? { testMatch: `${theme}.spec.ts` } : { testIgnore: variants.map((variant) => `${variant.id}.spec.ts`) }),
    })),
  ),
  webServer: builds.map((theme, index) => ({
    command: `node e2e/serve.mjs ${theme} ${PORT_BASE + index}`,
    url: `http://127.0.0.1:${PORT_BASE + index}/`,
    reuseExistingServer: !process.env.CI,
  })),
});
