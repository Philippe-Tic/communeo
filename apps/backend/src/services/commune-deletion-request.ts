/**
 * Suppression demandée par une commune (#391) : un administrateur de la commune la demande, elle a lieu
 * `COMMUNE_DELETION_DAYS` jours plus tard (`Site.deletion_scheduled_at`) ; la mairie ou l'équipe
 * Communeo peut l'annuler jusque-là. Pendant le délai, rien ne change : le site reste en ligne et
 * l'administration fonctionne. L'équipe peut aussi supprimer une commune tout de suite (site-management).
 *
 * E-mails : à la demande (administrateurs de la commune et équipe), la veille (`deletion_reminded`), à
 * l'annulation et après la suppression. `processDeletionRequests` est appelé toutes les heures
 * (config/cron-tasks.ts).
 */
import { communeDeletionDate, formatDate } from '@communeo/core';
import { log } from '../utils/logger';
import { recordActivity } from './activity-log';
import { deleteCommune } from './commune-deletion';
import { adminUrl, notifyTeam } from './team-notifications';
import { notifyAdmins } from './trial';

const SITE = 'api::site.site';
const DAY = 86_400_000;
const CANCEL = { label: 'Annuler la suppression', path: '/mon-site/suppression' };

const targetOf = (site: any) => ({ type: 'site', id: site.documentId, label: site.name });

export interface DeletionState {
  scheduledAt: string | null;
}

export const deletionStateOf = (site: any): DeletionState => ({
  scheduledAt: site?.deletion_scheduled_at ? new Date(site.deletion_scheduled_at).toISOString() : null,
});

async function adminEmails(siteDocumentId: string): Promise<string[]> {
  const admins = await strapi.db.query('plugin::users-permissions.user').findMany({
    where: { site: { documentId: siteDocumentId }, municipality_role: 'admin', active: { $ne: false } },
    select: ['email'],
  });
  return admins.map((admin: any) => admin.email).filter(Boolean);
}

/** Demande de suppression : date prévue, e-mails, journal. Une demande en cours est gardée telle quelle. */
export async function requestDeletion(site: any, requestedBy: string, now: Date = new Date()) {
  if (site.deletion_scheduled_at) return site;
  const scheduledAt = communeDeletionDate(now);
  const updated = await strapi.db.query(SITE).update({
    where: { documentId: site.documentId },
    data: { deletion_scheduled_at: scheduledAt, deletion_requested_by: requestedBy, deletion_reminded: false },
  });
  await recordActivity({ action: 'deletion_request', siteDocumentId: site.documentId, target: targetOf(site), details: { scheduledAt: scheduledAt.toISOString() } });
  await notifyAdmins(
    site,
    `Suppression de la commune ${site.name} prévue le ${formatDate(scheduledAt)} — Communeo`,
    [
      `${requestedBy} a demandé la suppression de la commune ${site.name} sur Communeo.`,
      `Le ${formatDate(scheduledAt)}, le site sera retiré d'internet et tous les contenus, fichiers et comptes de la commune seront définitivement supprimés. Les factures sont conservées, comme la loi l'exige.`,
      "Jusque-là, rien ne change et la suppression peut être annulée depuis l'écran « Supprimer la commune » de l'administration (Mon site).",
    ],
    CANCEL,
  );
  await notifyTeam(
    `Suppression demandée : ${site.name}, le ${formatDate(scheduledAt)}`,
    `${requestedBy} a demandé la suppression de la commune ${site.name}. Elle aura lieu le ${formatDate(scheduledAt)}, sauf annulation par la mairie ou par l'équipe : ${adminUrl()}/plateforme/communes/${site.documentId}`,
  );
  log.info(`[SUPPRESSION] ${site.slug} : suppression demandée pour le ${scheduledAt.toISOString()}`);
  return updated;
}

/** Annulation par la mairie ou l'équipe : la commune est gardée, les administrateurs et l'équipe prévenus */
export async function cancelDeletion(site: any, cancelledBy: string) {
  if (!site.deletion_scheduled_at) return site;
  const updated = await strapi.db.query(SITE).update({
    where: { documentId: site.documentId },
    data: { deletion_scheduled_at: null, deletion_requested_by: null, deletion_reminded: false },
  });
  await recordActivity({ action: 'deletion_cancel', siteDocumentId: site.documentId, target: targetOf(site) });
  await notifyAdmins(site, `Suppression de la commune ${site.name} annulée — Communeo`, [
    `${cancelledBy} a annulé la suppression de la commune ${site.name} : la commune, son site et ses contenus sont conservés.`,
  ]);
  await notifyTeam(`Suppression annulée : ${site.name}`, `${cancelledBy} a annulé la suppression de la commune ${site.name}.`);
  return updated;
}

async function remind(site: any) {
  await notifyAdmins(
    site,
    `La commune ${site.name} sera supprimée demain — Communeo`,
    [
      `Comme demandé, la commune ${site.name} sera supprimée demain, le ${formatDate(site.deletion_scheduled_at)} : le site sera retiré d'internet et tous ses contenus, fichiers et comptes définitivement supprimés.`,
      "Pour garder la commune, annulez la suppression depuis l'écran « Supprimer la commune » de l'administration (Mon site).",
    ],
    CANCEL,
  );
  await strapi.db.query(SITE).update({ where: { documentId: site.documentId }, data: { deletion_reminded: true } });
}

async function execute(site: any) {
  // Adresses relevées avant la suppression des comptes
  const recipients = await adminEmails(site.documentId);
  await recordActivity({ action: 'commune_delete', siteDocumentId: null, target: targetOf(site), details: { reason: 'requested' }, systemActor: 'Suppression demandée' });
  await deleteCommune(site.documentId);
  const text = [
    'Bonjour,',
    `Comme demandé, la commune ${site.name} a été supprimée de Communeo : son site n'est plus en ligne et ses contenus, fichiers et comptes ont été effacés. Les factures sont conservées, comme la loi l'exige.`,
    "Merci d'avoir utilisé Communeo.",
    "L'équipe Communeo",
  ].join('\n\n');
  for (const to of recipients) {
    try {
      await strapi.plugin('email').service('email').send({ to, subject: `La commune ${site.name} a été supprimée — Communeo`, text });
    } catch (error) {
      log.error(`[SUPPRESSION] E-mail de confirmation non envoyé à ${to} :`, error);
    }
  }
  await notifyTeam(`Commune supprimée : ${site.name}`, `La commune ${site.name} a été supprimée, comme elle l'avait demandé.`);
  log.info(`[SUPPRESSION] ${site.slug} supprimée à sa demande`);
}

/** Rappels de la veille et suppressions arrivées à échéance */
export async function processDeletionRequests(now: Date = new Date()) {
  const due = await strapi.db.query(SITE).findMany({ where: { deletion_scheduled_at: { $notNull: true } } });
  for (const site of due as any[]) {
    try {
      const at = new Date(site.deletion_scheduled_at).getTime();
      if (at <= now.getTime()) await execute(site);
      else if (at - now.getTime() <= DAY && !site.deletion_reminded) await remind(site);
    } catch (error) {
      log.error(`[SUPPRESSION] ${site.slug} :`, error);
    }
  }
}
