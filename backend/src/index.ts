import bootstrap from './bootstrap';
import autoDeployService from './services/auto-deploy';
import pushNotificationService from './services/push-notification';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: any }) {
    strapi.documents.use(async (ctx: any, next: () => Promise<any>) => {
      const triggerActions = ['create', 'update', 'delete', 'publish', 'unpublish'];
      if (!triggerActions.includes(ctx.action)) return next();

      // Only API content types
      if (!ctx.uid.startsWith('api::')) return next();

      // Exclude deployment and contact-submission
      const excludedUids = ['api::deployment.deployment', 'api::contact-submission.contact-submission', 'api::newsletter-subscriber.newsletter-subscriber'];
      if (excludedUids.includes(ctx.uid)) return next();

      const isSiteItself = ctx.uid === 'api::site.site';
      const contentType = strapi.contentTypes[ctx.uid];
      const hasSiteRelation = !!contentType?.attributes?.site;

      // Only process content types that are either the Site itself or have a site relation
      if (!isSiteItself && !hasSiteRelation) return next();

      // For delete: fetch site BEFORE deletion
      let siteDocumentId: string | null = null;
      if (ctx.action === 'delete' && ctx.params?.documentId) {
        if (isSiteItself) {
          // Deleting the site itself — no deploy needed
          return next();
        }
        try {
          const entries: any[] = await strapi.entityService.findMany(ctx.uid, {
            filters: { documentId: ctx.params.documentId } as any,
            populate: ['site'],
            limit: 1,
          });
          const entry = entries?.[0] || null;
          siteDocumentId = entry?.site?.documentId || null;
        } catch { /* ignore */ }
      }

      // For notifiable content types: fetch previous data before the action (to detect transitions)
      let previousData: any = null;
      const notifiableConfig = pushNotificationService.getNotifiableConfig(ctx.uid);
      if (notifiableConfig && ctx.action === 'update' && ctx.params?.documentId) {
        try {
          const entries: any[] = await strapi.entityService.findMany(ctx.uid, {
            filters: { documentId: ctx.params.documentId } as any,
            limit: 1,
          });
          previousData = entries?.[0] || null;
        } catch { /* ignore */ }
      }

      const result = await next();

      // After the action: resolve siteDocumentId
      if (!siteDocumentId) {
        if (isSiteItself) {
          // The Site itself was modified — its own documentId is the target
          siteDocumentId = ctx.params?.documentId || result?.documentId || null;
        } else if (result?.documentId) {
          try {
            const entries: any[] = await strapi.entityService.findMany(ctx.uid, {
              filters: { documentId: result.documentId } as any,
              populate: ['site'],
              limit: 1,
            });
            const entry = entries?.[0] || null;
            siteDocumentId = entry?.site?.documentId || null;
          } catch { /* ignore */ }
        }
      }

      if (siteDocumentId) {
        console.log(`📝 [AUTO-DEPLOY] Content changed (${ctx.action} on ${ctx.uid})`);
        autoDeployService.scheduleDeployIfEnabled(siteDocumentId);

        // Send push notification if applicable (fire-and-forget)
        pushNotificationService.notifyIfNeeded({
          uid: ctx.uid,
          action: ctx.action,
          siteDocumentId,
          result,
          previousData,
        });
      }

      return result;
    });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap,
};
