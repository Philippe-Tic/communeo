/**
 * GET /api/compliance → { data: ComplianceReport } : conformité du site de la commune (écran
 * Conformité, tableau de bord). Le calcul est dans `@communeo/core` ; ici, on rassemble les
 * réglages légaux, les documents publiés, les images sans texte alternatif et les demandes RGPD
 * encore ouvertes de la commune.
 */
import { computeCompliance } from '@communeo/core';
import { getEffectiveSite } from '../../../utils/getEffectiveSite';

export default {
  async report(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Authentification requise');
    const effective = await getEffectiveSite(ctx);
    if (!effective) return ctx.forbidden('Aucun site assigné à ce compte');
    const bySite = { site: { documentId: effective.documentId } };

    const [site, documents, images, rgpdRequests] = await Promise.all([
      strapi.documents('api::site.site').findOne({
        documentId: effective.documentId,
        populate: ['mentions_legales', 'rgpd', 'accessibilite'] as any,
      }),
      strapi.documents('api::official-document.official-document').findMany({
        filters: bySite as any,
        status: 'published',
        fields: ['document_type', 'year', 'document_date'] as any,
      }),
      strapi.db.query('api::media-item.media-item').findMany({
        where: bySite,
        populate: { file: { select: ['mime', 'alternativeText'] } },
      }),
      strapi.db.query('api::contact-submission.contact-submission').findMany({
        where: { ...bySite, category: 'rgpd', status: { $in: ['received', 'in_progress'] } },
        select: ['createdAt'],
      }),
    ]);
    if (!site) return ctx.notFound('Commune introuvable');

    ctx.body = {
      data: computeCompliance({
        site: site as any,
        documents: documents as any,
        imagesWithoutAlt: images.filter(
          (item: any) => item.file?.mime?.startsWith('image/') && !item.file.alternativeText?.trim(),
        ).length,
        openRgpdRequests: rgpdRequests.map((request: any) => request.createdAt),
      }),
    };
  },
};
