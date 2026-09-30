import { allowedOrigins, trustedOrigins } from '../../../src/utils/cors';

const trusted = trustedOrigins();

export default [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:'],
          'media-src': ["'self'", 'data:', 'blob:'],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      // Voir src/utils/cors.ts : routes publiques ouvertes à tous les sites, le reste restreint
      origin: (ctx) => allowedOrigins(ctx.request.header.origin, ctx.path, trusted),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Site-Document-Id', 'X-Communeo-Csrf'],
      keepHeaderOnError: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'global::session-cookie',
  'global::site-isolation',
  'strapi::favicon',
  'strapi::public',
];
