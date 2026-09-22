import { defineConfig } from 'tsup';

// ESM pour l'admin et le renderer, CommonJS pour le backend Strapi
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2022',
});
