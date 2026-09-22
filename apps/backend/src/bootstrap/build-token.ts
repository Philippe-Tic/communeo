/**
 * Token d'API utilisé par les builds des sites : lecture seule, limitée aux contenus publiés
 * (aucune donnée personnelle). Créé une seule fois si STRAPI_API_TOKEN n'est pas fourni.
 */

const READABLE_CONTENT_TYPES = [
  'site',
  'page',
  'article',
  'evenement',
  'official-document',
  'team-member',
  'association',
  'alerte',
  'waste-schedule',
  'school-menu',
];

export const BUILD_TOKEN_PERMISSIONS = [
  ...READABLE_CONTENT_TYPES.flatMap((name) => [`api::${name}.${name}.find`, `api::${name}.${name}.findOne`]),
  'api::comarquage.comarquage.categories',
  'api::comarquage.comarquage.fiche',
  'api::comarquage.comarquage.search',
  'plugin::upload.content-api.find',
  'plugin::upload.content-api.findOne',
];

export async function ensureBuildToken(strapi: any) {
  if (process.env.STRAPI_API_TOKEN) return;

  const existing = await strapi.db.query('admin::api-token').findOne({ where: { name: 'Build Token' } });
  if (existing) {
    if (existing.type === 'full-access') {
      strapi.log.warn('[build-token] Le « Build Token » existant a tous les droits : le supprimer dans l’admin Strapi et redémarrer.');
    }
    strapi.log.info('[build-token] Build Token présent, mais STRAPI_API_TOKEN n’est pas défini.');
    return;
  }

  const token = await strapi.service('admin::api-token').create({
    name: 'Build Token',
    type: 'custom',
    lifespan: null,
    description: 'Lecture seule des contenus publiés, pour les builds des sites',
    permissions: BUILD_TOKEN_PERMISSIONS,
  });
  // Affiché une seule fois, à la création : à reporter dans le .env du serveur
  strapi.log.info(`[build-token] Token de build créé. À définir dans .env : STRAPI_API_TOKEN=${token.accessKey}`);
}
