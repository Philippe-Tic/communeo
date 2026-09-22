import { defineConfig } from 'vitest/config';

// Les tests de file partagent une base Postgres : fichiers exécutés l'un après l'autre
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
