/**
 * Historique d'un contenu (#183), pour les utilisateurs de sa commune (impersonation comprise) :
 * GET  /api/content-versions/:type/:documentId          → versions, du plus récent au plus ancien
 * GET  /api/content-versions/:type/:documentId/:id      → instantané d'une version (Voir, Comparer)
 * POST /api/content-versions/:type/:documentId/checkpoint → garde le brouillon avant une restauration
 * La restauration elle-même se fait dans l'éditeur (nouveau brouillon) : la version en ligne n'est
 * jamais touchée par l'historique.
 */
import { recordVersion, VERSIONED_TYPES } from '../../../services/content-versions';
import { getEffectiveSite } from '../../../utils/getEffectiveSite';

const VERSION = 'api::content-version.content-version';

/** Le contenu demandé, s'il appartient à la commune de la personne */
async function resolve(ctx) {
  if (!ctx.state.user) {
    ctx.unauthorized('Authentification requise');
    return null;
  }
  const uid = VERSIONED_TYPES[ctx.params.type];
  if (!uid) {
    ctx.notFound('Type de contenu inconnu');
    return null;
  }
  const site = await getEffectiveSite(ctx);
  if (!site) {
    ctx.forbidden('Aucun site assigné à ce compte');
    return null;
  }
  const entries = await strapi.db.query(uid).findMany({
    where: { documentId: ctx.params.documentId, site: { documentId: site.documentId } },
    select: ['id', 'createdAt', 'publishedAt'],
  });
  if (!entries.length) {
    ctx.notFound('Contenu introuvable');
    return null;
  }
  const published = entries.find((entry: any) => entry.publishedAt) ?? null;
  const created = entries.map((entry: any) => entry.createdAt).sort()[0];
  return { uid, type: ctx.params.type as string, documentId: ctx.params.documentId as string, published, created };
}

export default {
  async list(ctx) {
    const target = await resolve(ctx);
    if (!target) return;
    const where = { content_type: target.type, content_document_id: target.documentId };
    // Contenu publié avant l'historique : sa version en ligne devient la première version connue
    if (target.published && !(await strapi.db.query(VERSION).count({ where: { ...where, kind: 'published' } }))) {
      await recordVersion(target.uid, target.documentId, 'published');
      const [first] = await strapi.db.query(VERSION).findMany({ where, orderBy: { id: 'desc' }, limit: 1 });
      if (first)
        await strapi.db.query(VERSION).update({
          where: { id: first.id },
          data: { createdAt: target.published.publishedAt, author: null, author_name: null, summary: 'première version connue' },
        });
    }
    const rows = await strapi.db.query(VERSION).findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: ['id', 'createdAt', 'kind', 'summary', 'block_count', 'author_name'],
    });
    // La version en ligne : la dernière publiée, si le contenu est toujours publié
    const live = target.published ? rows.find((row: any) => row.kind === 'published')?.id ?? null : null;
    ctx.body = {
      data: rows.map((row: any) => ({
        id: row.id,
        at: row.createdAt,
        kind: row.kind,
        summary: row.summary,
        blockCount: row.block_count,
        authorName: row.author_name,
        live: row.id === live,
      })),
      meta: { createdAt: target.created },
    };
  },

  async findOne(ctx) {
    const target = await resolve(ctx);
    if (!target) return;
    const version = await strapi.db.query(VERSION).findOne({
      where: { id: Number(ctx.params.id), content_type: target.type, content_document_id: target.documentId },
    });
    if (!version) return ctx.notFound('Version introuvable');
    ctx.body = { data: { id: version.id, at: version.createdAt, kind: version.kind, snapshot: version.snapshot } };
  },

  async checkpoint(ctx) {
    const target = await resolve(ctx);
    if (!target) return;
    await recordVersion(target.uid, target.documentId, 'draft');
    ctx.status = 204;
  },
};
