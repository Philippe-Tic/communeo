/**
 * Tests de l'admin sur le build de production (vite preview), API Strapi simulée (e2e/api.ts).
 * Préalable : pnpm --filter @communeo/admin build
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 4800;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { baseURL: `http://127.0.0.1:${PORT}`, browserName: 'chromium' },
  projects: [
    { name: 'desktop-1440', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'laptop-1366', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
    { name: 'mobile-390', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: `pnpm vite preview --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/connexion`,
    reuseExistingServer: !process.env.CI,
  },
});
