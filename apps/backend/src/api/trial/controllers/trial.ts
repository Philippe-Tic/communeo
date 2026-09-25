/**
 * Période d'essai, côté commune (#310).
 *
 * POST /api/trial/live-request — un administrateur demande le passage en live : l'équipe Communeo est
 * prévenue par e-mail et passe la commune en live depuis l'espace équipe. Accepté aussi une fois
 * l'essai terminé (l'administration est alors en lecture seule). Le devis en ligne (#312) remplacera
 * cette demande.
 */
import { requestGoLive } from '../../../services/trial';
import { getEffectiveSite, hasRole } from '../../../utils/getEffectiveSite';

export default {
  async liveRequest(ctx) {
    const effective = await getEffectiveSite(ctx);
    if (!effective) return ctx.forbidden('Aucun site assigné à ce compte');
    if (!hasRole(ctx, ['admin', 'super_admin'])) return ctx.forbidden('Seul un administrateur de la commune peut demander le passage en live.');

    const site: any = await strapi.db.query('api::site.site').findOne({ where: { documentId: effective.documentId } });
    if (!site) return ctx.notFound('Site non trouvé');
    if ((site.plan ?? 'live') === 'live') return ctx.conflict('Ce site est déjà en live.');

    const user = ctx.state.user;
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;
    const updated: any = await requestGoLive(site, { email: user.email, name });
    ctx.body = { data: { liveRequestedAt: updated.live_requested_at } };
  },
};
