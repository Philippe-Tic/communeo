/**
 * Site de Communeo (communeo.fr, #315) : pages statiques, aucun traceur ni ressource tierce.
 * `PUBLIC_API_URL` : Strapi qui reçoit le formulaire de contact (défaut https://app.communeo.fr).
 */
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://communeo.fr',
  // `tarifs.html` servi sous `/tarifs` (comme les sites des communes) : liens sans barre finale
  build: { format: 'file' },
  trailingSlash: 'never',
  server: { port: 4321 },
});
