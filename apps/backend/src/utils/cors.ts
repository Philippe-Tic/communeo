/**
 * Origines autorisées à appeler l'API en production (CORS).
 *
 * - Les routes publiques des sites (alertes en direct, démarches, formulaires, lettre d'information,
 *   formulaire de communeo.fr) sont appelées depuis le site de chaque commune, y compris depuis son
 *   propre domaine (mairie-x.fr) : toute origine est acceptée.
 * - Les autres routes (administration) n'acceptent que l'admin, les sites *.communeo.fr et les sites
 *   Netlify des communes. Leur session est un cookie SameSite=Strict, jamais envoyé depuis un autre site.
 *
 * Une origine refusée ne reçoit simplement pas d'en-tête CORS : Strapi attend une liste d'origines,
 * `false` le faisait échouer (erreur 500 sur toute requête venant d'une origine inconnue).
 */
const PUBLIC_PATHS = [
  /^\/api\/alertes\/public\/[^/]+$/,
  /^\/api\/comarquage\/(categories|fiche|search)\//,
  /^\/api\/(contact-submissions|associations|newsletter-subscribers)\/public$/,
  /^\/api\/newsletter-subscribers\/unsubscribe$/,
  /^\/api\/prospect-contact$/,
  /^\/api\/health$/,
];

const NETLIFY_PATTERN = /^https:\/\/[\w-]+-mairie\.netlify\.app$/;
const COMMUNEO_PATTERN = /^https:\/\/([\w-]+\.)?communeo\.fr$/;

export const isPublicApiPath = (path: string) => PUBLIC_PATHS.some((pattern) => pattern.test(path));

/** Origines de confiance fixes : l'admin (`DOMAIN`), la démo, et `CORS_ORIGIN` (séparées par des virgules) */
export function trustedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  return [
    `https://${env.DOMAIN || 'localhost'}`,
    'https://demo.communeo.fr',
    ...(env.CORS_ORIGIN ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  ];
}

/** Origines renvoyées à Strapi pour une requête : l'origine de la requête si elle est acceptée, sinon aucune */
export function allowedOrigins(origin: string | undefined, path: string, trusted: string[]): string[] {
  if (!origin) return [];
  if (isPublicApiPath(path) || trusted.includes(origin) || NETLIFY_PATTERN.test(origin) || COMMUNEO_PATTERN.test(origin)) return [origin];
  return [];
}
