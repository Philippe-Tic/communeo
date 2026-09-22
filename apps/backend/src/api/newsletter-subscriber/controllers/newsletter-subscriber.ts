/**
 * newsletter-subscriber controller
 */

import { factories } from '@strapi/strapi';
import crypto from 'crypto';

import { createRateLimiter } from '../../../utils/security';
import { getEffectiveSite } from '../../../utils/getEffectiveSite';

// 5 requêtes par minute et par IP
const isRateLimited = createRateLimiter({ windowMs: 60 * 1000, max: 5 });

export default factories.createCoreController('api::newsletter-subscriber.newsletter-subscriber', ({ strapi }) => ({
  async publicSubscribe(ctx) {
    const ip = ctx.request.ip;
    if (isRateLimited(ip)) {
      ctx.status = 429;
      return { error: 'too_many_requests', message: 'Trop de requêtes. Veuillez réessayer dans une minute.' };
    }
    const { data } = ctx.request.body;

    if (!data) {
      return ctx.badRequest('Missing data');
    }

    const { email, first_name, last_name, site, website } = data;

    // Honeypot check — if filled, it's a bot; return fake success
    if (website) {
      ctx.status = 201;
      return { data: { message: 'Inscription réussie.' } };
    }

    // Validate email
    if (!email) {
      return ctx.badRequest('L\'email est requis');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return ctx.badRequest('Format d\'email invalide');
    }

    // Validate site
    if (!site) {
      return ctx.badRequest('Le champ site est requis');
    }

    const sites = await strapi.entityService.findMany('api::site.site', {
      filters: { documentId: { $eq: site } } as any,
    });

    if (!sites || sites.length === 0) {
      return ctx.badRequest('Site introuvable');
    }

    // Check uniqueness: email + site
    const existing = await strapi.entityService.findMany('api::newsletter-subscriber.newsletter-subscriber', {
      filters: {
        email: { $eq: email.trim().toLowerCase() },
        site: { documentId: { $eq: site } },
      } as any,
    });

    if (existing && existing.length > 0) {
      const subscriber = existing[0] as any;

      if (subscriber.active) {
        ctx.status = 409;
        return { error: 'already_subscribed', message: 'Cet email est déjà inscrit à la newsletter.' };
      }

      // Reactivate inactive subscriber
      await strapi.entityService.update('api::newsletter-subscriber.newsletter-subscriber', subscriber.id, {
        data: {
          active: true,
          unsubscribe_token: crypto.randomUUID(),
          subscribed_at: new Date().toISOString(),
          first_name: first_name?.trim() || subscriber.first_name,
          last_name: last_name?.trim() || subscriber.last_name,
        },
      });

      ctx.status = 201;
      return { data: { message: 'Inscription réussie.' } };
    }

    // Create new subscriber
    await strapi.entityService.create('api::newsletter-subscriber.newsletter-subscriber', {
      data: {
        email: email.trim().toLowerCase(),
        first_name: first_name?.trim() || undefined,
        last_name: last_name?.trim() || undefined,
        subscribed_at: new Date().toISOString(),
        active: true,
        unsubscribe_token: crypto.randomUUID(),
        site: (sites[0] as any).documentId,
      },
    });

    ctx.status = 201;
    return { data: { message: 'Inscription réussie.' } };
  },

  async publicUnsubscribe(ctx) {
    const { token } = ctx.query;

    if (!token) {
      return ctx.badRequest('Token manquant');
    }

    const subscribers = await strapi.entityService.findMany('api::newsletter-subscriber.newsletter-subscriber', {
      filters: { unsubscribe_token: { $eq: token } } as any,
    });

    if (!subscribers || subscribers.length === 0) {
      return ctx.notFound('Token invalide');
    }

    const subscriber = subscribers[0] as any;

    await strapi.entityService.update('api::newsletter-subscriber.newsletter-subscriber', subscriber.id, {
      data: { active: false, unsubscribe_token: crypto.randomUUID() },
    });

    return { success: true, message: 'Vous avez été désinscrit de la newsletter.' };
  },

  async stats(ctx) {
    const site = await getEffectiveSite(ctx);

    if (!site) {
      return ctx.forbidden('Utilisateur sans site assigné');
    }

    const siteDocumentId = site.documentId;

    const allSubscribers = await strapi.entityService.findMany('api::newsletter-subscriber.newsletter-subscriber', {
      filters: {
        site: { documentId: { $eq: siteDocumentId } },
      } as any,
      limit: -1,
    });

    const subscribers = allSubscribers || [];
    const total = subscribers.length;
    const active = subscribers.filter((s: any) => s.active).length;

    // Count subscribers from current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = subscribers.filter((s: any) => new Date(s.subscribed_at) >= startOfMonth && s.active).length;

    return { data: { total, active, thisMonth } };
  },
}));
