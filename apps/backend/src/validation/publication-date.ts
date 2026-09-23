/**
 * Date de publication des articles : remplie à la première publication si elle est vide, sur le
 * brouillon comme sur la version publiée. La preview (qui lit le brouillon) et le site publié
 * affichent ainsi la même date.
 */
const ARTICLE = 'api::article.article';

export function publicationDateMiddleware(strapi: any) {
  return async (ctx: any, next: () => Promise<any>) => {
    if (ctx.uid !== ARTICLE) return next();
    const now = new Date().toISOString();

    // Publication d'un document existant
    if (ctx.action === 'publish' && ctx.params?.documentId) {
      const draft = await strapi.db.query(ARTICLE).findOne({ where: { documentId: ctx.params.documentId, publishedAt: null } });
      if (draft && !draft.publication_date) {
        await strapi.db.query(ARTICLE).update({ where: { id: draft.id }, data: { publication_date: now } });
      }
      return next();
    }

    // Écriture avec publication immédiate (`?status=published`)
    if ((ctx.action === 'create' || ctx.action === 'update') && ctx.params?.status === 'published') {
      const data = (ctx.params.data ??= {});
      if (!data.publication_date) {
        const existing = ctx.params.documentId
          ? await strapi.db.query(ARTICLE).findOne({ where: { documentId: ctx.params.documentId, publishedAt: null } })
          : null;
        if (!existing?.publication_date) data.publication_date = now;
      }
    }
    return next();
  };
}
