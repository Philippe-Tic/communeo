/**
 * GET /api/activity-log?page=&action=&site= → { data, meta: { pagination } }
 * - équipe Communeo (sans impersonation) : toutes les communes, `site` pour en choisir une ;
 * - administrateur d'une commune (ou équipe en impersonation) : la commune seulement, actions de
 *   l'équipe Communeo comprises ;
 * - éditeur : refusé.
 * Pas de route REST générique : le journal ne s'écrit que par le serveur (services/activity-log).
 */
import { getEffectiveSite } from '../../../utils/getEffectiveSite';

const LOG = 'api::activity-log.activity-log';
const PAGE_SIZE = 30;
/** Actions connues (celles du schéma), pour le filtre */
const actions = (): Set<string> => new Set((strapi.contentTypes[LOG] as any)?.attributes?.action?.enum ?? []);

export default {
  async find(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Authentification requise');
    const role = user.municipality_role;
    if (role !== 'admin' && role !== 'super_admin') return ctx.forbidden('Réservé aux administrateurs');

    const page = Math.max(1, Number.parseInt(String(ctx.query.page ?? '1'), 10) || 1);
    const where: Record<string, unknown> = {};
    const action = String(ctx.query.action ?? '');
    if (action && actions().has(action)) where.action = action;

    if (role === 'super_admin' && !ctx.state.impersonatedSite) {
      if (typeof ctx.query.site === 'string' && ctx.query.site) where.site = { documentId: ctx.query.site };
    } else {
      const site = await getEffectiveSite(ctx);
      if (!site) return ctx.forbidden('Aucun site assigné à ce compte');
      where.site = { documentId: site.documentId };
    }

    const [rows, total] = await Promise.all([
      strapi.db.query(LOG).findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        offset: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
        populate: { site: { select: ['documentId', 'name'] } },
      }),
      strapi.db.query(LOG).count({ where }),
    ]);

    ctx.body = {
      data: rows.map((row: any) => ({
        id: row.id,
        at: row.createdAt,
        action: row.action,
        actorName: row.actor_name,
        onBehalf: !!row.on_behalf,
        target: row.target_type ? { type: row.target_type, id: row.target_id, label: row.target_label } : null,
        site: row.site ? { documentId: row.site.documentId, name: row.site.name } : null,
        // L'adresse IP des connexions : seulement pour l'équipe Communeo (sécurité de la plateforme)
        ip: role === 'super_admin' ? row.ip : undefined,
        details: row.details ?? null,
      })),
      meta: { pagination: { page, pageSize: PAGE_SIZE, total, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) } },
    };
  },
};
