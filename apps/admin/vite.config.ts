import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Routes : un fichier par écran dans src/routes (layouts compris), arbre généré par le plugin du routeur
export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // En développement, l'API Strapi est servie sous la même origine (comme derrière nginx en production)
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.VITE_API_URL || 'http://localhost:1337',
      '/uploads': process.env.VITE_API_URL || 'http://localhost:1337',
    },
  },
});
