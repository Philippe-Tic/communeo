import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::alerte.alerte', ({ strapi }) => ({
  async findPublicAlerts(ctx) {
    const { siteDocumentId } = ctx.params;

    if (!siteDocumentId) {
      return ctx.badRequest('siteDocumentId is required');
    }

    const now = new Date().toISOString();

    const alerts = await strapi.documents('api::alerte.alerte').findMany({
      filters: {
        site: { documentId: { $eq: siteDocumentId } },
        active: true,
        $or: [
          { display_from: { $null: true } },
          { display_from: { $lte: now } },
        ],
      },
      sort: [{ severity: 'desc' }, { createdAt: 'desc' }],
    });

    // Filter out alerts that have expired (display_until in the past)
    const activeAlerts = (alerts || []).filter((alert: any) => {
      if (!alert.display_until) return true;
      return new Date(alert.display_until) > new Date();
    });

    return { data: activeAlerts };
  },
}));
