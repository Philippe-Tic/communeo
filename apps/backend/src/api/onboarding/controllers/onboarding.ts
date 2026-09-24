/**
 * Assistant de création (#150) : recherche d'une commune et données publiques pour pré-remplir.
 * GET /api/onboarding/communes?q=  (nom ou code postal)  → { data: CommuneMatch[] }
 * GET /api/onboarding/communes/:insee                    → { data: CommuneDetails }
 * Réservé aux administrateurs (et à l'équipe) : ce sont eux qui créent le site.
 */
import { communeDetails, PublicDataUnavailable, searchCommunes } from '../../../services/public-data';

function allowed(ctx) {
  const role = ctx.state.user?.municipality_role;
  if (!ctx.state.user) {
    ctx.unauthorized('Authentification requise');
    return false;
  }
  if (role !== 'admin' && role !== 'super_admin') {
    ctx.forbidden('Réservé aux administrateurs');
    return false;
  }
  return true;
}

const unavailable = (ctx) => {
  ctx.status = 502;
  ctx.body = {
    data: null,
    error: { status: 502, name: 'BadGatewayError', message: 'Les données publiques ne répondent pas : renseignez les informations à la main.' },
  };
};

export default {
  async search(ctx) {
    if (!allowed(ctx)) return;
    try {
      ctx.body = { data: await searchCommunes(String(ctx.query.q ?? '')) };
    } catch (error) {
      if (error instanceof PublicDataUnavailable) return unavailable(ctx);
      throw error;
    }
  },

  async details(ctx) {
    if (!allowed(ctx)) return;
    try {
      const details = await communeDetails(String(ctx.params.insee));
      if (!details) return ctx.notFound('Commune introuvable');
      ctx.body = { data: details };
    } catch (error) {
      if (error instanceof PublicDataUnavailable) return unavailable(ctx);
      throw error;
    }
  },
};
