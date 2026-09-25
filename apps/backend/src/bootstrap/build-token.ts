/**
 * Tokens d'API en lecture seule (aucune donnée personnelle), créés au premier démarrage. Si la variable
 * est définie (secret généré avec les autres, voir DEPLOYMENT.md), le token prend sa valeur ; sinon la
 * valeur générée est affichée une fois dans les logs, à reporter dans .env :
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
  const provided = process.env[envVar];
  const existing = await strapi.db.query('admin::api-token').findOne({ where: { name } });
  if (existing) {
    if (existing.type === 'full-access') {
      strapi.log.warn(`[api-token] Le « ${name} » existant a tous les droits : le supprimer dans l’admin Strapi et redémarrer.`);
    }
    if (!provided) strapi.log.info(`[api-token] ${name} présent, mais ${envVar} n’est pas défini.`);
    return;
  }

  const service = strapi.service('admin::api-token');
  const token = await service.create({
    name,
    type: 'custom',
    lifespan: null,
    description,
    permissions: BUILD_TOKEN_PERMISSIONS,
  });
  if (provided) {
    // Jeton généré avec les autres secrets du déploiement : rien à reporter dans .env après le premier
    // démarrage (worker et preview l'ont déjà)
    await strapi.db.query('admin::api-token').update({
      where: { id: token.id },
      data: { accessKey: service.hash(provided), encryptedKey: strapi.service('admin::encryption').encrypt(provided) },
    });
    strapi.log.info(`[api-token] ${name} créé avec la valeur de ${envVar}.`);
    return;
  }
  // Affiché une seule fois, à la création : à reporter dans le .env du serveur
  strapi.log.info(`[api-token] ${name} créé. À définir dans .env : ${envVar}=${token.accessKey}`);
}

export async function ensureBuildToken(strapi: any) {
  await ensureReadOnlyToken(strapi, BUILD_TOKEN);
  await ensureReadOnlyToken(strapi, PREVIEW_TOKEN);
}
