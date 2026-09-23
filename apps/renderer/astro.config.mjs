/**
 * Renderer Communeo : un seul projet Astro pour toutes les communes et tous les thèmes.
 *
 * Variables d'environnement :
 * - THEME            identifiant du thème (package @communeo/theme-<id>), défaut « institutionnel » ;
 *                    en mode serveur, tous les thèmes sont inclus et THEME force celui de la preview
 * - RENDER_MODE      « static » (sites publiés) ou « server » (preview des brouillons)
 * - DATA_SOURCE      « strapi » ou « fixtures » (commune de démonstration, sans Strapi)
 * - SITE_URL         URL publique du site (liens canoniques, sitemap)
 * - STRAPI_URL, STRAPI_TOKEN, SITE_DOCUMENT_ID, STRAPI_PUBLIC_URL (données Strapi)
 * - CONTENT_STATUS   « draft » pour la preview (brouillons)
 */
import { cpSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

const theme = process.env.THEME || 'institutionnel';
const server = process.env.RENDER_MODE === 'server';
const fixtures = process.env.DATA_SOURCE !== 'strapi';

/** Thèmes installés : les dépendances `@communeo/theme-<id>` du renderer. */
const installedThemes = Object.keys(JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).dependencies)
  .filter((name) => name.startsWith('@communeo/theme-') && name !== '@communeo/theme-contract')
  .map((name) => name.slice('@communeo/theme-'.length));

/**
 * `virtual:communeo/theme` : en build statique, le thème choisi pour ce build. En mode serveur
 * (preview), tous les thèmes installés ; celui de la requête est lu dans son contexte.
 */
const themeModule = () => ({
  name: 'communeo-theme',
  resolveId: (id) => (id === 'virtual:communeo/theme' ? '\0virtual:communeo/theme' : undefined),
  load: (id) => {
    if (id !== '\0virtual:communeo/theme') return undefined;
    if (!server) return `export { default } from '@communeo/theme-${theme}';`;
    const context = fileURLToPath(new URL('./src/lib/request-context.ts', import.meta.url));
    return [
      `import { requestTheme } from ${JSON.stringify(context)};`,
      ...installedThemes.map((id, i) => `import theme${i} from '@communeo/theme-${id}';`),
      `const themes = { ${installedThemes.map((id, i) => `${JSON.stringify(id)}: theme${i}`).join(', ')} };`,
      `const current = () => themes[requestTheme()] ?? themes[${JSON.stringify(theme)}];`,
      'export default new Proxy({}, { get: (_target, key) => current()[key] });',
    ].join('\n');
  },
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
          const types = { '.svg': 'image/svg+xml', '.json': 'application/json', '.pdf': 'application/pdf' };
          res.setHeader('Content-Type', types[file.slice(file.lastIndexOf('.'))] ?? 'application/octet-stream');
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
