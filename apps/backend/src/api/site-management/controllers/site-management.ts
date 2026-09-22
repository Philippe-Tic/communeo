/**
 * Site management controller — super admin only.
 * CRUD for managing all municipality sites across the platform.
 */

import crypto from 'crypto';
import netlifyService from '../../../services/netlify';
import { createInvitationToken, escapeHtml } from '../../../utils/security';
import { DEFAULT_THEME } from '@communeo/core';

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

export default {
  /**
   * GET /api/site-management/stats — global stats
   */
  async stats(ctx) {
    await requireSuperAdmin(ctx);

    const sitesCount = await strapi.query('api::site.site').count();
    const usersCount = await strapi.query('plugin::users-permissions.user').count();

    // Recent deployments (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentDeployments = await strapi.query('api::deployment.deployment').count({
      where: { createdAt: { $gte: thirtyDaysAgo.toISOString() } },
    });

    ctx.body = {
      data: {
        sites: sitesCount,
        users: usersCount,
        recentDeployments,
      },
    };
  },

  /**
   * GET /api/site-management — list all sites with stats
   */
  async find(ctx) {
    await requireSuperAdmin(ctx);

    const sites = await strapi.entityService.findMany('api::site.site', {
      populate: ['logo'],
    });

    // Enrich with stats
    const enriched = await Promise.all(
      sites.map(async (site) => {
        const [pagesCount, articlesCount, usersCount] = await Promise.all([
          // Draft & Publish : une ligne brouillon par document (la version publiée est une ligne de plus)
          strapi.query('api::page.page').count({
            where: { site: { documentId: site.documentId }, publishedAt: null },
          }),
          // Draft & Publish : une ligne brouillon par document (la version publiée est une ligne de plus)
          strapi.query('api::article.article').count({
            where: { site: { documentId: site.documentId }, publishedAt: null },
          }),
          strapi.query('plugin::users-permissions.user').count({
            where: { site: { documentId: site.documentId } },
          }),
        ]);

        // Last deployment
        const deployments = await strapi.entityService.findMany('api::deployment.deployment', {
          filters: { site: { documentId: site.documentId } } as any,
          sort: { createdAt: 'desc' } as any,
          limit: 1,
        });

        return {
          ...site,
          _stats: {
            pages: pagesCount,
            articles: articlesCount,
            users: usersCount,
            lastDeployment: deployments?.[0] || null,
          },
        };
      })
    );

    ctx.body = { data: enriched };
  },

  /**
   * GET /api/site-management/:documentId — site detail with users
   */
  async findOne(ctx) {
    await requireSuperAdmin(ctx);
    const { documentId } = ctx.params;

    const sites = await strapi.entityService.findMany('api::site.site', {
      filters: { documentId: { $eq: documentId } } as any,
      populate: ['logo'],
    });

    if (!sites || sites.length === 0) {
      ctx.throw(404, 'Site not found');
    }

    const site = sites[0];

    // Get users for this site
    const users = await strapi.query('plugin::users-permissions.user').findMany({
      where: { site: { documentId } },
      populate: ['site'],
    });

    const sanitizedUsers = users.map(({ password, resetPasswordToken, confirmationToken, ...rest }) => rest);

    // Get stats (Draft & Publish : on compte les lignes brouillon, une par document)
    const [pagesCount, articlesCount, eventsCount] = await Promise.all([
      strapi.query('api::page.page').count({
        where: { site: { documentId }, publishedAt: null },
      }),
      strapi.query('api::article.article').count({
        where: { site: { documentId }, publishedAt: null },
      }),
      strapi.query('api::evenement.evenement').count({
        where: { site: { documentId }, publishedAt: null },
      }),
    ]);

    // Last deployments
    const deployments = await strapi.entityService.findMany('api::deployment.deployment', {
      filters: { site: { documentId } } as any,
      sort: { createdAt: 'desc' } as any,
      limit: 5,
    });

    ctx.body = {
      data: {
        ...site,
        _users: sanitizedUsers,
        _stats: {
          pages: pagesCount,
          articles: articlesCount,
          events: eventsCount,
        },
        _deployments: deployments || [],
      },
    };
  },

  /**
   * POST /api/site-management — create a new municipality
   */
  async create(ctx) {
    await requireSuperAdmin(ctx);
    const data = ctx.request.body?.data || ctx.request.body;

    if (!data.name || !data.slug) {
      ctx.throw(400, 'Missing required fields: name, slug');
    }

    // Check slug uniqueness
    const existing = await strapi.entityService.findMany('api::site.site', {
      filters: { slug: { $eq: data.slug } },
    });

    if (existing && existing.length > 0) {
      ctx.throw(400, 'Un site avec ce slug existe déjà');
    }

    // 1. Create the site in Strapi
    const site = await strapi.entityService.create('api::site.site', {
      data: {
        name: data.name,
        slug: data.slug,
        theme: DEFAULT_THEME,
        contact_mail: data.admin_email || '',
        contact_phone: data.contact_phone || '',
        address: data.address || '',
      },
    });

    // 2. Create Netlify site
    let netlifyId: string | null = null;
    try {
      const netlifySite = await netlifyService.findOrCreateSite(data.name, data.slug);
      netlifyId = netlifySite.id;

      // Save netlify_site_id on the site
      await strapi.entityService.update('api::site.site', site.id, {
        data: { netlify_site_id: netlifyId },
      });
    } catch (error) {
      console.error('Failed to create Netlify site:', error);
      // Don't fail the whole operation — Netlify can be configured later
    }

    // 3. Create initial admin user if email provided
    if (data.admin_email) {
      try {
        const userService = strapi.plugin('users-permissions').service('user');
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const hashedPassword = (await userService.ensureHashedPasswords({ password: randomPassword })).password;
        const { token: invitationToken, stored: storedInvitationToken } = createInvitationToken();

        const authenticatedRole = await strapi.query('plugin::users-permissions.role').findOne({
          where: { type: 'authenticated' },
        });

        await strapi.query('plugin::users-permissions.user').create({
          data: {
            username: data.admin_email,
            email: data.admin_email,
            password: hashedPassword,
            first_name: data.admin_first_name || 'Admin',
            last_name: data.admin_last_name || data.name,
            municipality_role: 'admin',
            active: true,
            confirmed: true,
            blocked: true, // Blocked until invitation accepted
            provider: 'local',
            role: authenticatedRole.id,
            site: site.id,
            resetPasswordToken: storedInvitationToken,
          },
        });

        // Send invitation email
        try {
          const adminUrl = process.env.ADMIN_URL || 'http://localhost:5173';
          const invitationLink = `${adminUrl}/accept-invitation?token=${invitationToken}`;

          await strapi.plugin('email').service('email').send({
            to: data.admin_email,
            subject: `Invitation à administrer ${data.name} — Communeo`,
            html: `
              <h2>Bienvenue sur Communeo</h2>
              <p>Votre espace d'administration pour <strong>${escapeHtml(data.name)}</strong> a été créé.</p>
              <p>Cliquez sur le lien ci-dessous pour définir votre mot de passe et accéder à votre espace :</p>
              <p><a href="${invitationLink}" style="display:inline-block;padding:12px 24px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Activer mon compte</a></p>
            `,
            text: `Votre espace d'administration pour ${data.name} a été créé. Activez votre compte : ${invitationLink}`,
          });
        } catch (emailError) {
          console.error('Failed to send invitation email for new site:', emailError);
        }
      } catch (error) {
        console.error('Failed to create initial admin user:', error);
      }
    }

    // Re-fetch the complete site
    const completeSite = await strapi.entityService.findOne('api::site.site', site.id, {
      populate: ['logo'],
    });

    ctx.body = { data: completeSite };
  },

  /**
   * PUT /api/site-management/:documentId — update site
   */
  async update(ctx) {
    await requireSuperAdmin(ctx);
    const { documentId } = ctx.params;
    const data = ctx.request.body?.data || ctx.request.body;

    const sites = await strapi.entityService.findMany('api::site.site', {
      filters: { documentId: { $eq: documentId } } as any,
    });

    if (!sites || sites.length === 0) {
      ctx.throw(404, 'Site not found');
    }

    const site = sites[0];

    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.contact_mail !== undefined) updateData.contact_mail = data.contact_mail;
    if (data.contact_phone !== undefined) updateData.contact_phone = data.contact_phone;
    if (data.address !== undefined) updateData.address = data.address;

    const updated = await strapi.entityService.update('api::site.site', site.id, {
      data: updateData,
      populate: ['logo'],
    });

    ctx.body = { data: updated };
  },

  /**
   * DELETE /api/site-management/:documentId — delete site and Netlify site
   */
  async delete(ctx) {
    await requireSuperAdmin(ctx);
    const { documentId } = ctx.params;

    const sites = await strapi.entityService.findMany('api::site.site', {
      filters: { documentId: { $eq: documentId } } as any,
    });

    if (!sites || sites.length === 0) {
      ctx.throw(404, 'Site not found');
    }

    const site = sites[0] as any;

    // Delete Netlify site if exists
    if (site.netlify_site_id) {
      try {
        await netlifyService.deleteSite(site.netlify_site_id);
      } catch (error) {
        console.error('Failed to delete Netlify site:', error);
        // Continue with deletion even if Netlify fails
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
    await strapi.entityService.delete('api::site.site', site.id);

    ctx.body = { data: { documentId } };
  },
};
