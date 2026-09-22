import { ROLE_PERMISSIONS } from '../../config/permissions';

type SyncResult = { role: string; created: string[]; removed: string[] };

/**
 * Aligne les permissions des rôles sur config/permissions.ts. Idempotent : ne modifie rien si la base
 * est déjà à jour. Retourne ce qui a été créé et supprimé, rôle par rôle.
 */
export async function syncPermissions(strapi: any): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  for (const [roleType, actions] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: roleType } });
    if (!role) throw new Error(`Rôle users-permissions introuvable : ${roleType}`);

    const wanted = new Set(actions);
    const existing = await strapi.db.query('plugin::users-permissions.permission').findMany({
      where: { role: role.id },
      select: ['id', 'action'],
    });
    const existingActions = new Set(existing.map((permission: any) => permission.action));

    const toRemove = existing.filter((permission: any) => !wanted.has(permission.action));
    const toCreate = [...wanted].filter((action) => !existingActions.has(action));

    for (const permission of toRemove) {
      await strapi.db.query('plugin::users-permissions.permission').delete({ where: { id: permission.id } });
    }
    for (const action of toCreate) {
      await strapi.db.query('plugin::users-permissions.permission').create({ data: { action, role: role.id } });
    }

    results.push({ role: roleType, created: toCreate, removed: toRemove.map((permission: any) => permission.action) });
  }

  return results;
}

export async function applyPermissions(strapi: any) {
  const results = await syncPermissions(strapi);
  for (const { role, created, removed } of results) {
    if (!created.length && !removed.length) continue;
    strapi.log.info(`[permissions] ${role} : ${created.length} ajoutée(s), ${removed.length} retirée(s)`);
    for (const action of removed) strapi.log.info(`[permissions]   - ${action}`);
    for (const action of created) strapi.log.info(`[permissions]   + ${action}`);
  }
}

/** L'inscription publique est activée par défaut dans users-permissions : on la ferme. */
export async function disablePublicRegistration(strapi: any) {
  const store = strapi.store({ type: 'plugin', name: 'users-permissions' });
  const advanced = (await store.get({ key: 'advanced' })) || {};
  if (advanced.allow_register !== false) {
    await store.set({ key: 'advanced', value: { ...advanced, allow_register: false } });
    strapi.log.info('[bootstrap] Inscription publique désactivée');
  }
}
