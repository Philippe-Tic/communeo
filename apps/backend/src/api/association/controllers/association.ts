/**
 * association controller
 */

import { factories } from '@strapi/strapi';
import { createRateLimiter, escapeHtml } from '../../../utils/security';
import { log } from '../../../utils/logger';

// 3 propositions par heure et par IP
const isRateLimited = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 3 });

const VALID_CATEGORIES = ['sport', 'culture', 'social', 'environnement', 'education', 'autre'];
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 Mo
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const REASON_MAX = 2000;

/** Modération : seules les propositions en attente (ou refusées, réexaminées) peuvent être publiées */
async function findForReview(strapi: any, documentId: string) {
  return strapi.documents('api::association.association').findOne({ documentId, populate: ['site'] });
}

export default factories.createCoreController('api::association.association', ({ strapi }) => ({
  /**
   * Publie une association (proposition acceptée ou fiche saisie par la commune).
   * POST /api/associations/:id/publish — commune vérifiée par site-isolation
   */
  async publish(ctx) {
    const association = await findForReview(strapi, ctx.params.id);
    if (!association) return ctx.notFound();
    if (association.status === 'published') return ctx.badRequest('Cette association est déjà publiée');
    const updated = await strapi.documents('api::association.association').update({
      documentId: association.documentId,
      data: { status: 'published', reviewed_at: new Date().toISOString(), rejection_reason: null } as any,
    });
    ctx.body = { data: updated };
  },

  /**
   * Refuse une proposition avec un motif, envoyé par e-mail au demandeur (#187).
   * POST /api/associations/:id/reject { reason }
   */
  async reject(ctx) {
    const reason = typeof ctx.request.body?.reason === 'string' ? ctx.request.body.reason.trim() : '';
    if (!reason) return ctx.badRequest('Le motif du refus est obligatoire : il est envoyé au demandeur.');
    if (reason.length > REASON_MAX) return ctx.badRequest(`Le motif ne doit pas dépasser ${REASON_MAX} caractères`);

    const association = await findForReview(strapi, ctx.params.id);
    if (!association) return ctx.notFound();
    if (association.status !== 'pending') return ctx.badRequest('Seule une proposition en attente peut être refusée');

    const updated = await strapi.documents('api::association.association').update({
      documentId: association.documentId,
      data: { status: 'rejected', reviewed_at: new Date().toISOString(), rejection_reason: reason } as any,
    });

    let emailed = false;
    if (association.submitted_by_email) {
      const siteName = association.site?.name ?? 'la mairie';
      const name = association.submitted_by_name ?? '';
      try {
        await strapi.plugin('email').service('email').send({
          to: association.submitted_by_email,
          // Le demandeur peut répondre directement à la mairie (informations manquantes)
          ...(association.site?.contact_mail ? { replyTo: association.site.contact_mail } : {}),
          subject: `Votre proposition « ${association.name} » — ${siteName}`,
          text: `Bonjour ${name},\n\nVotre proposition d'association « ${association.name} » n'a pas été publiée sur le site de ${siteName}.\n\nMotif :\n${reason}\n\nVous pouvez soumettre une nouvelle proposition depuis le site.`,
          html: `<p>Bonjour ${escapeHtml(name)},</p><p>Votre proposition d'association « ${escapeHtml(association.name)} » n'a pas été publiée sur le site de ${escapeHtml(siteName)}.</p><p><strong>Motif :</strong></p><p>${escapeHtml(reason).replace(/\n/g, '<br>')}</p><p>Vous pouvez soumettre une nouvelle proposition depuis le site.</p>`,
        });
        emailed = true;
      } catch (error) {
        // Le refus est enregistré ; l'admin est prévenu que l'e-mail n'est pas parti
        log.error('[association] Motif de refus non envoyé :', error);
      }
    }
    ctx.body = { data: updated, emailed };
  },

  async publicCreate(ctx) {
    if (isRateLimited(ctx.request.ip)) {
      return ctx.tooManyRequests('Trop de demandes. Veuillez réessayer plus tard.');
    }

    // Support both JSON and multipart form data
    let data: any;
    let logoFile: any = null;

    if (typeof ctx.request.body?.data === 'string') {
      // Multipart: data is JSON-stringified
      try {
        data = JSON.parse(ctx.request.body.data);
      } catch {
        return ctx.badRequest('Invalid JSON in data field');
      }
      // File comes from ctx.request.files
      const files = ctx.request.files;
      if (files && files['files.logo']) {
        logoFile = files['files.logo'];
      }
    } else if (ctx.request.body?.data) {
      // Classic JSON body
      data = ctx.request.body.data;
    } else {
      return ctx.badRequest('Missing data');
    }

    const { name, category, description, contact_name, contact_email, contact_phone, website, address, submitted_by_name, submitted_by_email, site } = data;

    // Validate required fields
    if (!name || !category || !submitted_by_name || !submitted_by_email) {
      return ctx.badRequest('Champs requis manquants : name, category, submitted_by_name, submitted_by_email');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(submitted_by_email)) {
      return ctx.badRequest('Format d\'email invalide pour submitted_by_email');
    }

    if (contact_email && !emailRegex.test(contact_email)) {
      return ctx.badRequest('Format d\'email invalide pour contact_email');
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(category)) {
      return ctx.badRequest(`Catégorie invalide. Valeurs acceptées : ${VALID_CATEGORIES.join(', ')}`);
    }

    // Validate site exists
    if (!site) {
      return ctx.badRequest('Le champ site est requis');
    }

    const sites = await strapi.documents('api::site.site').findMany({
      filters: { documentId: { $eq: site } } as any,
    });

    if (!sites || sites.length === 0) {
      return ctx.badRequest('Site introuvable');
    }

    // Validate logo file if present
    if (logoFile) {
      if (!ALLOWED_MIME_TYPES.includes(logoFile.mimetype)) {
        return ctx.badRequest('Type de fichier non autorisé. Formats acceptés : PNG, JPEG, WebP.');
      }
      if (logoFile.size > MAX_LOGO_SIZE) {
        return ctx.badRequest('Le fichier est trop volumineux. Taille maximum : 2 Mo.');
      }
    }

    // Create the association
    const entry = await strapi.documents('api::association.association').create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : undefined,
        category,
        contact_name: contact_name ? contact_name.trim() : undefined,
        contact_email: contact_email ? contact_email.trim().toLowerCase() : undefined,
        contact_phone: contact_phone ? contact_phone.trim() : undefined,
        website: website ? website.trim() : undefined,
        address: address ? address.trim() : undefined,
        submitted_by_name: submitted_by_name.trim(),
        submitted_by_email: submitted_by_email.trim().toLowerCase(),
        status: 'pending',
        submission_source: 'public_form',
        site: sites[0].documentId,
      },
    });

    // Upload logo if present and link to the association
    if (logoFile) {
      try {
        await strapi.plugin('upload').service('upload').upload({
          data: {
            ref: 'api::association.association',
            refId: entry.id,
            field: 'logo',
          },
          files: logoFile,
        });
      } catch (err) {
        // Log but don't fail the whole request — association is already created
        log.error('Failed to upload association logo:', err);
      }
    }

    ctx.status = 201;
    return {
      data: {
        message: 'Votre proposition d\'association a été enregistrée. Elle sera examinée par la mairie.',
      },
    };
  },
}));
