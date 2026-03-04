export default (plugin) => {
  const originalMe = plugin.controllers.user.me;

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
          ctx.body.site = fullUser.site;
        }
      }
    }
  };

  return plugin;
};
