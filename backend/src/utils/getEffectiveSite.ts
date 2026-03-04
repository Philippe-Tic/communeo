/**
 * Helper partagé pour résoudre le site effectif d'un utilisateur.
 * Gère les cas : site déjà chargé, site en DB, ou super_admin impersonant un site.
 */
export async function getEffectiveSite(ctx: any): Promise<any | null> {
  const user = ctx.state.user;

  // 1. Si l'utilisateur a déjà un site chargé
  if (user?.site) return user.site;

  // 2. Tenter de charger la relation site depuis la DB
  if (user) {
    const completeUser = await strapi.entityService.findOne(
      'plugin::users-permissions.user',
      user.id,
      { populate: ['site'] }
    );
    if ((completeUser as any)?.site) {
      ctx.state.user = completeUser;
      return (completeUser as any).site;
    }
  }

  // 3. Super admin impersonation (injecté par le middleware site-isolation)
  if (ctx.state.impersonatedSite) {
    return ctx.state.impersonatedSite;
  }

  return null;
}
