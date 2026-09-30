/**
 * Tests du site de Communeo sur le build statique (dist/) : accessibilité (axe, WCAG 2.2 AA), structure
 * et interactions. Préalable : `pnpm build`.
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.SITE_E2E_PORT ?? 4640);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, browserName: 'chromium', baseURL: `http://127.0.0.1:${PORT}` } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, baseURL: `http://127.0.0.1:${PORT}` } },
  ],
  webServer: {
    command: `node e2e/serve.mjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
  },
});
