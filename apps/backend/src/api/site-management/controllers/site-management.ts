/**
 * Site management controller — super admin only.
 * CRUD for managing all municipality sites across the platform.
 */

import { createCommune, emailTaken } from '../../../services/commune-creation';
import { publisher as getPublisher, toPublisherSite } from '../../../utils/publisher';
import { sendInvitationEmail } from '../../user-management/controllers/user-management';
import { DEFAULT_THEME } from '@communeo/core';
import { log } from '../../../utils/logger';
import { recordActivity } from '../../../services/activity-log';

async function requireSuperAdmin(ctx) {
  const user = ctx.state.user;
  if (!user) {
    ctx.throw(401, 'Not authenticated');
  }

  const fullUser = await strapi.query('plugin::users-permissions.user').findOne({
    where: { id: user.id },
    populate: ['site'],
  });

  if (fullUser.municipality_role !== 'super_admin') {
    ctx.throw(403, 'Super admin access required');
  }

  return fullUser;
}


const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Ligne de suivi d'une commune (liste et fiche) */
async function summarize(site: any) {
  const documentId = site.documentId;
  const [users, [lastDeployment], pendingCount, [lastPage], [lastArticle]] = await Promise.all([
    strapi.query('plugin::users-permissions.user').findMany({ where: { site: { documentId } }, select: ['blocked', 'active', 'last_login_at'] }),
    strapi.documents('api::deployment.deployment').findMany({ filters: { site: { documentId } } as any, sort: { triggered_at: 'desc' } as any, limit: 1 }),
    strapi.query('api::pending-change.pending-change').count({ where: { site: { documentId } } }),
    strapi.query('api::page.page').findMany({ where: { site: { documentId } }, orderBy: { updatedAt: 'desc' }, limit: 1, select: ['updatedAt'] }),
    strapi.query('api::article.article').findMany({ where: { site: { documentId } }, orderBy: { updatedAt: 'desc' }, limit: 1, select: ['updatedAt'] }),
  ]);
  const deployment: any = lastDeployment ?? null;
  const publication = !deployment
    ? 'new'
    : deployment.status === 'building'
      ? 'running'
      : deployment.status === 'error'
        ? 'failed'
        : pendingCount > 0
          ? 'pending'
          : 'ok';
  // Dernière activité : modification, mise en ligne ou connexion d'un utilisateur de la commune
  const lastLogin = users.map((user: any) => user.last_login_at).filter(Boolean);
  const dates = [site.updatedAt, deployment?.triggered_at, lastPage?.updatedAt, lastArticle?.updatedAt, ...lastLogin].filter(Boolean).map((date) => new Date(date).getTime());
  return {
    documentId,
    name: site.name,
    slug: site.slug,
    theme: site.theme ?? null,
    liveUrl: site.live_url ?? null,
    customDomain: site.custom_domain ?? null,
    population: site.infos_pratiques?.population ?? null,
    suspended: !!site.suspended,
    onboarding: site.onboarding ?? null,
    createdAt: site.createdAt,
    lastActivity: dates.length ? new Date(Math.max(...dates)).toISOString() : site.createdAt,
    publication: { state: publication, at: deployment?.completed_at ?? deployment?.triggered_at ?? null, pendingCount },
    users: {
      active: users.filter((user: any) => !user.blocked && user.active !== false).length,
      invited: users.filter((user: any) => user.blocked && user.active !== false).length,
    },
  };
}

