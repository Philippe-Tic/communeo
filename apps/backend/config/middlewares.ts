export default [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  'global::private-network-access',
  {
    name: 'strapi::cors',
    config: {
      origin: '*',
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Site-Document-Id', 'X-Communeo-Csrf'],
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
