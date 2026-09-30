import { defineConfig } from 'vitest/config';

// Tests unitaires (logique des pages) ; les pages sont testées par e2e/ (Playwright, axe)
export default defineConfig({
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
