import { defineConfig } from 'vitest/config';

// Tests unitaires du renderer (logique Node) ; les pages sont testées par e2e/ (Playwright, parité)
export default defineConfig({
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
