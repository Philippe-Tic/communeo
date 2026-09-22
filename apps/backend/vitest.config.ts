import { defineConfig } from 'vitest/config';

// Tests d'intégration : une seule instance Strapi, fichiers exécutés l'un après l'autre
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    pool: 'forks',
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 240_000,
  },
});
