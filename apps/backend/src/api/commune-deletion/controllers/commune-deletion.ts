/**
 * Suppression de la commune demandée par la commune (#391), voir services/commune-deletion-request.ts.
 *
 * GET  /api/commune-deletion          → { scheduledAt } : tous les utilisateurs de la commune (bandeau)
 * POST /api/commune-deletion/request  → { name } : le nom de la commune, tapé pour confirmer ; administrateurs
 * POST /api/commune-deletion/cancel   → administrateurs (et l'équipe, dans l'administration de la commune)
 */
import { deletionConfirmed } from '@communeo/core';
import { cancelDeletion, deletionStateOf, requestDeletion } from '../../../services/commune-deletion-request';
import { getEffectiveSite, hasRole } from '../../../utils/getEffectiveSite';

const SITE = 'api::site.site';

async function communeOf(ctx, { adminOnly }: { adminOnly: boolean }) {
  if (adminOnly && !hasRole(ctx, ['admin', 'super_admin'])) {
    ctx.forbidden('Réservé aux administrateurs de la commune');
    return null;
  }
  const effective = await getEffectiveSite(ctx);
  if (!effective) {
    ctx.forbidden('Aucun site assigné à ce compte');
    return null;
  }
  return strapi.db.query(SITE).findOne({ where: { documentId: effective.documentId } });
}

/** Nom de la personne connectée ; l'équipe Communeo est nommée comme telle */
function authorOf(ctx): string {
  const user = ctx.state.user ?? {};
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'Un administrateur';
  return user.municipality_role === 'super_admin' ? `L'équipe Communeo (${name})` : name;
}

export default {
  async state(ctx) {
    const site = await communeOf(ctx, { adminOnly: false });
    if (!site) return;
    ctx.body = { data: deletionStateOf(site) };
  },

  async request(ctx) {
    const site = await communeOf(ctx, { adminOnly: true });
    if (!site) return;
    if (!deletionConfirmed((ctx.request.body ?? {}).name, site.name)) {
      return ctx.badRequest(`Tapez le nom de la commune, « ${site.name} », pour confirmer la suppression.`);
    }
    ctx.body = { data: deletionStateOf(await requestDeletion(site, authorOf(ctx))) };
  },

  async cancel(ctx) {
    const site = await communeOf(ctx, { adminOnly: true });
    if (!site) return;
    ctx.body = { data: deletionStateOf(await cancelDeletion(site, authorOf(ctx))) };
  },
};
