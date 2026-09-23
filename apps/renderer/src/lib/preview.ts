/**
 * Preview : quelle commune une requête a le droit de voir.
 * Les jetons signés délivrés par Strapi arrivent avec #129 ; d'ici là, seule une commune fixée par
 * SITE_DOCUMENT_ID est servie, et jamais en production (fail-closed).
 */
export interface PreviewAccess {
  siteDocumentId: string;
  theme?: string;
}

export function resolvePreviewAccess(_request: Request, env: NodeJS.ProcessEnv = process.env): PreviewAccess | null {
  // Commune de démonstration (données publiques) : tests de parité, développement des thèmes
  if (env.DATA_SOURCE !== 'strapi') return { siteDocumentId: 'demo' };
  if (env.NODE_ENV === 'production' || !env.SITE_DOCUMENT_ID) return null;
  return { siteDocumentId: env.SITE_DOCUMENT_ID };
}
