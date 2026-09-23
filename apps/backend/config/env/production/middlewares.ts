// Build dynamic CORS origins
const corsOrigins: string[] = [
  `https://${process.env.DOMAIN || 'localhost'}`,
  'https://demo.communeo.fr',
];
if (process.env.CORS_ORIGIN) {
  corsOrigins.push(...process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean));
}
const NETLIFY_PATTERN = /^https:\/\/[\w-]+-mairie\.netlify\.app$/;
const COMMUNEO_PATTERN = /^https:\/\/[\w-]+\.communeo\.fr$/;

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
      origin: (ctx) => {
        const requestOrigin = ctx.request.header.origin;
        if (!requestOrigin) return false;
        if (corsOrigins.includes(requestOrigin)) return requestOrigin;
        if (NETLIFY_PATTERN.test(requestOrigin)) return requestOrigin;
        if (COMMUNEO_PATTERN.test(requestOrigin)) return requestOrigin;
        return false;
      },
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
