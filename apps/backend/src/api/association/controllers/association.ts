/**
 * association controller
 */

import { factories } from '@strapi/strapi';
import { createRateLimiter } from '../../../utils/security';
import { log } from '../../../utils/logger';

// 3 propositions par heure et par IP
const isRateLimited = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 3 });

const VALID_CATEGORIES = ['sport', 'culture', 'social', 'environnement', 'education', 'autre'];
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 Mo
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export default factories.createCoreController('api::association.association', ({ strapi }) => ({
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
