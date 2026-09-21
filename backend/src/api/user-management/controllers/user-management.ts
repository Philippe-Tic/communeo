/**
 * User management controller — allows admin to manage users of their site.
 * Implements invitation flow: new users receive an email to set their password.
 */

import crypto from 'crypto';
import {
  INVITATION_EXPIRY_DAYS,
  MIN_PASSWORD_LENGTH,
  createInvitationToken,
  createRateLimiter,
  escapeHtml,
  resolveInvitationToken,
} from '../../../utils/security';

const ALLOWED_ROLES = ['super_admin', 'admin'];

// Rôles qu'un utilisateur peut attribuer : un admin de commune ne peut jamais créer de super_admin
const ASSIGNABLE_ROLES: Record<string, string[]> = {
  super_admin: ['super_admin', 'admin', 'editor'],
  admin: ['admin', 'editor'],
};

const isRateLimited = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });

function assertAssignableRole(ctx, currentUser, role: unknown) {
  if (role === undefined) return;
  if (typeof role !== 'string' || !(ASSIGNABLE_ROLES[currentUser.municipality_role] || []).includes(role)) {
    ctx.throw(403, 'Rôle non autorisé');
  }
}

async function getAuthenticatedUser(ctx) {
  const user = ctx.state.user;
  if (!user) {
    ctx.throw(401, 'Not authenticated');
  }

  const fullUser = await strapi.query('plugin::users-permissions.user').findOne({
    where: { id: user.id },
    populate: ['site'],
  });

  if (!ALLOWED_ROLES.includes(fullUser.municipality_role)) {
    ctx.throw(403, 'Only admin can manage users');
  }

  // Super admin doesn't need a site
  if (fullUser.municipality_role !== 'super_admin' && !fullUser?.site) {
    ctx.throw(403, 'No site assigned');
  }

  return fullUser;
}

async function sendInvitationEmail(email: string, rawFirstName: string, token: string, rawSiteName: string) {
  const firstName = escapeHtml(rawFirstName);
  const siteName = escapeHtml(rawSiteName);
  const adminUrl = process.env.ADMIN_URL || 'http://localhost:5173';
  const invitationLink = `${adminUrl}/accept-invitation?token=${token}`;

  await strapi.plugin('email').service('email').send({
    to: email,
    subject: `Invitation à rejoindre ${rawSiteName} — Communeo`,
    html: `
      <h2>Bienvenue sur ${siteName}</h2>
      <p>Bonjour ${firstName},</p>
      <p>Vous avez été invité(e) à rejoindre l'espace d'administration du site <strong>${siteName}</strong>.</p>
      <p>Cliquez sur le lien ci-dessous pour définir votre mot de passe et activer votre compte :</p>
      <p><a href="${invitationLink}" style="display:inline-block;padding:12px 24px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Activer mon compte</a></p>
      <p>Ce lien est valable pendant ${INVITATION_EXPIRY_DAYS} jours.</p>
      <p>Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.</p>
    `,
    text: `Bonjour ${rawFirstName}, vous avez été invité(e) à rejoindre ${rawSiteName}. Cliquez sur ce lien pour définir votre mot de passe : ${invitationLink} (valable ${INVITATION_EXPIRY_DAYS} jours).`,
  });
}

async function sendPasswordResetEmail(email: string, rawFirstName: string, token: string, rawSiteName: string) {
  const firstName = escapeHtml(rawFirstName);
  const siteName = escapeHtml(rawSiteName);
  const adminUrl = process.env.ADMIN_URL || 'http://localhost:5173';
  const resetLink = `${adminUrl}/accept-invitation?token=${token}&type=reset`;

  await strapi.plugin('email').service('email').send({
    to: email,
    subject: `Réinitialisation de votre mot de passe — ${rawSiteName}`,
    html: `
      <h2>Réinitialisation de mot de passe</h2>
      <p>Bonjour ${firstName},</p>
      <p>Une demande de réinitialisation de mot de passe a été effectuée pour votre compte sur <strong>${siteName}</strong>.</p>
      <p>Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe :</p>
      <p><a href="${resetLink}" style="display:inline-block;padding:12px 24px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Réinitialiser mon mot de passe</a></p>
      <p>Ce lien est valable pendant ${INVITATION_EXPIRY_DAYS} jours.</p>
      <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.</p>
    `,
    text: `Bonjour ${rawFirstName}, une demande de réinitialisation de mot de passe a été effectuée. Cliquez sur ce lien pour choisir un nouveau mot de passe : ${resetLink} (valable ${INVITATION_EXPIRY_DAYS} jours).`,
  });
}

