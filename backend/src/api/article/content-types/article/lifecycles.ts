import autoDeployService from '../../../../services/auto-deploy';

async function getSiteDocumentId(event: any): Promise<string | null> {
  const { result } = event;
  // result.site may be a documentId string or an object with documentId
  if (result?.site?.documentId) return result.site.documentId;
  if (typeof result?.site === 'string') return result.site;

  // Fallback: refetch the entry with site populated
  if (result?.documentId) {
    try {
      const entry = await strapi.entityService.findOne('api::article.article', result.documentId, {
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
