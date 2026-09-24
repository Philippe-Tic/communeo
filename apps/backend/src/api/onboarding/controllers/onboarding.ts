/**
 * Assistant de création (#150) : recherche d'une commune et données publiques pour pré-remplir.
 * GET /api/onboarding/communes?q=  (nom ou code postal)  → { data: CommuneMatch[] }
 * GET /api/onboarding/communes/:insee                    → { data: CommuneDetails }
 * Réservé aux administrateurs (et à l'équipe) : ce sont eux qui créent le site.
 *
 * Checklist « Pour terminer votre site » (#154), pour tous les utilisateurs de la commune :
 * GET  /api/onboarding/checklist      → { data: OnboardingChecklist & { visible } }
 * POST /api/onboarding/checklist/hide → masquée pour toute la commune (`onboarding.checklistHiddenAt`)
 */
import { onboardingChecklist } from '@communeo/core';
import { getEffectiveSite } from '../../../utils/getEffectiveSite';
import { communeDetails, PublicDataUnavailable, searchCommunes } from '../../../services/public-data';

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
      ctx.body = { data: details };
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
