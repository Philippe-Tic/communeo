import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import dotenv from 'dotenv';

// Charger le fichier .env
dotenv.config();

// Variables d'environnement nécessaires pour la configuration
const SITE_SLUG = process.env.SITE_SLUG || 'default';
const SITE_DOCUMENT_ID = process.env.SITE_DOCUMENT_ID || '';
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_TOKEN || '';

export default defineConfig({
  integrations: [tailwind()],

  // Configuration du site basée sur le slug
  site: `https://${SITE_SLUG}.monservice.fr`,
  base: '/',

  // Mode hybride pour la génération statique avec possibilité d'opt-in
  output: 'static',

  // Variables d'environnement disponibles côté client
  vite: {
    define: {
      'import.meta.env.SITE_DOCUMENT_ID': JSON.stringify(SITE_DOCUMENT_ID),
      'import.meta.env.SITE_SLUG': JSON.stringify(SITE_SLUG),
      'import.meta.env.STRAPI_URL': JSON.stringify(STRAPI_URL),
      'import.meta.env.STRAPI_TOKEN': JSON.stringify(STRAPI_TOKEN),
    }
  },

  // Configuration pour le développement
  server: {
    port: 4321,
    host: true
  }
});
