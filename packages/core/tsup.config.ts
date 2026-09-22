import { defineConfig } from 'tsup';

// ESM pour l'admin et le renderer, CommonJS pour le backend Strapi.
// « client » : fonctions pures pour les scripts des sites, sans zod.
export default defineConfig({
  entry: ['src/index.ts', 'src/client.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2022',
});
