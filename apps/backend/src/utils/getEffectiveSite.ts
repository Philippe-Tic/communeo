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
    const completeUser = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { id: user.id }, populate: ['site'] });
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

/**
 * Vérifie que l'utilisateur courant a l'un des rôles donnés (municipality_role).
 * Retourne false si ce n'est pas le cas ; l'appelant répond alors 403.
 */
export function hasRole(ctx: any, roles: string[]): boolean {
  return roles.includes(ctx.state.user?.municipality_role);
}
