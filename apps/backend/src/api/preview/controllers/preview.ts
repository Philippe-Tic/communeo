/**
 * Preview des brouillons : délivre un jeton signé de courte durée pour la commune de l'utilisateur,
 * et l'adresse de la page à ouvrir sur le serveur de preview.
 * La commune vient toujours du compte (jamais de la requête) : un jeton ne montre qu'elle.
 */
import { isThemeAvailable, PREVIEW_PATHS, signPreviewToken, THEME_IDS, type PreviewableType } from '@communeo/core';
import { getEffectiveSite } from '../../../utils/getEffectiveSite';

const CONTENT_TYPES: Record<PreviewableType, string> = {
  page: 'api::page.page',
  article: 'api::article.article',
  evenement: 'api::evenement.evenement',
  'official-document': 'api::official-document.official-document',
};

export default {
  /**
   * POST /api/preview/token — body : { type?, documentId?, theme? }
   */
  async token(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Authentification requise');
    const secret = process.env.PREVIEW_SECRET;
    if (!secret) {
      ctx.status = 503;
      ctx.body = { error: { status: 503, message: "Preview indisponible : PREVIEW_SECRET n'est pas défini" } };
      return;
    }

    const site = await getEffectiveSite(ctx);
    if (!site?.documentId) return ctx.badRequest('Utilisateur sans site assigné');

    const { type, documentId, theme } = (ctx.request.body ?? {}) as { type?: string; documentId?: string; theme?: string };
    if (theme !== undefined && !(THEME_IDS as string[]).includes(theme)) return ctx.badRequest('Thème inconnu');
    if (theme !== undefined && !isThemeAvailable(theme)) return ctx.badRequest("Ce thème n'est pas encore disponible");

    // Page d'arrivée : le contenu demandé (brouillon compris), s'il appartient à la commune
    let path = '/';
    if (type !== undefined || documentId !== undefined) {
      if (!type || !(type in CONTENT_TYPES) || !documentId) return ctx.badRequest('Contenu à prévisualiser invalide');
      const entry = await strapi.db.query(CONTENT_TYPES[type as PreviewableType]).findOne({
        where: { documentId, site: { documentId: site.documentId } },
        orderBy: { publishedAt: 'asc' },
      });
      if (!entry) return ctx.notFound('Contenu introuvable');
      path = PREVIEW_PATHS[type as PreviewableType](entry.slug);
    }

    const { token, expiresAt } = await signPreviewToken({ site: site.documentId, ...(theme ? { theme } : {}) }, secret);
    const base = (process.env.PREVIEW_URL || 'http://localhost:4321').replace(/\/$/, '');
    const url = new URL(`${base}${path}`);
    url.searchParams.set('token', token);
    ctx.body = { url: url.toString(), expiresAt: expiresAt.toISOString() };
  },
};
