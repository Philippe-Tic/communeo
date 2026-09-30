/**
 * Référencement au passage sur le domaine (#336), pour les administrateurs de la commune.
 *
 * GET /api/seo/checklist[?refresh=1]  → { siteUrl, items } (null tant que le site n'est pas publié) ;
 *                                       Annuaire et Wikidata vérifiés en direct, cache de 30 minutes
 * PUT /api/seo/checklist/:item        → { done } : la commune déclare la démarche faite (ou non)
 */
import { SEO_CHECKLIST_IDS, type SeoChecklistId } from '@communeo/core';
import { checklistOf, declare } from '../../../services/seo-checklist';
import { getEffectiveSite, hasRole } from '../../../utils/getEffectiveSite';

async function communeOf(ctx) {
  if (!hasRole(ctx, ['admin', 'super_admin'])) {
    ctx.forbidden('Réservé aux administrateurs de la commune');
    return null;
  }
  const effective = await getEffectiveSite(ctx);
  if (!effective) {
    ctx.forbidden('Aucun site assigné à ce compte');
    return null;
  }
  return strapi.db.query('api::site.site').findOne({ where: { documentId: effective.documentId } });
}

export default {
  async checklist(ctx) {
    const site = await communeOf(ctx);
    if (!site) return;
    ctx.body = { data: await checklistOf(site, { refresh: ctx.query?.refresh === '1' }) };
  },

  async declare(ctx) {
    const site = await communeOf(ctx);
    if (!site) return;
    const item = ctx.params.item as SeoChecklistId;
    if (!SEO_CHECKLIST_IDS.includes(item)) return ctx.notFound('Démarche inconnue');
    const done = (ctx.request.body ?? {}).done;
    if (typeof done !== 'boolean') return ctx.badRequest('done : true ou false');
    ctx.body = { data: await checklistOf(await declare(site, item, done)) };
  },
};
