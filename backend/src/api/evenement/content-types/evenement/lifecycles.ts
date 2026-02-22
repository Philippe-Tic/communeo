import autoDeployService from '../../../../services/auto-deploy';

async function getSiteDocumentId(event: any): Promise<string | null> {
  const { result } = event;
  if (result?.site?.documentId) return result.site.documentId;
  if (typeof result?.site === 'string') return result.site;

  if (result?.documentId) {
    try {
      const entry = await strapi.entityService.findOne('api::evenement.evenement', result.documentId, {
        populate: ['site'],
      });
      return entry?.site?.documentId || null;
    } catch {
      return null;
    }
  }
  return null;
}

export default {
  async afterCreate(event: any) {
    const siteId = await getSiteDocumentId(event);
    if (siteId) autoDeployService.scheduleDeployIfEnabled(siteId);
  },
  async afterUpdate(event: any) {
    const siteId = await getSiteDocumentId(event);
    if (siteId) autoDeployService.scheduleDeployIfEnabled(siteId);
  },
  async afterDelete(event: any) {
    const siteId = await getSiteDocumentId(event);
    if (siteId) autoDeployService.scheduleDeployIfEnabled(siteId);
  },
};