export default {
  /**
   * GET /api/site-management/stats — chiffres de la plateforme : communes (dont créées ce mois-ci),
   * utilisateurs actifs, mises en ligne des 30 derniers jours (réussite, durée médiane), thèmes.
   */
  async stats(ctx) {
    await requireSuperAdmin(ctx);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const since = new Date(now.getTime() - 30 * 86_400_000);

    const [sites, activeUsers, deployments] = await Promise.all([
      strapi.query('api::site.site').findMany({ select: ['theme', 'createdAt'] }),
      strapi.query('plugin::users-permissions.user').count({
        where: { blocked: false, active: { $ne: false }, municipality_role: { $ne: 'super_admin' } },
      }),
      strapi.query('api::deployment.deployment').findMany({
        where: { triggered_at: { $gte: since.toISOString() }, status: { $in: ['ready', 'error'] } },
        select: ['status', 'build_time'],
      }),
    ]);

    const themes: Record<string, number> = {};
    for (const site of sites) {
      const theme = site.theme ?? DEFAULT_THEME;
      themes[theme] = (themes[theme] ?? 0) + 1;
    }
    const succeeded = deployments.filter((deployment) => deployment.status === 'ready');
    const durations = succeeded
      .map((deployment) => deployment.build_time)
      .filter((value): value is number => typeof value === 'number' && value > 0)
      .sort((a, b) => a - b);
    const middle = Math.floor(durations.length / 2);
    const median = !durations.length
      ? null
      : durations.length % 2
        ? durations[middle]
        : Math.round((durations[middle - 1] + durations[middle]) / 2);

    ctx.body = {
      data: {
        communes: {
          total: sites.length,
          thisMonth: sites.filter((site) => new Date(site.createdAt) >= monthStart).length,
        },
        activeUsers,
        deployments: {
          total: deployments.length,
          succeeded: succeeded.length,
          medianSeconds: median,
        },
        themes: Object.entries(themes)
          .map(([theme, count]) => ({ theme, count }))
          .sort((a, b) => b.count - a.count),
      },
    };
  },

  /**
   * GET /api/site-management — communes de la plateforme, avec de quoi les suivre : thème, état de
   * mise en ligne, utilisateurs (actifs et invités), dernière activité.
   */
  async find(ctx) {
    await requireSuperAdmin(ctx);
    const sites = await strapi.documents('api::site.site').findMany({ populate: ['infos_pratiques'] as any });
    ctx.body = { data: await Promise.all(sites.map((site) => summarize(site))) };
  },

  /**
   * GET /api/site-management/slug-available?slug= — adresse libre et valide pour une nouvelle commune
   */
  async slugAvailable(ctx) {
    await requireSuperAdmin(ctx);
    const slug = String(ctx.query?.slug ?? '').trim();
    if (!SLUG.test(slug)) {
      ctx.body = { available: false, reason: 'Lettres minuscules, chiffres et tirets seulement' };
      return;
    }
    const taken = await strapi.query('api::site.site').count({ where: { slug } });
    ctx.body = taken ? { available: false, reason: 'Adresse déjà utilisée' } : { available: true };
  },

  /**
   * GET /api/site-management/:documentId — fiche d'une commune : suivi, utilisateurs, contenus, mises en ligne
   */
  async findOne(ctx) {
    await requireSuperAdmin(ctx);
    const { documentId } = ctx.params;
    const site = await strapi.documents('api::site.site').findFirst({
      filters: { documentId: { $eq: documentId } } as any,
      populate: ['infos_pratiques'] as any,
    });
    if (!site) ctx.throw(404, 'Commune introuvable');

    const users = await strapi.query('plugin::users-permissions.user').findMany({ where: { site: { documentId } } });
    // Draft & Publish : une ligne brouillon par document
    const [pages, articles, documents, succeeded, failed] = await Promise.all([
      strapi.query('api::page.page').count({ where: { site: { documentId }, publishedAt: null } }),
      strapi.query('api::article.article').count({ where: { site: { documentId }, publishedAt: null } }),
      strapi.query('api::official-document.official-document').count({ where: { site: { documentId }, publishedAt: null } }),
      strapi.query('api::deployment.deployment').count({ where: { site: { documentId }, status: 'ready' } }),
      strapi.query('api::deployment.deployment').count({ where: { site: { documentId }, status: 'error' } }),
    ]);

    ctx.body = {
      data: {
        ...(await summarize(site)),
        domainStatus: (site as any).domain_status ?? null,
        sslEnabled: (site as any).ssl_enabled !== false,
        users: users.map((user: any) => ({
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          municipality_role: user.municipality_role,
          blocked: !!user.blocked,
          active: user.active,
          createdAt: user.createdAt,
        })),
        counts: { pages, articles, documents },
        deployments: { succeeded, failed },
      },
    };
  },

  /**
   * POST /api/site-management — nouvelle commune : le premier administrateur reçoit l'invitation
   * { name, slug, admin_email, admin_first_name, admin_last_name }
   */
  async create(ctx) {
    await requireSuperAdmin(ctx);
    const data = ctx.request.body?.data || ctx.request.body || {};
    const name = String(data.name ?? '').trim();
    const slug = String(data.slug ?? '').trim();
    const email = String(data.admin_email ?? '').trim().toLowerCase();
    const firstName = String(data.admin_first_name ?? '').trim();
    const lastName = String(data.admin_last_name ?? '').trim();

    if (!name || !SLUG.test(slug) || !EMAIL.test(email) || !firstName || !lastName) {
      ctx.throw(400, "Nom, adresse du site, prénom, nom et e-mail de l'administrateur sont obligatoires");
    }
    if (await strapi.query('api::site.site').count({ where: { slug } })) ctx.throw(400, 'Adresse déjà utilisée par une autre commune');
    if (await emailTaken(email)) ctx.throw(400, 'Un compte existe déjà avec cet e-mail');

    // La commune, son site chez l'hébergeur et son premier administrateur, invité
    const { site, invitationToken: token } = await createCommune({ name, slug, contactMail: email, admin: { email, firstName, lastName } });
    try {
      await sendInvitationEmail(email, firstName, token, name);
    } catch (error) {
      log.error('Failed to send invitation email for new site:', error);
    }

    await recordActivity({
      action: 'commune_create',
      siteDocumentId: site.documentId,
      target: { type: 'site', id: site.documentId, label: name },
      details: { admin: email },
    });

    ctx.body = { data: await summarize(await strapi.documents('api::site.site').findOne({ documentId: site.documentId, populate: ['infos_pratiques'] as any })) };
  },

  /**
   * PUT /api/site-management/:documentId — { name?, suspended? }
   * Suspendre : les utilisateurs de la commune ne peuvent plus se connecter (session coupée) et
   * rien n'est plus mis en ligne ; le site public reste en ligne tel quel.
   */
  async update(ctx) {
    await requireSuperAdmin(ctx);
    const { documentId } = ctx.params;
    const data = ctx.request.body?.data || ctx.request.body || {};
    const site = await strapi.documents('api::site.site').findFirst({ filters: { documentId: { $eq: documentId } } as any });
    if (!site) ctx.throw(404, 'Commune introuvable');

    const update: Record<string, unknown> = {};
    if (typeof data.name === 'string' && data.name.trim()) update.name = data.name.trim();
    if (typeof data.suspended === 'boolean') update.suspended = data.suspended;
    const updated = await strapi.documents('api::site.site').update({ documentId, data: update as any, populate: ['infos_pratiques'] as any });
    if (typeof data.suspended === 'boolean' && data.suspended !== !!site.suspended)
      await recordActivity({
        action: data.suspended ? 'commune_suspend' : 'commune_unsuspend',
        siteDocumentId: documentId,
        target: { type: 'site', id: documentId, label: updated.name },
      });
    ctx.body = { data: await summarize(updated) };
  },

  /**
   * DELETE /api/site-management/:documentId — delete site and its host site
   */
  async delete(ctx) {
    await requireSuperAdmin(ctx);
    const { documentId } = ctx.params;

    const sites = await strapi.documents('api::site.site').findMany({
      filters: { documentId: { $eq: documentId } } as any,
    });

    if (!sites || sites.length === 0) {
      ctx.throw(404, 'Site not found');
    }

    const site = sites[0] as any;

    // Delete the host site if exists
    if (site.netlify_site_id) {
      try {
        await getPublisher().deleteSite(toPublisherSite(site));
      } catch (error) {
        log.error('Failed to delete host site:', error);
        // Continue with deletion even if the host fails
      }
    }

    // Delete all users belonging to this site
    const siteUsers = await strapi.query('plugin::users-permissions.user').findMany({
      where: { site: { documentId } },
    });

    for (const user of siteUsers) {
      await strapi.query('plugin::users-permissions.user').delete({ where: { id: user.id } });
    }

    // Delete the site
    await strapi.documents('api::site.site').delete({ documentId: site.documentId });

    ctx.body = { data: { documentId } };
  },
};