async function getAuthenticatedUserBasic(ctx) {
  const user = ctx.state.user;
  if (!user) {
    ctx.throw(401, 'Not authenticated');
  }

  const fullUser = await strapi.query('plugin::users-permissions.user').findOne({
    where: { id: user.id },
    populate: ['site'],
  });

  // Super admin doesn't need a site
  if (fullUser.municipality_role !== 'super_admin' && !fullUser?.site) {
    ctx.throw(403, 'No site assigned');
  }

  return fullUser;
}

export default {
  /**
   * Self-service endpoint — update own profile.
   * PUT /api/user-management/me
   */
  async updateMe(ctx) {
    const currentUser = await getAuthenticatedUserBasic(ctx);
    const data = ctx.request.body?.data || ctx.request.body;

    const updateData: Record<string, any> = {};
    if (data.first_name !== undefined) updateData.first_name = data.first_name;
    if (data.last_name !== undefined) updateData.last_name = data.last_name;
    if (data.phone !== undefined) updateData.phone = data.phone;

    const updatedUser = await strapi.query('plugin::users-permissions.user').update({
      where: { id: currentUser.id },
      data: updateData,
      populate: ['site'],
    });

    const { password, resetPasswordToken, confirmationToken, ...sanitized } = updatedUser;
    ctx.body = { data: sanitized };
  },

  /**
   * Self-service endpoint — request password reset for self.
   * POST /api/user-management/me/reset-password
   */
  async requestPasswordReset(ctx) {
    const currentUser = await getAuthenticatedUserBasic(ctx);

    if (currentUser.blocked) {
      ctx.throw(400, "Votre compte n'est pas encore activé.");
    }

    const { token: newToken, stored } = createInvitationToken();

    await strapi.query('plugin::users-permissions.user').update({
      where: { id: currentUser.id },
      data: { resetPasswordToken: stored },
    });

    try {
      await sendPasswordResetEmail(currentUser.email, currentUser.first_name, newToken, currentUser.site?.name || 'Communeo');
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      ctx.throw(500, "Erreur lors de l'envoi de l'email");
    }

    ctx.body = { ok: true };
  },

  async find(ctx) {
    const currentUser = await getAuthenticatedUser(ctx);

    // Super admin can see all users, optionally filtered by site
    const isSuperAdmin = currentUser.municipality_role === 'super_admin';
    const siteFilter = ctx.query?.site; // optional site documentId filter

    let where: any = {};
    if (isSuperAdmin && siteFilter) {
      where = { site: { documentId: siteFilter } };
    } else if (!isSuperAdmin) {
      where = { site: { documentId: currentUser.site.documentId } };
    }

    const users = await strapi.query('plugin::users-permissions.user').findMany({
      where,
      populate: ['site'],
    });

    const sanitized = users.map(({ password, resetPasswordToken, confirmationToken, ...rest }) => rest);
    ctx.body = { data: sanitized };
  },

  async findOne(ctx) {
    const currentUser = await getAuthenticatedUser(ctx);
    const { id } = ctx.params;

    const user = await strapi.query('plugin::users-permissions.user').findOne({
      where: { id },
      populate: ['site'],
    });

    if (!user) {
      ctx.throw(404, 'User not found');
    }

    // Super admin can see any user; regular admin only their site's users
    if (currentUser.municipality_role !== 'super_admin' && user.site?.documentId !== currentUser.site.documentId) {
      ctx.throw(403, 'User does not belong to your site');
    }

    const { password, resetPasswordToken, confirmationToken, ...sanitized } = user;
    ctx.body = { data: sanitized };
  },

  async create(ctx) {
    const currentUser = await getAuthenticatedUser(ctx);
    const data = ctx.request.body?.data || ctx.request.body;

    if (!data.username || !data.email || !data.first_name || !data.last_name) {
      ctx.throw(400, 'Missing required fields: username, email, first_name, last_name');
    }

    assertAssignableRole(ctx, currentUser, data.municipality_role);

    // Check email uniqueness
    const existingUser = await strapi.query('plugin::users-permissions.user').findOne({
      where: { email: data.email },
    });
    if (existingUser) {
      ctx.throw(400, 'Un utilisateur avec cet email existe déjà');
    }

    // Check username uniqueness
    const existingUsername = await strapi.query('plugin::users-permissions.user').findOne({
      where: { username: data.username },
    });
    if (existingUsername) {
      ctx.throw(400, "Un utilisateur avec ce nom d'utilisateur existe déjà");
    }

    // Generate random unusable password and invitation token
    const userService = strapi.plugin('users-permissions').service('user');
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const hashedPassword = (await userService.ensureHashedPasswords({ password: randomPassword })).password;
    const { token: invitationToken, stored: storedInvitationToken } = createInvitationToken();

    // Get authenticated role
    const authenticatedRole = await strapi.query('plugin::users-permissions.role').findOne({
      where: { type: 'authenticated' },
    });

    // Determine which site to assign the user to
    const isSuperAdmin = currentUser.municipality_role === 'super_admin';
    let targetSiteId: number | null = null;
    let targetSiteName = 'Communeo';

    if (isSuperAdmin && data.site) {
      // Super admin specifies which site to assign the user to
      const targetSites = await strapi.entityService.findMany('api::site.site', {
        filters: { documentId: { $eq: data.site } } as any,
      });
      if (!targetSites || targetSites.length === 0) {
        ctx.throw(400, 'Site not found');
      }
      targetSiteId = targetSites[0].id as number;
      targetSiteName = targetSites[0].name;
    } else if (currentUser.site) {
      targetSiteId = currentUser.site.id;
      targetSiteName = currentUser.site.name;
    } else {
      ctx.throw(400, 'No site specified for user creation');
    }

    let newUser;
    try {
      newUser = await strapi.query('plugin::users-permissions.user').create({
        data: {
          username: data.username,
          email: data.email,
          password: hashedPassword,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone || null,
          municipality_role: data.municipality_role || 'editor',
          active: data.active !== undefined ? data.active : true,
          confirmed: true,
          blocked: true, // Blocked until invitation is accepted
          provider: 'local',
          role: authenticatedRole.id,
          site: targetSiteId,
          resetPasswordToken: storedInvitationToken,
        },
        populate: ['site'],
      });
    } catch (error) {
      console.error('Failed to create user:', error);
      ctx.throw(400, error.message || 'Failed to create user');
    }

    // Send invitation email (don't fail creation if email fails)
    try {
      await sendInvitationEmail(data.email, data.first_name, invitationToken, targetSiteName);
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
    }

    const { password, resetPasswordToken, confirmationToken, ...sanitized } = newUser;
    ctx.body = { data: sanitized };
  },

  async update(ctx) {
    const currentUser = await getAuthenticatedUser(ctx);
    const { id } = ctx.params;
    const data = ctx.request.body?.data || ctx.request.body;

    const existingUser = await strapi.query('plugin::users-permissions.user').findOne({
      where: { id },
      populate: ['site'],
    });

    if (!existingUser) {
      ctx.throw(404, 'User not found');
    }

    if (currentUser.municipality_role !== 'super_admin' && existingUser.site?.documentId !== currentUser.site.documentId) {
      ctx.throw(403, 'User does not belong to your site');
    }

    assertAssignableRole(ctx, currentUser, data.municipality_role);

    const updateData: Record<string, any> = {};
    if (data.username !== undefined) updateData.username = data.username;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.first_name !== undefined) updateData.first_name = data.first_name;
    if (data.last_name !== undefined) updateData.last_name = data.last_name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.municipality_role !== undefined) updateData.municipality_role = data.municipality_role;
    if (data.active !== undefined) updateData.active = data.active;

    // Prevent changing site
    delete updateData.site;

    const updatedUser = await strapi.query('plugin::users-permissions.user').update({
      where: { id },
      data: updateData,
      populate: ['site'],
    });

    const { password, resetPasswordToken, confirmationToken, ...sanitized } = updatedUser;
    ctx.body = { data: sanitized };
  },

  async delete(ctx) {
    const currentUser = await getAuthenticatedUser(ctx);
    const { id } = ctx.params;

    const userToDelete = await strapi.query('plugin::users-permissions.user').findOne({
      where: { id },
      populate: ['site'],
    });

    if (!userToDelete) {
      ctx.throw(404, 'User not found');
    }

    // Super admin can delete any user; regular admin only their site's users
    if (currentUser.municipality_role !== 'super_admin' && userToDelete.site?.documentId !== currentUser.site.documentId) {
      ctx.throw(403, 'User does not belong to your site');
    }

    if (userToDelete.id === currentUser.id) {
      ctx.throw(400, 'Cannot delete yourself');
    }

    // Prevent deleting the last admin of a site
    if (userToDelete.municipality_role === 'admin' && userToDelete.site) {
      const admins = await strapi.query('plugin::users-permissions.user').findMany({
        where: {
          site: { documentId: userToDelete.site.documentId },
          municipality_role: 'admin',
        },
      });
      if (admins.length <= 1) {
        ctx.throw(400, 'Cannot delete the last admin of the site');
      }
    }

    await strapi.query('plugin::users-permissions.user').delete({ where: { id } });
    ctx.body = { data: { id: Number(id) } };
  },

  /**
   * Public endpoint — request a password reset email.
   * POST /api/user-management/forgot-password
   */
  async forgotPassword(ctx) {
    const { email } = ctx.request.body || {};

    if (isRateLimited(`forgot:${ctx.request.ip}`) || (typeof email === 'string' && isRateLimited(`forgot:${email.toLowerCase()}`))) {
      return ctx.tooManyRequests('Trop de demandes, réessayez plus tard');
    }

    if (!email || typeof email !== 'string') {
      // Always return ok to avoid revealing info
      ctx.body = { ok: true };
      return;
    }

    const user = await strapi.query('plugin::users-permissions.user').findOne({
      where: { email },
      populate: ['site'],
    });

    // Always return ok regardless of whether user exists
    if (!user || user.blocked) {
      ctx.body = { ok: true };
      return;
    }

    const { token: newToken, stored } = createInvitationToken();

    await strapi.query('plugin::users-permissions.user').update({
      where: { id: user.id },
      data: { resetPasswordToken: stored },
    });

    const siteName = user.site?.name || 'Communeo';

    try {
      await sendPasswordResetEmail(user.email, user.first_name, newToken, siteName);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
    }

    ctx.body = { ok: true };
  },

  /**
   * Public endpoint — accept an invitation and set password.
   * POST /api/user-management/accept-invitation
   */
  async acceptInvitation(ctx) {
    const { token, password, passwordConfirmation } = ctx.request.body || {};

    if (isRateLimited(`accept:${ctx.request.ip}`)) {
      return ctx.tooManyRequests('Trop de tentatives, réessayez plus tard');
    }

    if (!token || !password || !passwordConfirmation) {
      ctx.throw(400, 'Missing required fields: token, password, passwordConfirmation');
    }

    if (password !== passwordConfirmation) {
      ctx.throw(400, 'Les mots de passe ne correspondent pas');
    }

    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      ctx.throw(400, `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`);
    }

    // Le jeton porte sa date d'expiration ; seule son empreinte est stockée
    const storedToken = resolveInvitationToken(token);
    if (!storedToken) {
      ctx.throw(400, 'Ce lien est invalide ou a expiré. Demandez à votre administrateur de renvoyer le lien.');
    }

    const user = await strapi.query('plugin::users-permissions.user').findOne({
      where: { resetPasswordToken: storedToken },
    });

    if (!user) {
      ctx.throw(400, 'Ce lien est invalide ou a expiré. Demandez à votre administrateur de renvoyer le lien.');
    }

    // Hash the new password and activate the user
    const userService = strapi.plugin('users-permissions').service('user');
    const hashedPassword = (await userService.ensureHashedPasswords({ password })).password;

    await strapi.query('plugin::users-permissions.user').update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        blocked: false,
        resetPasswordToken: null,
      },
    });

    ctx.body = { ok: true };
  },

  /**
   * Authenticated endpoint — resend invitation email.
   * POST /api/user-management/:id/resend-invitation
   */
  async resendInvitation(ctx) {
    const currentUser = await getAuthenticatedUser(ctx);
    const { id } = ctx.params;

    const user = await strapi.query('plugin::users-permissions.user').findOne({
      where: { id },
      populate: ['site'],
    });

    if (!user) {
      ctx.throw(404, 'User not found');
    }

    if (currentUser.municipality_role !== 'super_admin' && user.site?.documentId !== currentUser.site.documentId) {
      ctx.throw(403, 'User does not belong to your site');
    }

    if (!user.blocked) {
      ctx.throw(400, "Cet utilisateur a déjà activé son compte");
    }

    // Generate new token
    const { token: newToken, stored } = createInvitationToken();

    await strapi.query('plugin::users-permissions.user').update({
      where: { id: user.id },
      data: { resetPasswordToken: stored },
    });

    try {
      await sendInvitationEmail(user.email, user.first_name, newToken, user.site?.name || 'Communeo');
    } catch (emailError) {
      console.error('Failed to resend invitation email:', emailError);
      ctx.throw(500, "Erreur lors de l'envoi de l'email");
    }

    ctx.body = { ok: true };
  },

  /**
   * Authenticated endpoint — send password reset email to an active user.
   * POST /api/user-management/:id/reset-password
   */
  async resetPassword(ctx) {
    const currentUser = await getAuthenticatedUser(ctx);
    const { id } = ctx.params;

    const user = await strapi.query('plugin::users-permissions.user').findOne({
      where: { id },
      populate: ['site'],
    });

    if (!user) {
      ctx.throw(404, 'User not found');
    }

    if (currentUser.municipality_role !== 'super_admin' && user.site?.documentId !== currentUser.site.documentId) {
      ctx.throw(403, 'User does not belong to your site');
    }

    if (user.blocked) {
      ctx.throw(400, "Cet utilisateur n'a pas encore activé son compte. Utilisez « Renvoyer l'invitation ».");
    }

    // Generate new token
    const { token: newToken, stored } = createInvitationToken();

    await strapi.query('plugin::users-permissions.user').update({
      where: { id: user.id },
      data: { resetPasswordToken: stored },
    });

    try {
      await sendPasswordResetEmail(user.email, user.first_name, newToken, user.site?.name || 'Communeo');
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      ctx.throw(500, "Erreur lors de l'envoi de l'email");
    }

    ctx.body = { ok: true };
  },
};
