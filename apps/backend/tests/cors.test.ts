/**
 * CORS en production (config/env/production/middlewares.ts) : les routes publiques des sites acceptent
 * toute origine (sites des communes sur leur propre domaine, communeo.fr) ; les autres routes restent
 * réservées aux origines de confiance ; une origine refusée ne provoque jamais d'erreur.
 */
import { describe, expect, it } from 'vitest';
import { allowedOrigins, isPublicApiPath, trustedOrigins } from '../src/utils/cors';

const trusted = trustedOrigins({ DOMAIN: 'app.communeo.fr', CORS_ORIGIN: 'https://ancien.example, https://autre.example' } as NodeJS.ProcessEnv);

describe('origines CORS en production', () => {
  it('ouvre les routes publiques des sites à toute origine', () => {
    for (const path of [
      '/api/alertes/public/abc123',
      '/api/comarquage/fiche/particuliers/F1234',
      '/api/comarquage/search/particuliers',
      '/api/comarquage/categories/particuliers',
      '/api/contact-submissions/public',
      '/api/associations/public',
      '/api/newsletter-subscribers/public',
      '/api/newsletter-subscribers/unsubscribe',
      '/api/prospect-contact',
      '/api/health',
    ]) {
      expect(isPublicApiPath(path), path).toBe(true);
      expect(allowedOrigins('https://mairie-exemple.fr', path, trusted)).toEqual(['https://mairie-exemple.fr']);
    }
  });

  it('réserve les autres routes aux origines de confiance', () => {
    for (const path of ['/api/pages', '/api/users/me', '/api/session/login', '/api/comarquage/cache/invalidate', '/api/newsletter-subscribers/export']) {
      expect(isPublicApiPath(path), path).toBe(false);
      expect(allowedOrigins('https://mairie-exemple.fr', path, trusted)).toEqual([]);
    }
    expect(allowedOrigins('https://app.communeo.fr', '/api/pages', trusted)).toEqual(['https://app.communeo.fr']);
    expect(allowedOrigins('https://ancien.example', '/api/pages', trusted)).toEqual(['https://ancien.example']);
    expect(allowedOrigins('https://communeo.fr', '/api/pages', trusted)).toEqual(['https://communeo.fr']);
    expect(allowedOrigins('https://saint-aubin.communeo.fr', '/api/pages', trusted)).toEqual(['https://saint-aubin.communeo.fr']);
    expect(allowedOrigins('https://saint-aubin-mairie.netlify.app', '/api/pages', trusted)).toEqual(['https://saint-aubin-mairie.netlify.app']);
    expect(allowedOrigins('https://evil-communeo.fr', '/api/pages', trusted)).toEqual([]);
    expect(allowedOrigins('https://communeo.fr.evil.test', '/api/pages', trusted)).toEqual([]);
  });

  it('ne renvoie jamais autre chose qu’une liste (Strapi échouait sur `false`)', () => {
    expect(allowedOrigins(undefined, '/api/pages', trusted)).toEqual([]);
    expect(Array.isArray(allowedOrigins('https://inconnu.example', '/api/pages', trusted))).toBe(true);
  });
});
