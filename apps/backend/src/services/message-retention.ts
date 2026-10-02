/**
 * Durée de conservation des messages des habitants (#342), tâche de nuit (config/cron-tasks.ts).
 *
 * Pour chaque commune, les messages **traités** (statut « Traité » ou « Clos ») dont la dernière
 * modification est plus ancienne que la durée choisie (`Site.message_retention`, 1 an par défaut,
 * « jamais » possible) sont supprimés avec leurs pièces jointes. Jamais un message non traité, ni
 * une demande RGPD encore dans son délai d'un mois. Chaque commune est traitée à part (requêtes
 * filtrées par sa relation `site`) ; une ligne au journal d'activité par commune et par passage.
 *
 * Même tâche : les demandes d'inscription jamais confirmées sont supprimées au bout de 30 jours
 * (registre des traitements).
 */
import { effectiveMessageRetention, MESSAGE_RETENTION_LABELS, messageRetentionCutoff, rgpdDeadline } from '@communeo/core';
import { recordActivity } from './activity-log';
import { log } from '../utils/logger';

const SITE = 'api::site.site';
const MESSAGE = 'api::contact-submission.contact-submission';
const MEDIA_ITEM = 'api::media-item.media-item';
const SIGNUP_REQUEST = 'api::signup-request.signup-request';

/** Messages traités : répondus (« Traité ») ou archivés (« Clos ») */
export const TREATED_STATUSES = ['resolved', 'closed'];
export const UNCONFIRMED_SIGNUP_DAYS = 30;

/** Auteur affiché au journal d'activité */
export const PURGE_ACTOR = 'Suppression automatique';

/** Pièces jointes du message : fichiers propres au message (jamais un fichier de la médiathèque) */
async function removeAttachments(message: any, slug: string) {
  const upload = strapi.plugin('upload').service('upload');
  for (const file of (message.attachments ?? []) as any[]) {
    try {
      const inLibrary = await strapi.db.query(MEDIA_ITEM).count({ where: { file: { id: file.id } } });
      if (!inLibrary) await upload.remove(file);
    } catch (error) {
      log.error(`[CONSERVATION] Pièce jointe ${file.id} du message ${message.reference_number} (${slug}) non supprimée :`, error);
    }
  }
}

/** Supprime les messages traités trop anciens d'une commune ; renvoie leur nombre */
async function purgeSite(site: any, now: Date): Promise<number> {
  const cutoff = messageRetentionCutoff(site.message_retention, now);
  if (!cutoff) return 0;
  const expired = await strapi.db.query(MESSAGE).findMany({
    where: { site: { id: site.id }, status: { $in: TREATED_STATUSES }, updatedAt: { $lt: cutoff.toISOString() } },
    populate: ['attachments'],
  });
  let count = 0;
  for (const message of expired as any[]) {
    // Une demande RGPD reste tant que court son délai d'un mois, même close avant
    if (message.category === 'rgpd' && rgpdDeadline(message.createdAt) > now) continue;
    await removeAttachments(message, site.slug);
    await strapi.db.query(MESSAGE).delete({ where: { id: message.id } });
    count += 1;
  }
  if (count) {
    const retention = effectiveMessageRetention(site.message_retention);
    await recordActivity({
      action: 'messages_purge',
      siteDocumentId: site.documentId,
      systemActor: PURGE_ACTOR,
      target: { type: 'contact-submission', label: `${count} message${count > 1 ? 's' : ''}` },
      details: { count, retention, label: MESSAGE_RETENTION_LABELS[retention] },
    });
    log.info(`[CONSERVATION] ${site.slug} : ${count} message(s) traité(s) supprimé(s) (${MESSAGE_RETENTION_LABELS[retention]})`);
  }
  return count;
}

/** Demandes d'inscription jamais confirmées, de plus de 30 jours */
export async function purgeUnconfirmedSignups(now: Date = new Date()): Promise<number> {
  const limit = new Date(now.getTime() - UNCONFIRMED_SIGNUP_DAYS * 86_400_000);
  const { count } = await strapi.db.query(SIGNUP_REQUEST).deleteMany({
    where: { status: { $in: ['pending_email', 'pending_confirmation'] }, createdAt: { $lt: limit.toISOString() } },
  });
  if (count) log.info(`[CONSERVATION] ${count} demande(s) d'inscription non confirmée(s) supprimée(s)`);
  return count;
}

/** Tâche de nuit : toutes les communes, puis les demandes d'inscription ; renvoie le nombre de messages supprimés */
export async function purgeExpiredMessages(now: Date = new Date()): Promise<number> {
  const sites = await strapi.db.query(SITE).findMany({ select: ['id', 'documentId', 'slug', 'message_retention'] });
  let total = 0;
  for (const site of sites as any[]) {
    try {
      total += await purgeSite(site, now);
    } catch (error) {
      log.error(`[CONSERVATION] ${site.slug} :`, error);
    }
  }
  try {
    await purgeUnconfirmedSignups(now);
  } catch (error) {
    log.error("[CONSERVATION] Demandes d'inscription :", error);
  }
  return total;
}
