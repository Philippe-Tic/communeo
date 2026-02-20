/**
 * association controller
 */

import { factories } from '@strapi/strapi';

const VALID_CATEGORIES = ['sport', 'culture', 'social', 'environnement', 'education', 'autre'];

export default factories.createCoreController('api::association.association', ({ strapi }) => ({
  async publicCreate(ctx) {
    const { data } = ctx.request.body;

    if (!data) {
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

    const sites = await strapi.entityService.findMany('api::site.site', {
      filters: { documentId: { $eq: site } } as any,
    });

    if (!sites || sites.length === 0) {
      return ctx.badRequest('Site introuvable');
    }

    // Create the association
    const entry = await strapi.entityService.create('api::association.association', {
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

    ctx.status = 201;
    return {
      data: {
        message: 'Votre proposition d\'association a été enregistrée. Elle sera examinée par la mairie.',
      },
    };
  },
}));
