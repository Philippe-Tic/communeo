/**
 * Tokens d'API en lecture seule (aucune donnée personnelle), créés une seule fois s'ils ne sont pas fournis :
 * - « Build Token » (STRAPI_API_TOKEN) : builds des sites publiés, par le worker ;
 * - « Preview Token » (PREVIEW_API_TOKEN) : serveur de preview, qui lit les brouillons. Séparé pour être
 *   révocable sans toucher aux builds, et pour que le worker n'ait pas le jeton de la preview.
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

interface ReadOnlyToken {
  name: string;
  envVar: string;
  description: string;
}

const BUILD_TOKEN: ReadOnlyToken = {
  name: 'Build Token',
  envVar: 'STRAPI_API_TOKEN',
  description: 'Lecture seule des contenus publiés, pour les builds des sites',
};

const PREVIEW_TOKEN: ReadOnlyToken = {
  name: 'Preview Token',
  envVar: 'PREVIEW_API_TOKEN',
  description: 'Lecture seule des contenus, brouillons compris, pour le serveur de preview',
};

async function ensureReadOnlyToken(strapi: any, { name, envVar, description }: ReadOnlyToken) {
  if (process.env[envVar]) return;

  const existing = await strapi.db.query('admin::api-token').findOne({ where: { name } });
  if (existing) {
    if (existing.type === 'full-access') {
      strapi.log.warn(`[api-token] Le « ${name} » existant a tous les droits : le supprimer dans l’admin Strapi et redémarrer.`);
    }
    strapi.log.info(`[api-token] ${name} présent, mais ${envVar} n’est pas défini.`);
    return;
  }

  const token = await strapi.service('admin::api-token').create({
    name,
    type: 'custom',
    lifespan: null,
    description,
    permissions: BUILD_TOKEN_PERMISSIONS,
  });
  // Affiché une seule fois, à la création : à reporter dans le .env du serveur
  strapi.log.info(`[api-token] ${name} créé. À définir dans .env : ${envVar}=${token.accessKey}`);
}

export async function ensureBuildToken(strapi: any) {
  await ensureReadOnlyToken(strapi, BUILD_TOKEN);
  await ensureReadOnlyToken(strapi, PREVIEW_TOKEN);
}
