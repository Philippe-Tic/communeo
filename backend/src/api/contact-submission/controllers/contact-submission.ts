/**
 * contact-submission controller
 */

import { factories } from '@strapi/strapi';

const VALID_CATEGORIES = ['general', 'urbanisme', 'etat-civil', 'voirie', 'associations', 'rgpd', 'autre'];

export default factories.createCoreController('api::contact-submission.contact-submission', ({ strapi }) => ({
  async publicCreate(ctx) {
    const { data } = ctx.request.body;

    if (!data) {
      return ctx.badRequest('Missing data');
    }

    const { first_name, last_name, email, subject, message, category, site, phone } = data;

    // Validate required fields
    if (!first_name || !last_name || !email || !subject || !message || !category) {
      return ctx.badRequest('Champs requis manquants : first_name, last_name, email, subject, message, category');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return ctx.badRequest('Format d\'email invalide');
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(category)) {
      return ctx.badRequest(`Catégorie invalide. Valeurs acceptées : ${VALID_CATEGORIES.join(', ')}`);
    }

    // Validate site exists
    if (!site) {
      return ctx.badRequest('Le champ site est requis');
    }

    const sites = await strapi.entityService.findMany('api::site.site', {
      filters: { documentId: { $eq: site } } as any,
    });

    if (!sites || sites.length === 0) {
      return ctx.badRequest('Site introuvable');
    }

    // Generate SVE reference number: SVE-{YYYY}-{N}
    const year = new Date().getFullYear();
    const existingCount = await strapi.entityService.findMany('api::contact-submission.contact-submission', {
      filters: {
        reference_number: { $startsWith: `SVE-${year}-` },
      },
      sort: { createdAt: 'desc' },
      limit: 1,
    });

    let nextNumber = 1;
    if (existingCount && existingCount.length > 0) {
      const lastRef = existingCount[0].reference_number;
      const lastNumber = parseInt(lastRef.split('-').pop(), 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    const reference_number = `SVE-${year}-${String(nextNumber).padStart(4, '0')}`;

    // Create the submission
    const entry = await strapi.entityService.create('api::contact-submission.contact-submission', {
      data: {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : undefined,
        subject: subject.trim(),
        message: message.trim(),
        category,
        status: 'received',
        reference_number,
        acknowledgment_sent: false,
        site: sites[0].documentId,
      },
    });

    ctx.status = 201;
    return {
      data: {
        reference_number: entry.reference_number,
        message: 'Votre demande a été enregistrée. Vous recevrez un accusé de réception.',
      },
    };
  },
}));
