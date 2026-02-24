import { defineConfig } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const STRAPI_URL = 'http://localhost:1337'
const ADMIN_URL = 'http://localhost:5173'
const AUTH_STATE = path.resolve(__dirname, 'auth-state.json')

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: './playwright-report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: ADMIN_URL,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  globalSetup: './global-setup.ts',
  projects: [
    {
      name: 'auth-tests',
      testDir: './tests/auth',
      use: {
        storageState: undefined,
      },
    },
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        storageState: AUTH_STATE,
      },
      testIgnore: ['**/auth/**', '**/complete-site/**'],
    },
    {
      name: 'complete-site',
      testDir: './tests/complete-site',
      use: {
        browserName: 'chromium',
        storageState: AUTH_STATE,
      },
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      cwd: '../backend',
      url: `${STRAPI_URL}/_health`,
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: 'npm run dev',
      cwd: '.',
      url: ADMIN_URL,
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
})
