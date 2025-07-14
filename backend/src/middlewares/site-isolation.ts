interface StrapiUser {
  id: number;
  site: {
    id: number;
  };
}

interface StrapiContext {
  state: {
    user?: StrapiUser;
  };
  params: {
    pluralApiId?: string;
    documentId?: string;
  };
  request: {
    method: string;
    body: {
      data?: any;
    };
  };
  query: {
    filters?: any;
  };
  notFound: () => void;
  forbidden: (message: string) => void;
  badRequest: (message: string) => void;
  internalServerError: (message: string) => void;
}

interface OwnershipResult {
  error?: 'notFound' | 'forbidden';
  message?: string;
  entity?: any;
}

export default (config: any, { strapi }: { strapi: any }) => {
  // Helper function pour vérifier l'ownership d'une entité
  const verifyOwnership = async (
    contentType: string,
    documentId: string,
    userSiteId: number
  ): Promise<OwnershipResult> => {
    try {
      const entity = await strapi.entityService.findOne(contentType, documentId, {
        populate: ['site']
      });

      if (!entity) {
        return { error: 'notFound' };
      }

      // Gérer le cas où l'entité n'a pas de site (données legacy)
      if (!entity.site) {
        strapi.log.warn(`Entity ${documentId} of type ${contentType} has no site relation`);
        return { error: 'forbidden', message: 'Ressource sans site assigné' };
      }

      if (entity.site.id !== userSiteId) {
        return { error: 'forbidden', message: 'Accès non autorisé à cette ressource' };
      }

      return { entity };
    } catch (error) {
      strapi.log.error(`Error verifying ownership for ${contentType}:${documentId}`, error);
      return { error: 'forbidden', message: 'Erreur lors de la vérification des permissions' };
    }
  };

  return async (ctx: StrapiContext, next: () => Promise<void>) => {
    const { user } = ctx.state;

    // Skip middleware if no user or user has no site
    if (!user || !user.site) {
      return await next();
    }

    const { pluralApiId, documentId } = ctx.params;
    const method = ctx.request.method;

    // Content-types that need site isolation
    const contentTypes: Record<string, string> = {
      'pages': 'api::page.page',
      'articles': 'api::article.article',
      'evenements': 'api::evenement.evenement'
    };

    // Skip if not a content-type that needs site isolation
    if (!pluralApiId || !contentTypes[pluralApiId]) {
      return await next();
    }

    const contentType = contentTypes[pluralApiId];
    const userSiteId = user.site.id;

    // Debug logging
    strapi.log.debug(
      `Site isolation: ${method} ${pluralApiId}${documentId ? `/${documentId}` : ''} - User site: ${userSiteId}`
    );

    try {
      switch (method) {
        case 'GET':
          if (!documentId) {
            // GET list - add site filter automatically
            if (!ctx.query.filters) {
              ctx.query.filters = {};
            }

            // Preserve existing filters and add site filter
            ctx.query.filters = {
              ...ctx.query.filters,
              site: { id: { $eq: userSiteId } }
            };

            strapi.log.debug(`Applied site filter for listing ${pluralApiId}`);
          } else {
            // GET single - verify ownership
            const result = await verifyOwnership(contentType, documentId, userSiteId);
            if (result.error) {
              strapi.log.warn(
                `Access denied: User ${user.id} (site ${userSiteId}) tried to access ${contentType}:${documentId}`
              );
              return result.error === 'notFound'
                ? ctx.notFound()
                : ctx.forbidden(result.message || 'Accès non autorisé à cette ressource');
            }

            strapi.log.debug(`Access granted for ${contentType}:${documentId}`);
          }
          break;

        case 'POST':
          // POST create - force user's site
          if (!ctx.request.body.data) {
            ctx.request.body.data = {};
          }

          // Force the user's site, even if another site is specified
          const originalSite = ctx.request.body.data.site;
          ctx.request.body.data.site = userSiteId;

          if (originalSite && originalSite !== userSiteId) {
            strapi.log.warn(
              `User ${user.id} tried to create ${contentType} for site ${originalSite}, forced to ${userSiteId}`
            );
          }

          strapi.log.debug(`Creating ${contentType} for site ${userSiteId}`);
          break;

        case 'PUT':
          // PUT update - verify ownership and prevent site change
          if (!documentId) {
            return ctx.badRequest('Document ID is required for PUT operations');
          }

          const updateResult = await verifyOwnership(contentType, documentId, userSiteId);
          if (updateResult.error) {
            strapi.log.warn(
              `Update denied: User ${user.id} (site ${userSiteId}) tried to update ${contentType}:${documentId}`
            );
            return updateResult.error === 'notFound'
              ? ctx.notFound()
              : ctx.forbidden(updateResult.message || 'Accès non autorisé à cette ressource');
          }

          // Prevent site change in update
          if (ctx.request.body.data && ctx.request.body.data.site) {
            const attemptedSite = ctx.request.body.data.site;
            delete ctx.request.body.data.site;

            if (attemptedSite !== userSiteId) {
              strapi.log.warn(
                `User ${user.id} tried to change site of ${contentType}:${documentId} from ${userSiteId} to ${attemptedSite}`
              );
            }
          }

          strapi.log.debug(`Updating ${contentType}:${documentId} for site ${userSiteId}`);
          break;

        case 'DELETE':
          // DELETE - verify ownership
          if (!documentId) {
            return ctx.badRequest('Document ID is required for DELETE operations');
          }

          const deleteResult = await verifyOwnership(contentType, documentId, userSiteId);
          if (deleteResult.error) {
            strapi.log.warn(
              `Delete denied: User ${user.id} (site ${userSiteId}) tried to delete ${contentType}:${documentId}`
            );
            return deleteResult.error === 'notFound'
              ? ctx.notFound()
              : ctx.forbidden(deleteResult.message || 'Accès non autorisé à cette ressource');
          }

          strapi.log.debug(`Deleting ${contentType}:${documentId} for site ${userSiteId}`);
          break;

        default:
          // For other HTTP methods (PATCH, etc.), apply same logic as PUT
          if (documentId) {
            const result = await verifyOwnership(contentType, documentId, userSiteId);
            if (result.error) {
              return result.error === 'notFound'
                ? ctx.notFound()
                : ctx.forbidden(result.message || 'Accès non autorisé à cette ressource');
            }

            // Prevent site change for any modification
            if (ctx.request.body.data && ctx.request.body.data.site) {
              delete ctx.request.body.data.site;
            }
          }
          break;
      }
    } catch (error) {
      strapi.log.error('Site isolation middleware error:', error);
      return ctx.internalServerError('Erreur lors de la vérification des permissions');
    }

    // Continue to next middleware
    await next();
  };
};
