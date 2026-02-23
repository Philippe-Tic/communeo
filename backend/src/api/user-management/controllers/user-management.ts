/**
 * User management controller — allows admin to manage users of their site.
 * Implements invitation flow: new users receive an email to set their password.
 */

import crypto from 'crypto';

const ALLOWED_ROLES = ['admin'];
const INVITATION_EXPIRY_DAYS = 7;

async function getAuthenticatedUser(ctx) {
  const user = ctx.state.user;
  if (!user) {
    ctx.throw(401, 'Not authenticated');
  }

  const fullUser = await strapi.query('plugin::users-permissions.user').findOne({
    where: { id: user.id },
    populate: ['site'],
  });

  if (!fullUser?.site) {
    ctx.throw(403, 'No site assigned');
  }

  if (!ALLOWED_ROLES.includes(fullUser.municipality_role)) {
    ctx.throw(403, 'Only admin can manage users');
  }

  return fullUser;
}

function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

async function sendInvitationEmail(email: string, firstName: string, token: string, siteName: string) {
  const adminUrl = process.env.ADMIN_URL || 'http://localhost:5173';
  const invitationLink = `${adminUrl}/accept-invitation?token=${token}`;

  await strapi.plugin('email').service('email').send({
    to: email,
    subject: `Invitation à rejoindre ${siteName} — CMS Mairies`,
    html: `
      <h2>Bienvenue sur ${siteName}</h2>
      <p>Bonjour ${firstName},</p>
      <p>Vous avez été invité(e) à rejoindre l'espace d'administration du site <strong>${siteName}</strong>.</p>
      <p>Cliquez sur le lien ci-dessous pour définir votre mot de passe et activer votre compte :</p>
      <p><a href="${invitationLink}" style="display:inline-block;padding:12px 24px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Activer mon compte</a></p>
      <p>Ce lien est valable pendant ${INVITATION_EXPIRY_DAYS} jours.</p>
      <p>Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.</p>
    `,
    text: `Bonjour ${firstName}, vous avez été invité(e) à rejoindre ${siteName}. Cliquez sur ce lien pour définir votre mot de passe : ${invitationLink} (valable ${INVITATION_EXPIRY_DAYS} jours).`,
  });
}

async function sendPasswordResetEmail(email: string, firstName: string, token: string, siteName: string) {
  const adminUrl = process.env.ADMIN_URL || 'http://localhost:5173';
  const resetLink = `${adminUrl}/accept-invitation?token=${token}&type=reset`;

  await strapi.plugin('email').service('email').send({
    to: email,
    subject: `Réinitialisation de votre mot de passe — ${siteName}`,
    html: `
      <h2>Réinitialisation de mot de passe</h2>
      <p>Bonjour ${firstName},</p>
      <p>Une demande de réinitialisation de mot de passe a été effectuée pour votre compte sur <strong>${siteName}</strong>.</p>
      <p>Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe :</p>
      <p><a href="${resetLink}" style="display:inline-block;padding:12px 24px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Réinitialiser mon mot de passe</a></p>
      <p>Ce lien est valable pendant ${INVITATION_EXPIRY_DAYS} jours.</p>
      <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.</p>
    `,
    text: `Bonjour ${firstName}, une demande de réinitialisation de mot de passe a été effectuée. Cliquez sur ce lien pour choisir un nouveau mot de passe : ${resetLink} (valable ${INVITATION_EXPIRY_DAYS} jours).`,
  });
}

export default {
  async find(ctx) {
    const currentUser = await getAuthenticatedUser(ctx);
    const siteDocumentId = currentUser.site.documentId;

    const users = await strapi.query('plugin::users-permissions.user').findMany({
      where: { site: { documentId: siteDocumentId } },
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

    if (user.site?.documentId !== currentUser.site.documentId) {
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
    const invitationToken = generateInvitationToken();

    // Get authenticated role
    const authenticatedRole = await strapi.query('plugin::users-permissions.role').findOne({
      where: { type: 'authenticated' },
    });

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
          site: currentUser.site.id,
          resetPasswordToken: invitationToken,
        },
        populate: ['site'],
      });
    } catch (error) {
      console.error('Failed to create user:', error);
      ctx.throw(400, error.message || 'Failed to create user');
    }

    // Send invitation email (don't fail creation if email fails)
    try {
      await sendInvitationEmail(data.email, data.first_name, invitationToken, currentUser.site.name);
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

    if (existingUser.site?.documentId !== currentUser.site.documentId) {
      ctx.throw(403, 'User does not belong to your site');
    }

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

    if (userToDelete.site?.documentId !== currentUser.site.documentId) {
      ctx.throw(403, 'User does not belong to your site');
    }

    if (userToDelete.id === currentUser.id) {
      ctx.throw(400, 'Cannot delete yourself');
    }

    // Prevent deleting the last admin
    if (userToDelete.municipality_role === 'admin') {
      const admins = await strapi.query('plugin::users-permissions.user').findMany({
        where: {
          site: { documentId: currentUser.site.documentId },
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
   * Public endpoint — accept an invitation and set password.
   * POST /api/user-management/accept-invitation
   */
  async acceptInvitation(ctx) {
    const { token, password, passwordConfirmation } = ctx.request.body;

    if (!token || !password || !passwordConfirmation) {
      ctx.throw(400, 'Missing required fields: token, password, passwordConfirmation');
    }

    if (password !== passwordConfirmation) {
      ctx.throw(400, 'Les mots de passe ne correspondent pas');
    }

    if (password.length < 6) {
      ctx.throw(400, 'Le mot de passe doit contenir au moins 6 caractères');
    }

    // Find user by invitation token
    const user = await strapi.query('plugin::users-permissions.user').findOne({
      where: { resetPasswordToken: token },
    });

    if (!user) {
      ctx.throw(400, 'Token invalide ou expiré');
    }

    // Check token expiry (7 days from last token update)
    const updatedAt = new Date(user.updatedAt).getTime();
    const now = Date.now();
    const expiryMs = INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    if (now - updatedAt > expiryMs) {
      ctx.throw(400, 'Ce lien a expiré. Demandez à votre administrateur de renvoyer le lien.');
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

    if (user.site?.documentId !== currentUser.site.documentId) {
      ctx.throw(403, 'User does not belong to your site');
    }

    if (!user.blocked) {
      ctx.throw(400, "Cet utilisateur a déjà activé son compte");
    }

    // Generate new token
    const newToken = generateInvitationToken();

    await strapi.query('plugin::users-permissions.user').update({
      where: { id: user.id },
      data: { resetPasswordToken: newToken },
    });

    try {
      await sendInvitationEmail(user.email, user.first_name, newToken, currentUser.site.name);
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

    if (user.site?.documentId !== currentUser.site.documentId) {
      ctx.throw(403, 'User does not belong to your site');
    }

    if (user.blocked) {
      ctx.throw(400, "Cet utilisateur n'a pas encore activé son compte. Utilisez « Renvoyer l'invitation ».");
    }

    // Generate new token
    const newToken = generateInvitationToken();

    await strapi.query('plugin::users-permissions.user').update({
      where: { id: user.id },
      data: { resetPasswordToken: newToken },
    });

    try {
      await sendPasswordResetEmail(user.email, user.first_name, newToken, currentUser.site.name);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      ctx.throw(500, "Erreur lors de l'envoi de l'email");
    }

    ctx.body = { ok: true };
  },
};
