/**
 * User management controller — allows mayor/deputy to manage users of their site.
 */

const ALLOWED_ROLES = ['mayor', 'deputy'];

async function getAuthenticatedUser(ctx) {
  const user = ctx.state.user;
  if (!user) {
    ctx.throw(401, 'Not authenticated');
  }

  // Fetch full user with site relation
  const fullUser = await strapi.query('plugin::users-permissions.user').findOne({
    where: { id: user.id },
    populate: ['site'],
  });

  if (!fullUser?.site) {
    ctx.throw(403, 'No site assigned');
  }

  if (!ALLOWED_ROLES.includes(fullUser.municipality_role)) {
    ctx.throw(403, 'Only mayor and deputy can manage users');
  }

  return fullUser;
}

export default {
  async find(ctx) {
    const currentUser = await getAuthenticatedUser(ctx);
    const siteDocumentId = currentUser.site.documentId;

    const users = await strapi.query('plugin::users-permissions.user').findMany({
      where: { site: { documentId: siteDocumentId } },
      populate: ['site'],
    });

    // Strip sensitive fields
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

    if (!data.username || !data.email || !data.password || !data.first_name || !data.last_name) {
      ctx.throw(400, 'Missing required fields: username, email, password, first_name, last_name');
    }

    // Hash password
    const userService = strapi.plugin('users-permissions').service('user');
    const hashedPassword = await userService.hashPassword(data.password);

    // Get authenticated role
    const authenticatedRole = await strapi.query('plugin::users-permissions.role').findOne({
      where: { type: 'authenticated' },
    });

    const newUser = await strapi.query('plugin::users-permissions.user').create({
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
        blocked: false,
        provider: 'local',
        role: authenticatedRole.id,
        site: currentUser.site.documentId,
      },
      populate: ['site'],
    });

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

    if (data.password) {
      const userService = strapi.plugin('users-permissions').service('user');
      updateData.password = await userService.hashPassword(data.password);
    }

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

    // Cannot delete yourself
    if (userToDelete.id === currentUser.id) {
      ctx.throw(400, 'Cannot delete yourself');
    }

    // Prevent deleting the last mayor
    if (userToDelete.municipality_role === 'mayor') {
      const mayors = await strapi.query('plugin::users-permissions.user').findMany({
        where: {
          site: { documentId: currentUser.site.documentId },
          municipality_role: 'mayor',
        },
      });
      if (mayors.length <= 1) {
        ctx.throw(400, 'Cannot delete the last mayor of the site');
      }
    }

    await strapi.query('plugin::users-permissions.user').delete({ where: { id } });
    ctx.body = { data: { id: Number(id) } };
  },
};
