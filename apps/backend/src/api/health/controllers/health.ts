/**
 * GET /api/health : Strapi répond et sa base aussi (supervision externe, derrière nginx). Aucune
 * information sur la plateforme : 200 { status: 'ok' } ou 503.
 */
export default {
  async check(ctx) {
    try {
      await strapi.db.connection.raw('select 1');
      ctx.set('Cache-Control', 'no-store');
      ctx.body = { status: 'ok' };
    } catch {
      ctx.status = 503;
      ctx.body = { status: 'unavailable' };
    }
  },
};
