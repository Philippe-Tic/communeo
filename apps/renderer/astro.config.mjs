/**
 * Renderer Communeo : un seul projet Astro pour toutes les communes et tous les thèmes.
 *
 * Variables d'environnement :
 * - THEME            identifiant du thème (package @communeo/theme-<id>), défaut « starter »
 * - RENDER_MODE      « static » (sites publiés) ou « server » (preview des brouillons)
 * - DATA_SOURCE      « strapi » ou « fixtures » (commune de démonstration, sans Strapi)
 * - SITE_URL         URL publique du site (liens canoniques, sitemap)
 * - STRAPI_URL, STRAPI_TOKEN, SITE_DOCUMENT_ID, STRAPI_PUBLIC_URL (données Strapi)
 */
import { cpSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

const theme = process.env.THEME || 'starter';
const server = process.env.RENDER_MODE === 'server';
const fixtures = process.env.DATA_SOURCE !== 'strapi';

/** `virtual:communeo/theme` : le thème choisi pour ce build. */
const themeModule = () => ({
  name: 'communeo-theme',
  resolveId: (id) => (id === 'virtual:communeo/theme' ? '\0virtual:communeo/theme' : undefined),
  load: (id) => (id === '\0virtual:communeo/theme' ? `export { default } from '@communeo/theme-${theme}';` : undefined),
});

/** Images et fichiers de la commune de démonstration, servis sous /fixtures. */
const fixtureAssets = () => {
  const dir = fileURLToPath(new URL('../../packages/fixtures/assets/', import.meta.url));
  return {
    name: 'communeo-fixture-assets',
    hooks: {
      'astro:server:setup': ({ server: devServer }) => {
        devServer.middlewares.use('/fixtures', (req, res, next) => {
          const file = `${dir}${decodeURIComponent(req.url.split('?')[0])}`;
          if (!existsSync(file)) return next();
          res.setHeader('Content-Type', file.endsWith('.svg') ? 'image/svg+xml' : 'application/pdf');
          res.end(readFileSync(file));
        });
      },
      'astro:build:done': ({ dir: outDir }) => cpSync(dir, fileURLToPath(new URL('fixtures/', outDir)), { recursive: true }),
    },
  };
};

export default defineConfig({
  site: process.env.SITE_URL || 'https://saint-aubin-sur-loire.fr',
  outDir: process.env.OUT_DIR || './dist',
  output: server ? 'server' : 'static',
  adapter: server ? node({ mode: 'standalone' }) : undefined,
  trailingSlash: 'never',
  // Espaces entre éléments en ligne conservés (« <b>Mairie</b> <span>ouverte</span> »)
  compressHTML: true,
  integrations: fixtures ? [fixtureAssets()] : [],
  vite: { plugins: [themeModule()] },
});
