export default [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  {
    resolve: './src/middlewares/site-isolation',
  },
  'strapi::favicon',
  'strapi::public',
];
