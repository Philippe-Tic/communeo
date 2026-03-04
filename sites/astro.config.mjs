import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import dotenv from 'dotenv';

// Charger le fichier .env
dotenv.config();

// Variables d'environnement nécessaires pour la configuration
const SITE_SLUG = process.env.SITE_SLUG || 'default';
const SITE_DOCUMENT_ID = process.env.SITE_DOCUMENT_ID || '';
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_TOKEN || '';
const STRAPI_PUBLIC_URL = process.env.STRAPI_PUBLIC_URL || STRAPI_URL;
const strapiHostname = new URL(STRAPI_URL).hostname;
const strapiPublicHostname = new URL(STRAPI_PUBLIC_URL).hostname;

export default defineConfig({
  image: {
    domains: [strapiHostname, strapiPublicHostname],
  },

  integrations: [
    tailwind(),
    sitemap({
      filter: (page) => !page.endsWith('/robots.txt'),
    }),
  ],

  // Configuration du site basée sur le slug
  site: process.env.SITE_URL || `https://${SITE_SLUG}-mairie.netlify.app`,
  base: '/',
  trailingSlash: 'never',
  prefetch: true,

  // Mode hybride pour la génération statique avec possibilité d'opt-in
  output: 'static',

  // Variables d'environnement disponibles côté client
  vite: {
    define: {
      'import.meta.env.SITE_DOCUMENT_ID': JSON.stringify(SITE_DOCUMENT_ID),
      'import.meta.env.SITE_SLUG': JSON.stringify(SITE_SLUG),
      'import.meta.env.STRAPI_URL': JSON.stringify(STRAPI_URL),
      'import.meta.env.STRAPI_TOKEN': JSON.stringify(STRAPI_TOKEN),
      'import.meta.env.STRAPI_PUBLIC_URL': JSON.stringify(STRAPI_PUBLIC_URL),
    }
  },

  // Configuration pour le développement
  server: {
    port: 4321,
    host: true
  }
});
