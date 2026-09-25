/**
 * Journal d'activité (#190) : actions sensibles — connexions, publications, dépublications,
 * suppressions, changements de thème et de domaine, gestion des utilisateurs et des communes.
 * L'auteur est la personne réellement connectée : une action de l'équipe Communeo sur une commune
 * (dans son administration, en impersonation, ou depuis l'espace équipe) est notée à son nom et
 * marquée « Équipe Communeo ».
 * Gardé 6 mois (RGPD), purgé chaque nuit. Consultable par l'équipe (tout) et par les
 * administrateurs d'une commune (la leur) : GET /api/activity-log.
 * L'enregistrement n'empêche jamais l'action : une erreur est seulement consignée.
 */
import { log } from '../utils/logger';
import { isCommuneDeletion } from './commune-deletion';
import { changeTitle, isScheduledPublication } from './pending-changes';

const LOG = 'api::activity-log.activity-log';
export const ACTIVITY_RETENTION_DAYS = 183;

export type ActivityAction =
  | 'login'
  | 'publish'
  | 'unpublish'
  | 'delete'
  | 'theme_change'
  | 'domain_change'
  | 'user_invite'
  | 'role_change'
  | 'user_deactivate'
  | 'user_reactivate'
  | 'user_delete'
  | 'commune_create'
  | 'commune_suspend'
  | 'commune_unsuspend'
  | 'commune_delete'
  | 'trial_extend'
  | 'trial_expire'
  | 'live_request'
  | 'commune_go_live';

export interface ActivityInput {
  action: ActivityAction;
  /** Commune concernée ; par défaut celle de la requête (y compris en impersonation) */
  siteDocumentId?: string | null;
  target?: { type: string; id?: string | number | null; label?: string | null };
  details?: Record<string, unknown>;
  /** Connexion : la personne n'est pas encore dans la requête */
  actor?: { id: number; first_name?: string | null; last_name?: string | null; email?: string | null };
  ip?: string;
}

const nameOf = (user: { first_name?: string | null; last_name?: string | null; email?: string | null }) =>
  [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || null;

export async function recordActivity(input: ActivityInput): Promise<void> {
  try {
    const ctx = (strapi as any).requestContext?.get?.();
    const user = input.actor ?? ctx?.state?.user ?? null;
    const impersonated = ctx?.state?.impersonatedSite;
    const siteDocumentId =
      input.siteDocumentId !== undefined ? input.siteDocumentId : (impersonated?.documentId ?? ctx?.state?.user?.site?.documentId ?? null);
    const site = siteDocumentId
      ? await strapi.db.query('api::site.site').findOne({ where: { documentId: siteDocumentId }, select: ['id'] })
      : null;
    const scheduled = !user && isScheduledPublication();
    await strapi.db.query(LOG).create({
      data: {
        site: site?.id ?? null,
        action: input.action,
        actor: user?.id ?? null,
        actor_name: user ? nameOf(user) : scheduled ? 'Publication programmée' : null,
        // Action de l'équipe Communeo sur une commune (impersonation ou espace équipe)
        on_behalf: !!site && user?.municipality_role === 'super_admin',
        target_type: input.target?.type ?? null,
        target_id: input.target?.id != null ? String(input.target.id) : null,
        target_label: input.target?.label ?? null,
        ip: input.ip ?? null,
        details: input.details ?? null,
      },
    });
  } catch (error) {
    log.error(`[JOURNAL] Action non enregistrée (${input.action}) :`, error);
  }
}

/** Connexion réussie : notée au journal (avec l'adresse IP) et date de dernière connexion du compte */
export async function recordLogin(user: any, ip: string): Promise<void> {
  try {
    await strapi.db.query('plugin::users-permissions.user').update({ where: { id: user.id }, data: { last_login_at: new Date() } });
  } catch (error) {
    log.error('[JOURNAL] Dernière connexion non enregistrée :', error);
  }
  await recordActivity({
    action: 'login',
    actor: user,
    siteDocumentId: user.municipality_role === 'super_admin' ? null : (user.site?.documentId ?? null),
    ip,
  });
}

/** Entrées de plus de 6 mois supprimées (tâche de nuit) */
export async function purgeActivityLog(now = new Date()): Promise<number> {
  const limit = new Date(now.getTime() - ACTIVITY_RETENTION_DAYS * 86_400_000);
  const { count } = await strapi.db.query(LOG).deleteMany({ where: { createdAt: { $lt: limit.toISOString() } } });
  if (count) log.info(`[JOURNAL] ${count} entrées de plus de 6 mois supprimées`);
  return count;
}

// --- Contenus : publications, dépublications, suppressions (middleware des documents) --------------

const IGNORED = new Set([LOG, 'api::pending-change.pending-change', 'api::deployment.deployment', 'api::domain.domain']);

/** Nom court d'un type de contenu (« article », « evenement »…) */
const shortType = (uid: string) => uid.split('.').pop()!;

export function activityLogMiddleware(strapi: any) {
  return async (ctx: any, next: () => Promise<any>) => {
    const uid: string = ctx.uid ?? '';
    const contentType = strapi.contentTypes[uid];
    if (!uid.startsWith('api::') || IGNORED.has(uid) || (!contentType?.attributes?.site && uid !== 'api::site.site')) return next();
    // Suppression d'une commune : une seule ligne pour la commune, pas une par contenu
    if (isCommuneDeletion()) return next();

    const documentId: string | undefined = ctx.params?.documentId;
    const publishing =
      ctx.action === 'publish' || (['create', 'update'].includes(ctx.action) && ctx.params?.status === 'published');
    const themeChange = uid === 'api::site.site' && ctx.action === 'update' && ctx.params?.data?.theme !== undefined;
    const tracked = publishing || ctx.action === 'unpublish' || (ctx.action === 'delete' && uid !== 'api::site.site') || themeChange;
    if (!tracked) return next();

    // Avant l'action : ce qui disparaît avec une suppression (titre, commune), l'ancien thème
    const before = documentId
      ? await strapi.db
          .query(uid)
          .findOne({ where: { documentId }, populate: uid === 'api::site.site' ? [] : ['site'] })
          .catch(() => null)
      : null;
    const result = await next();

    const entry = result?.entries?.[0] ?? result ?? before;
    if (themeChange) {
      if (before && before.theme !== ctx.params.data.theme)
        await recordActivity({
          action: 'theme_change',
          siteDocumentId: documentId,
          target: { type: 'site', id: documentId, label: before.name },
          details: { from: before.theme, to: ctx.params.data.theme },
        });
      return result;
    }
    const siteDocumentId =
      before?.site?.documentId ??
      (entry?.documentId
        ? (await strapi.db.query(uid).findOne({ where: { documentId: entry.documentId }, populate: ['site'] }).catch(() => null))
            ?.site?.documentId
        : undefined);
    await recordActivity({
      action: publishing ? 'publish' : (ctx.action as 'unpublish' | 'delete'),
      ...(siteDocumentId ? { siteDocumentId } : {}),
      target: { type: shortType(uid), id: entry?.documentId ?? documentId, label: changeTitle(uid, entry ?? before) },
    });
    return result;
  };
}
