import { defineConfig } from 'vitest/config';

// Les tests de file partagent une base Postgres (comme ceux du worker) : un fichier à la fois
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
  },
});
