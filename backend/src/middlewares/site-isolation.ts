interface StrapiUser {
  id: number;
  documentId: string;
  municipality_role?: string;
  site?: {
    id: number;
    documentId: string;
  };
}

interface StrapiContext {
  state: {
    user?: StrapiUser;
  };
  request: {
    method: string;
    url?: string;
    path?: string;
    body: {
      data?: any;
    };
    headers?: any;
  };
  query: {
    filters?: any;
  };
  notFound: () => void;
  forbidden: (message: string) => void;
  badRequest: (message: string) => void;
  internalServerError: (message: string) => void;
}

interface ParsedUrl {
  pluralApiId: string | null;
  documentId: string | null;
}

interface OwnershipResult {
  entity?: any;
  error?: 'notFound' | 'forbidden';
  message?: string;
}

export default (config: any, { strapi }: { strapi: any }) => {
  console.log('🔧 Site Isolation Middleware - LOADING');

  // Helper function pour parser l'URL et extraire les paramètres
  const parseUrl = (url: string): ParsedUrl => {
    console.log('🔍 Parsing URL:', url);

    // Pattern pour les routes API Strapi v5: /api/{pluralApiId}/{documentId?}
    // documentId peut être un string (UUID-like) ou un nombre
    const apiRoutePattern = /^\/api\/([a-zA-Z0-9-_]+)(?:\/([a-zA-Z0-9-_]+))?(?:\?.*)?$/;
    const match = url.match(apiRoutePattern);

    if (!match) {
      return { pluralApiId: null, documentId: null };
    }

    const pluralApiId = match[1];
    const documentId = match[2] || null;

    console.log('✅ Parsed URL:', { pluralApiId, documentId });
    return { pluralApiId, documentId };
  };

  // Helper function pour vérifier l'ownership d'une entité
  const verifyOwnership = async (
    contentType: string,
    documentId: string,
    userSiteDocumentId: string
  ): Promise<OwnershipResult> => {
    try {
      console.log(`🔍 Verifying ownership - contentType: ${contentType}, documentId: ${documentId}, userSiteDocumentId: ${userSiteDocumentId}`);

      // Dans Strapi v5, pour chercher par documentId, il faut utiliser findMany avec des filtres
      const entities = await strapi.entityService.findMany(contentType, {
        filters: { documentId: { $eq: documentId } },
        populate: ['site']
      });

      const entity = entities && entities.length > 0 ? entities[0] : null;

      console.log('🔍 Entity found:', entity ? {
        id: entity.id,
        documentId: entity.documentId,
        site: entity.site ? { id: entity.site.id, documentId: entity.site.documentId } : null
      } : 'null');

      if (!entity) {
        console.log('❌ Entity not found');
        return { error: 'notFound' };
      }

      if (!entity.site) {
        console.log('❌ Entity has no site relation');
        return { error: 'forbidden', message: 'Ressource sans site assigné' };
      }

      if (entity.site.documentId !== userSiteDocumentId) {
        console.log(`❌ Site mismatch - entity.site.documentId: ${entity.site.documentId}, userSiteDocumentId: ${userSiteDocumentId}`);
        return { error: 'forbidden', message: 'Accès non autorisé à cette ressource' };
      }

      console.log('✅ Ownership verified successfully');
      return { entity };
    } catch (error) {
      console.log('❌ Error verifying ownership:', error);
      return { error: 'forbidden', message: 'Erreur lors de la vérification des permissions' };
    }
  };

  // Helper function pour récupérer l'utilisateur depuis le token
  const getUserFromToken = async (token: string): Promise<StrapiUser | null> => {
    try {
      console.log('🔍 Attempting to get user from token...');

      // Décoder le token JWT
      const jwt = strapi.plugin('users-permissions').service('jwt');
      const decoded = await jwt.verify(token);

      console.log('🔍 Token decoded:', { userId: decoded.id });

      // Récupérer l'utilisateur avec sa relation site
      const user = await strapi.entityService.findOne('plugin::users-permissions.user', decoded.id, {
        populate: ['site']
      });

      console.log('🔍 User found:', user ? {
        id: user.id,
        documentId: user.documentId,
        email: user.email,
        site: user.site ? { id: user.site.id, documentId: user.site.documentId, name: user.site.name } : null
      } : 'null');

      return user;
    } catch (error: any) {
      console.log('❌ Error getting user from token:', error.message);
      return null;
    }
  };

  console.log('🔧 Site Isolation Middleware - LOADED SUCCESSFULLY');

  return async (ctx: StrapiContext, next: () => Promise<void>) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substr(2, 9);

    // Extraire l'URL
    const url = ctx.request.url || ctx.request.path || '';
    const method = ctx.request.method;

    // Debug: Log every request
    console.log(`\n🌐 [${requestId}] === Site Isolation Middleware START ===`);
    console.log(`🌐 [${requestId}] URL: ${url}`);
    console.log(`🌐 [${requestId}] Method: ${method}`);

    // Parser l'URL pour extraire les paramètres
    const { pluralApiId, documentId } = parseUrl(url);

    // Vérifier l'authentification
    let user = ctx.state.user;

    // Si pas d'utilisateur dans ctx.state, essayer de l'obtenir du token
    if (!user) {
      const authHeader = ctx.request.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        user = await getUserFromToken(token);
      }
    } else {
      // Même si l'utilisateur existe dans ctx.state, s'assurer qu'il a sa relation site
      if (!user.site) {
        console.log('🔍 User exists but missing site relation, fetching complete user...');
        const completeUser = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
          populate: ['site']
        });

        if (completeUser) {
          user = completeUser;
        }
      }
    }

    // IMPORTANT: Toujours mettre à jour ctx.state.user avec l'utilisateur complet
    if (user) {
      ctx.state.user = user;
      console.log(`🔄 [${requestId}] Updated ctx.state.user with complete user data including site`);
    }

    console.log(`🔍 [${requestId}] Final user:`, user ? {
      id: user.id,
      documentId: user.documentId,
      site: user.site ? { id: user.site.id, documentId: user.site.documentId } : null
    } : 'No user');

    // Skip middleware if no user
    if (!user) {
      console.log(`🔄 [${requestId}] Skipping middleware: No user authenticated`);
      const result = await next();
      console.log(`🌐 [${requestId}] === Site Isolation Middleware END (no user) === ${Date.now() - startTime}ms`);
      return result;
    }

    // Super admin handling
    if (user.municipality_role === 'super_admin') {
      const siteDocumentId = ctx.request.headers?.['x-site-document-id'];

      if (!siteDocumentId) {
        // Pas d'impersonation — bypass total
        console.log(`🔄 [${requestId}] Skipping middleware: Super admin bypass (no impersonation)`);
        const result = await next();
        console.log(`🌐 [${requestId}] === Site Isolation Middleware END (super_admin) === ${Date.now() - startTime}ms`);
        return result;
      }

      // Impersonation active — charger le site et appliquer le filtrage
      console.log(`🔍 [${requestId}] Super admin impersonating site: ${siteDocumentId}`);
      const sites = await strapi.entityService.findMany('api::site.site', {
        filters: { documentId: siteDocumentId } as any,
      });

      if (sites?.length > 0) {
        (ctx.state as any).impersonatedSite = sites[0];
        // Construire un objet site minimal avec documentId garanti depuis le header
        user.site = { id: (sites[0] as any).id, documentId: siteDocumentId } as any;
        console.log(`✅ [${requestId}] Impersonated site loaded: ${(sites[0] as any).name}, documentId: ${siteDocumentId}`);
      } else {
        console.log(`⚠️ [${requestId}] Impersonated site not found, bypassing`);
        const result = await next();
        return result;
      }
      // Fall through → la logique de filtrage normale s'applique
    }

    if (!user.site) {
      console.log(`🔄 [${requestId}] Skipping middleware: User has no site - User ID: ${user.id}`);
      const result = await next();
      console.log(`🌐 [${requestId}] === Site Isolation Middleware END (no site) === ${Date.now() - startTime}ms`);
      return result;
    }

    console.log(`🔍 [${requestId}] - pluralApiId: ${pluralApiId}`);
    console.log(`🔍 [${requestId}] - documentId: ${documentId}`);
    console.log(`🔍 [${requestId}] - method: ${method}`);
    console.log(`🔍 [${requestId}] - user.site.documentId: ${user.site.documentId}`);

    // Content-types that need site isolation
    const contentTypes: Record<string, string> = {
      'pages': 'api::page.page',
      'articles': 'api::article.article',
      'evenements': 'api::evenement.evenement',
      'contact-submissions': 'api::contact-submission.contact-submission',
      'official-documents': 'api::official-document.official-document',
      'team-members': 'api::team-member.team-member',
      'associations': 'api::association.association',
      'alertes': 'api::alerte.alerte',
      'media-items': 'api::media-item.media-item',
      'content-blocks': 'api::content-block.content-block',
    };

    // Endpoints spéciaux qui nécessitent juste la vérification de la relation site
    const specialEndpoints = [
      'deployment', // /api/deployment/* - toutes les routes de déploiement
      'domain'      // /api/domain/* - toutes les routes de domaine
    ];

    // Skip if not a content-type that needs site isolation and not a special endpoint
    if (!pluralApiId || (!contentTypes[pluralApiId] && !specialEndpoints.includes(pluralApiId))) {
      console.log(`🔄 [${requestId}] Skipping middleware: Not a content-type that needs site isolation or special endpoint`);
      const result = await next();
      console.log(`🌐 [${requestId}] === Site Isolation Middleware END (not target content) === ${Date.now() - startTime}ms`);
      return result;
    }

    console.log(`🎯 [${requestId}] === APPLYING SITE ISOLATION ===`);
    console.log(`🎯 [${requestId}] pluralApiId: ${pluralApiId}`);
    console.log(`🎯 [${requestId}] User Site Document ID: ${user.site.documentId}`);

    // Traitement spécial pour les endpoints deployment et domain
    if (specialEndpoints.includes(pluralApiId)) {
      console.log(`🎯 [${requestId}] Special endpoint detected: ${pluralApiId}`);
      // Pour ces endpoints, on s'assure juste que l'utilisateur a une relation site
      // Le contrôleur se chargera de la logique métier spécifique
      console.log(`✅ [${requestId}] Special endpoint access granted - user has site`);
      const result = await next();
      console.log(`🌐 [${requestId}] === Site Isolation Middleware END (special endpoint) === ${Date.now() - startTime}ms`);
      return result;
    }

    const contentType = contentTypes[pluralApiId];
    const userSiteDocumentId = user.site.documentId;
    console.log(`🔎 [${requestId}] userSiteDocumentId for filter: "${userSiteDocumentId}" (type: ${typeof userSiteDocumentId})`);

    console.log(`🎯 [${requestId}] Content Type: ${contentType}`);

    try {
      switch (method) {
        case 'GET':
          if (!documentId) {
            // GET list - add site filter automatically
            console.log(`📝 [${requestId}] GET LIST - Adding site filter`);

            if (!ctx.query) {
              ctx.query = {};
            }

            if (!ctx.query.filters) {
              ctx.query.filters = {};
            }

            // Preserve existing filters and add site filter using documentId
            ctx.query.filters = {
              ...ctx.query.filters,
              site: { documentId: { $eq: userSiteDocumentId } }
            };

            console.log(`📝 [${requestId}] Applied filter:`, JSON.stringify(ctx.query.filters));
            console.log(`📝 [${requestId}] Site filter applied successfully`);
          } else {
            // GET single - verify ownership
            console.log(`📝 [${requestId}] GET SINGLE - Verifying ownership`);
            const result = await verifyOwnership(contentType, documentId, userSiteDocumentId);
            if (result.error) {
              console.log(`❌ [${requestId}] Access denied for single GET`);
              return result.error === 'notFound'
                ? ctx.notFound()
                : ctx.forbidden(result.message || 'Accès non autorisé à cette ressource');
            }
            console.log(`✅ [${requestId}] Access granted for single GET`);
          }
          break;

        case 'POST':
          // POST create - force user's site using documentId
          console.log(`📝 [${requestId}] POST CREATE - Forcing user's site`);

          if (!ctx.request.body.data) {
            ctx.request.body.data = {};
          }

          // Force the user's site using documentId
          ctx.request.body.data.site = userSiteDocumentId;
          console.log(`📝 [${requestId}] Forced site documentId: ${userSiteDocumentId}`);
          break;

        case 'PUT':
        case 'PATCH':
          // PUT/PATCH update - verify ownership and prevent site changes
          if (documentId) {
            console.log(`📝 [${requestId}] ${method} UPDATE - Verifying ownership`);
            const result = await verifyOwnership(contentType, documentId, userSiteDocumentId);
            if (result.error) {
              console.log(`❌ [${requestId}] Access denied for ${method}`);
              return result.error === 'notFound'
                ? ctx.notFound()
                : ctx.forbidden(result.message || 'Accès non autorisé à cette ressource');
            }

            // Remove site changes from request body to prevent site switching
            if (ctx.request.body.data && ctx.request.body.data.site) {
              delete ctx.request.body.data.site;
              console.log(`📝 [${requestId}] Removed site change attempt for ${method}`);
            }

            console.log(`✅ [${requestId}] Access granted for ${method}`);
          }
          break;

        case 'DELETE':
          // DELETE - verify ownership
          if (documentId) {
            console.log(`📝 [${requestId}] DELETE - Verifying ownership`);
            const result = await verifyOwnership(contentType, documentId, userSiteDocumentId);
            if (result.error) {
              console.log(`❌ [${requestId}] Access denied for DELETE`);
              return result.error === 'notFound'
                ? ctx.notFound()
                : ctx.forbidden(result.message || 'Accès non autorisé à cette ressource');
            }
            console.log(`✅ [${requestId}] Access granted for DELETE`);
          }
          break;

        default:
          // For other HTTP methods, apply same logic as PUT
          console.log(`📝 [${requestId}] OTHER METHOD (${method})`);

          if (documentId) {
            const result = await verifyOwnership(contentType, documentId, userSiteDocumentId);
            if (result.error) {
              console.log(`❌ [${requestId}] Access denied for ${method}`);
              return result.error === 'notFound'
                ? ctx.notFound()
                : ctx.forbidden(result.message || 'Accès non autorisé à cette ressource');
            }

            if (ctx.request.body.data && ctx.request.body.data.site) {
              delete ctx.request.body.data.site;
              console.log(`📝 [${requestId}] Removed site change attempt for ${method}`);
            }
          }
          break;
      }
    } catch (error) {
      console.log(`❌ [${requestId}] Site isolation middleware error:`, error);
      return ctx.internalServerError('Erreur lors de la vérification des permissions');
    }

    console.log(`🔄 [${requestId}] Calling next middleware...`);

    // Continue to next middleware
    const result = await next();

    console.log(`✅ [${requestId}] Next middleware completed`);
    console.log(`🌐 [${requestId}] === Site Isolation Middleware END === ${Date.now() - startTime}ms`);

    return result;
  };
};
