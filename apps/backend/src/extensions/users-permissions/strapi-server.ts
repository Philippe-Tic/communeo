import { LOGIN_LOCKED, loginAttempts } from '../../utils/login-attempts';

// Champs du site jamais exposés au client (identifiants d'infrastructure)
const PRIVATE_SITE_FIELDS = ['netlify_site_id'];

export default (plugin) => {
  const originalMe = plugin.controllers.user.me;
  const authFactory = plugin.controllers.auth;

  // Connexion par /api/auth/local (le contrôleur `auth` est une fabrique, contrairement à `user`) :
  // mêmes blocages que la session de l'admin (sinon, cette entrée publique les contournerait), et
  // un compte désactivé est refusé comme un mauvais mot de passe
  plugin.controllers.auth = (deps) => {
    const controller = typeof authFactory === 'function' ? authFactory(deps) : authFactory;
    const originalCallback = controller.callback;
    controller.callback = async (ctx) => {
      const identifier = String(ctx.request.body?.identifier ?? '');
      if (identifier && loginAttempts.isLocked(identifier, ctx.request.ip)) return ctx.tooManyRequests(LOGIN_LOCKED);
      try {
        await originalCallback(ctx);
      } catch (error) {
        if (identifier) loginAttempts.failed(identifier, ctx.request.ip);
        throw error;
      }
      const id = ctx.body?.user?.id;
      if (!id) {
        if (identifier && ctx.status >= 400) loginAttempts.failed(identifier, ctx.request.ip);
        return;
      }
      const user = await strapi.query('plugin::users-permissions.user').findOne({ where: { id } });
      if (user?.active === false) {
        loginAttempts.failed(identifier, ctx.request.ip);
        ctx.status = 400;
        ctx.body = { data: null, error: { status: 400, name: 'ValidationError', message: 'Invalid identifier or password', details: {} } };
        return;
      }
      loginAttempts.succeeded(identifier);
    };
    return controller;
  };

  plugin.controllers.user.me = async (ctx) => {
    await originalMe(ctx);

    if (ctx.body && ctx.state.user) {
      const fullUser = await strapi
        .query("plugin::users-permissions.user")
        .findOne({
          where: { id: ctx.state.user.id },
          populate: ["site"],
        });

      if (fullUser) {
        ctx.body.municipality_role = fullUser.municipality_role;
        ctx.body.first_name = fullUser.first_name;
        ctx.body.last_name = fullUser.last_name;
        ctx.body.phone = fullUser.phone;
        ctx.body.active = fullUser.active;
        if (fullUser.site) {
          const site = { ...fullUser.site };
          for (const field of PRIVATE_SITE_FIELDS) delete site[field];
          ctx.body.site = site;
        }
      }
    }
  };

  return plugin;
};
