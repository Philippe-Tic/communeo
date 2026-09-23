/**
 * newsletter-subscriber controller
 */

import { factories } from '@strapi/strapi';
import crypto from 'crypto';

import { createRateLimiter } from '../../../utils/security';
import { getEffectiveSite } from '../../../utils/getEffectiveSite';

const UID = 'api::newsletter-subscriber.newsletter-subscriber';

/** Début du mois en cours, heure de Paris (« nouveaux en septembre ») */
function parisMonthStart(now: Date) {
  const [year, month] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit' }).format(now).split('-').map(Number);
  // Minuit à Paris : 22 h ou 23 h UTC la veille selon l'heure d'été
  const utcMidnight = Date.UTC(year!, month! - 1, 1);
  const offset = new Date(utcMidnight).toLocaleString('en-US', { timeZone: 'Europe/Paris', hour: 'numeric', hour12: false });
  return new Date(utcMidnight - Number(offset) * 3_600_000);
}

/** Cellule CSV : entre guillemets, formules neutralisées (un tableur n'exécute pas « =… ») */
function csvCell(value: unknown) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

const parisDate = (value: string | null | undefined) =>
  value ? new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value)) : '';

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

    const sites = await strapi.documents('api::site.site').findMany({
      filters: { documentId: { $eq: site } } as any,
    });

    if (!sites || sites.length === 0) {
      return ctx.badRequest('Site introuvable');
    }

    // Check uniqueness: email + site
    const existing = await strapi.documents('api::newsletter-subscriber.newsletter-subscriber').findMany({
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
      await strapi.documents('api::newsletter-subscriber.newsletter-subscriber').update({ documentId: subscriber.documentId,
        data: {
          active: true,
          unsubscribed_at: null,
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
    await strapi.documents('api::newsletter-subscriber.newsletter-subscriber').create({
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

    const subscribers = await strapi.documents('api::newsletter-subscriber.newsletter-subscriber').findMany({
      filters: { unsubscribe_token: { $eq: token } } as any,
    });

    if (!subscribers || subscribers.length === 0) {
      return ctx.notFound('Token invalide');
    }

    const subscriber = subscribers[0] as any;

    await strapi.documents('api::newsletter-subscriber.newsletter-subscriber').update({ documentId: subscriber.documentId,
      data: { active: false, unsubscribed_at: new Date().toISOString(), unsubscribe_token: crypto.randomUUID() },
    });

    return { success: true, message: 'Vous avez été désinscrit de la newsletter.' };
  },

  async stats(ctx) {
    const site = await getEffectiveSite(ctx);

    if (!site) {
      return ctx.forbidden('Utilisateur sans site assigné');
    }

    const siteDocumentId = site.documentId;

    const subscribers = strapi.documents('api::newsletter-subscriber.newsletter-subscriber');
    const bySite = { site: { documentId: { $eq: siteDocumentId } } };
    const startOfMonth = parisMonthStart(new Date()).toISOString();

    const [total, active, thisMonth] = await Promise.all([
      subscribers.count({ filters: bySite }),
      subscribers.count({ filters: { ...bySite, active: true } }),
      subscribers.count({ filters: { ...bySite, active: true, subscribed_at: { $gte: startOfMonth } } }),
    ]);

    return { data: { total, active, thisMonth } };
  },

  /**
   * Désabonnement depuis l'admin : jamais de suppression, l'abonné reste dans la liste (trace RGPD).
   * POST /api/newsletter-subscribers/:id/unsubscribe (commune vérifiée par site-isolation)
   */
  async unsubscribe(ctx) {
    const subscriber = await strapi.documents(UID).findOne({ documentId: ctx.params.id });
    if (!subscriber) return ctx.notFound();
    if (!subscriber.active) return ctx.badRequest('Cet abonné est déjà désabonné');
    const updated = await strapi.documents(UID).update({
      documentId: subscriber.documentId,
      data: { active: false, unsubscribed_at: new Date().toISOString(), unsubscribe_token: crypto.randomUUID() },
    });
    ctx.body = { data: await this.sanitizeOutput(updated, ctx) };
  },

  /** Export CSV des abonnés de la commune (séparateur « ; », BOM : ouverture directe dans Excel) */
  async export(ctx) {
    const site = await getEffectiveSite(ctx);
    if (!site) return ctx.forbidden('Utilisateur sans site assigné');
    const rows = await strapi.documents(UID).findMany({
      filters: { site: { documentId: { $eq: site.documentId } } } as any,
      sort: { subscribed_at: 'desc' },
      fields: ['email', 'first_name', 'last_name', 'subscribed_at', 'active', 'unsubscribed_at'],
      limit: -1 as any,
    });
    const header = ['E-mail', 'Prénom', 'Nom', 'Inscrit le', 'État', 'Désabonné le'];
    const lines = rows.map((row: any) =>
      [row.email, row.first_name, row.last_name, parisDate(row.subscribed_at), row.active ? 'Actif' : 'Désabonné', parisDate(row.unsubscribed_at)].map(csvCell).join(';'),
    );
    ctx.set('Content-Type', 'text/csv; charset=utf-8');
    ctx.set('Content-Disposition', `attachment; filename="abonnes-newsletter-${new Date().toISOString().slice(0, 10)}.csv"`);
    ctx.set('Cache-Control', 'no-store');
    ctx.body = '\uFEFF' + [header.map(csvCell).join(';'), ...lines].join('\r\n') + '\r\n';
  },
}));
