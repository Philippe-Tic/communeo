/**
 * Publication des contenus en Draft & Publish, pour les listes de l'admin : ce que l'API REST
 * de Strapi 5 ne fait pas.
 *
 * GET /api/publication/:type → { data: { [documentId]: { state, scheduledAt } } } pour la commune :
 * - `draft` : jamais publié (ou dépublié) ;
 * - `published` : en ligne, sans modification depuis ;
 * - `modified` : en ligne, avec des modifications enregistrées en brouillon ;
 * `scheduledAt` : publication programmée du brouillon, s'il y en a une.
 *
 * POST /api/publication/:type/:documentId/unpublish : retire la version en ligne et garde le
 * brouillon (en REST, `DELETE ?status=published` supprime tout le document).
 */
import { getEffectiveSite } from '../../../utils/getEffectiveSite';

export const PUBLICATION_TYPES: Record<string, string> = {
  pages: 'api::page.page',
  articles: 'api::article.article',
  evenements: 'api::evenement.evenement',
  'official-documents': 'api::official-document.official-document',
};

export type PublicationState = 'draft' | 'published' | 'modified';

type Row = { documentId: string; publishedAt: string | null; updatedAt: string; scheduled_at: string | null };

async function resolve(ctx) {
  if (!ctx.state.user) {
    ctx.unauthorized('Authentification requise');
    return null;
  }
  const uid = PUBLICATION_TYPES[ctx.params.type];
  if (!uid) {
    ctx.notFound('Type de contenu inconnu');
    return null;
  }
  const site = await getEffectiveSite(ctx);
  if (!site) {
    ctx.forbidden('Aucun site assigné à ce compte');
    return null;
  }
  return { uid, siteDocumentId: site.documentId as string };
}

export default {
  async states(ctx) {
    const target = await resolve(ctx);
    if (!target) return;

    const rows: Row[] = await strapi.db.query(target.uid as any).findMany({
      where: { site: { documentId: target.siteDocumentId } },
      select: ['documentId', 'publishedAt', 'updatedAt', 'scheduled_at'],
    });

    const drafts = new Map<string, Row>();
    const published = new Map<string, number>();
    for (const row of rows) {
      if (row.publishedAt) published.set(row.documentId, new Date(row.updatedAt).getTime());
      else drafts.set(row.documentId, row);
    }

    const data: Record<string, { state: PublicationState; scheduledAt: string | null }> = {};
    for (const [documentId, draft] of drafts) {
      const publishedUpdated = published.get(documentId);
      // La publication recopie le brouillon : une date de brouillon plus récente signale une modification
      const state = publishedUpdated === undefined ? 'draft' : new Date(draft.updatedAt).getTime() > publishedUpdated ? 'modified' : 'published';
      data[documentId] = { state, scheduledAt: draft.scheduled_at ? new Date(draft.scheduled_at).toISOString() : null };
    }
    ctx.body = { data };
  },

  async unpublish(ctx) {
    const target = await resolve(ctx);
    if (!target) return;
    const { documentId } = ctx.params;

    // Le document doit appartenir à la commune (brouillon ou version en ligne)
    const entity = await strapi.db.query(target.uid as any).findOne({ where: { documentId }, populate: ['site'] });
    if (!entity || entity.site?.documentId !== target.siteDocumentId) return ctx.notFound();

    await strapi.documents(target.uid as any).unpublish({ documentId });
    ctx.body = { data: { documentId, state: 'draft' } };
  },
};
