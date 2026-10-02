/**
 * Assistant de création (#150) : recherche d'une commune et données publiques pour pré-remplir.
 * GET /api/onboarding/communes?q=  (nom ou code postal)  → { data: CommuneMatch[] }
 * GET /api/onboarding/communes/:insee                    → { data: CommuneDetails }
 * Réservé aux administrateurs (et à l'équipe) : ce sont eux qui créent le site.
 *
 * Emplacement de la commune pour la carte et la météo (#362), pour tous les utilisateurs de la commune :
 * GET /api/onboarding/places?q=&lat=&lon=     → { data: PlaceMatch[] } (ville ou adresse, proches du point)
 * GET /api/onboarding/places/commune?lat=&lon= → { data: { name, postalCode } | null } (commune du point)
 *
 * Checklist « Pour terminer votre site » (#154), pour tous les utilisateurs de la commune :
 * GET  /api/onboarding/checklist      → { data: OnboardingChecklist & { visible } }
 * POST /api/onboarding/checklist/hide → masquée pour toute la commune (`onboarding.checklistHiddenAt`)
 */
import { onboardingChecklist } from '@communeo/core';
import { getEffectiveSite } from '../../../utils/getEffectiveSite';
import { communeAt, communeDetails, PublicDataUnavailable, searchCommunes, searchPlaces } from '../../../services/public-data';
import { isTestAddress } from '../../../utils/test-signup';

const PAGE = 'api::page.page';

async function communeSite(ctx) {
  if (!ctx.state.user) {
    ctx.unauthorized('Authentification requise');
    return null;
  }
  const site = await getEffectiveSite(ctx);
  if (!site) {
    ctx.forbidden('Aucun site assigné à ce compte');
    return null;
  }
  return site;
}

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
      // Site de test de l'équipe : pas l'e-mail de la vraie mairie comme contact du site
      const test = isTestAddress(ctx.state.user?.email) && details.townHall;
      ctx.body = { data: test ? { ...details, townHall: { ...details.townHall, email: null } } : details };
    } catch (error) {
      if (error instanceof PublicDataUnavailable) return unavailable(ctx);
      throw error;
    }
  },

  // Emplacement de la commune (carte et météo, #362) : assistant et écran Informations, ouvert à
  // tous les utilisateurs de la commune (les rédacteurs modifient aussi les informations)
  async places(ctx) {
    if (!(await communeSite(ctx))) return;
    try {
      ctx.body = { data: await searchPlaces(String(ctx.query.q ?? ''), { lat: ctx.query.lat, lon: ctx.query.lon }) };
    } catch (error) {
      if (error instanceof PublicDataUnavailable) return unavailable(ctx);
      throw error;
    }
  },

  async placeCommune(ctx) {
    if (!(await communeSite(ctx))) return;
    try {
      ctx.body = { data: await communeAt(ctx.query.lat, ctx.query.lon) };
    } catch (error) {
      if (error instanceof PublicDataUnavailable) return unavailable(ctx);
      throw error;
    }
  },

  async checklist(ctx) {
    const effective = await communeSite(ctx);
    if (!effective) return;
    const bySite = { site: { documentId: effective.documentId } };
    const [site, published, templatePages]: any[] = await Promise.all([
      strapi.documents('api::site.site').findOne({
        documentId: effective.documentId,
        populate: ['logo', 'mentions_legales', 'rgpd', 'accessibilite'] as any,
      }),
      strapi.documents(PAGE).findMany({ filters: bySite as any, status: 'published', fields: ['documentId'] as any }),
      strapi.db.query(PAGE).findMany({
        where: { ...bySite, template: { $notNull: true } },
        select: ['documentId', 'publishedAt'],
      }),
    ]);
    if (!site) return ctx.notFound('Commune introuvable');
    // Page d'un modèle encore jamais publiée : aucune de ses lignes n'a de date de publication
    const publishedIds = new Set(published.map((page) => page.documentId));
    const templateDrafts = new Set(
      templatePages.filter((page) => !publishedIds.has(page.documentId)).map((page) => page.documentId),
    ).size;
    const checklist = onboardingChecklist({
      site: { ...site, hasLogo: !!site.logo },
      pages: { published: publishedIds.size, templateDrafts },
    });
    const progress = site.onboarding;
    ctx.body = {
      data: {
        ...checklist,
        // Communes passées par l'assistant, qui l'ont terminé, tant que la checklist n'est ni faite ni masquée
        visible: !!progress?.completedAt && !progress.checklistHiddenAt && checklist.done < checklist.total,
      },
    };
  },

  async hideChecklist(ctx) {
    const effective = await communeSite(ctx);
    if (!effective) return;
    const site: any = await strapi.documents('api::site.site').findOne({
      documentId: effective.documentId,
      fields: ['onboarding'] as any,
    });
    if (!site?.onboarding) return ctx.notFound("Cette commune n'a pas de checklist");
    await strapi.documents('api::site.site').update({
      documentId: effective.documentId,
      data: { onboarding: { ...site.onboarding, checklistHiddenAt: new Date().toISOString() } } as any,
    });
    ctx.body = { data: { hidden: true } };
  },
};
