/**
 * Période d'essai (#310) : une commune inscrite en libre-service est en essai 30 jours.
 *
 * - Rappels par e-mail aux administrateurs de la commune à J-7 et J-1, puis à l'expiration.
 * - À l'expiration : le site est retiré de l'hébergeur, l'administration passe en lecture seule
 *   (middleware site-isolation), plus rien n'est mis en ligne ; les données sont conservées 6 mois,
 *   avec un rappel un mois avant leur suppression.
 * - Le passage en live (équipe Communeo, puis devis en ligne #312) ou une prolongation rend la main ;
 *   un site retiré est remis en ligne aussitôt.
 *
 * `processTrials` est appelé toutes les heures (config/cron-tasks.ts) : chaque étape n'est faite
 * qu'une fois (`trial_notice` garde le dernier avis envoyé).
 */
import { addDays, deletionDate, DELETION_NOTICE_DAYS, formatDate, TRIAL_DAYS, trialDaysLeft } from '@communeo/core';
import { recordActivity } from './activity-log';
import { isBuildQueueConfigured } from './build-queue';
import { deleteCommune } from './commune-deletion';
import deploymentService from './deployment';
import { log } from '../utils/logger';
import { publisher as getPublisher, toPublisherSite } from '../utils/publisher';
import { escapeHtml } from '../utils/security';
import { adminUrl } from './team-notifications';

const SITE = 'api::site.site';

type Notice = 'reminder_7' | 'reminder_1' | 'expired' | 'deletion';

/** Message affiché quand une commune dont l'essai est terminé tente une modification */
export const TRIAL_EXPIRED_MESSAGE =
  "Votre période d'essai est terminée : l'administration est en lecture seule. Passez en live pour modifier et remettre le site en ligne.";

export const isExpired = (site: { plan?: string | null } | null | undefined) => site?.plan === 'expired';

/** Champs d'une commune qui démarre son essai (inscription en libre-service) */
export const trialStart = (now: Date = new Date()) => ({ plan: 'trial', trial_ends_at: addDays(now, TRIAL_DAYS) });


async function adminEmails(siteDocumentId: string): Promise<string[]> {
  const admins = await strapi.db.query('plugin::users-permissions.user').findMany({
    where: { site: { documentId: siteDocumentId }, municipality_role: 'admin', active: { $ne: false } },
    select: ['email'],
  });
  return admins.map((admin: any) => admin.email).filter(Boolean);
}

/** E-mail aux administrateurs de la commune ; un échec est consigné sans bloquer la suite */
async function notifyAdmins(site: any, subject: string, paragraphs: string[], action?: { label: string; path: string }) {
  const to = await adminEmails(site.documentId);
  if (!to.length) return;
  const link = action ? `${adminUrl()}${action.path}` : null;
  const html = [
    `<p>Bonjour,</p>`,
    ...paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`),
    link
      ? `<p><a href="${link}" style="display:inline-block;padding:12px 24px;background-color:#004643;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">${escapeHtml(action!.label)}</a></p>`
      : '',
    `<p>L'équipe Communeo</p>`,
  ].join('\n');
  const text = ['Bonjour,', ...paragraphs, link ? `${action!.label} : ${link}` : '', "L'équipe Communeo"].filter(Boolean).join('\n\n');
  for (const address of to) {
    try {
      await strapi.plugin('email').service('email').send({ to: address, subject, html, text });
    } catch (error) {
      log.error(`[ESSAI] E-mail « ${subject} » non envoyé à ${address} :`, error);
    }
  }
}

const GO_LIVE = { label: 'Passer en live', path: '/passer-en-live' };

async function sendReminder(site: any, now: Date) {
  const days = trialDaysLeft(site.trial_ends_at, now);
  const when = days <= 1 ? 'demain' : `dans ${days} jours`;
  await notifyAdmins(
    site,
    `Votre essai de Communeo se termine ${when} — ${site.name}`,
    [
      `L'essai gratuit du site de ${site.name} se termine ${when}, le ${formatDate(site.trial_ends_at)}.`,
      "Pour garder le site en ligne et continuer à le modifier, passez en live depuis l'administration. Sans passage en live, le site sera retiré et l'administration passera en lecture seule ; vos contenus seront conservés six mois.",
    ],
    GO_LIVE,
  );
}

/** Fin de l'essai : site retiré, lecture seule, e-mail aux administrateurs */
export async function expireTrial(site: any, now: Date = new Date()) {
  const publisher = getPublisher();
  if (site.netlify_site_id || publisher.configured) {
    try {
      await publisher.deleteSite(toPublisherSite(site));
    } catch (error) {
      // Le site reste en ligne chez l'hébergeur : il se retire à la main, l'essai expire quand même
      log.error(`[ESSAI] Site de ${site.slug} non retiré de l'hébergeur :`, error);
    }
  }
  await strapi.documents(SITE).update({
    documentId: site.documentId,
    data: {
      plan: 'expired',
      trial_expired_at: now,
      trial_notice: 'expired',
      // Le site chez l'hébergeur n'existe plus : recréé à la prochaine mise en ligne
      netlify_site_id: null,
      live_url: null,
      custom_domain: null,
      domain_type: null,
      domain_status: 'pending',
      domain_configured_at: null,
    } as any,
  });
  await recordActivity({ action: 'trial_expire', siteDocumentId: site.documentId, target: { type: 'site', id: site.documentId, label: site.name } });
  await notifyAdmins(
    site,
    `Votre essai de Communeo est terminé — ${site.name}`,
    [
      `L'essai gratuit du site de ${site.name} est terminé : le site n'est plus en ligne et l'administration est en lecture seule.`,
      `Vos contenus sont conservés jusqu'au ${formatDate(deletionDate(now))}. Passez en live pour remettre le site en ligne et continuer à le modifier.`,
    ],
    GO_LIVE,
  );
  log.info(`[ESSAI] Essai de ${site.slug} terminé`);
}

async function sendDeletionNotice(site: any) {
  await notifyAdmins(
    site,
    `Les données de ${site.name} seront supprimées le ${formatDate(deletionDate(site.trial_expired_at))} — Communeo`,
    [
      `L'essai du site de ${site.name} s'est terminé le ${formatDate(site.trial_expired_at)}. Sans passage en live, ses contenus, ses fichiers et ses comptes seront définitivement supprimés le ${formatDate(deletionDate(site.trial_expired_at))}.`,
    ],
    GO_LIVE,
  );
}

async function setNotice(site: any, notice: Notice) {
  await strapi.documents(SITE).update({ documentId: site.documentId, data: { trial_notice: notice } as any });
}

/** Rappels, expirations et suppressions dus à `now` */
export async function processTrials(now: Date = new Date()) {
  const trials = await strapi.db.query(SITE).findMany({ where: { plan: 'trial', trial_ends_at: { $notNull: true } } });
  for (const site of trials as any[]) {
    try {
      const days = trialDaysLeft(site.trial_ends_at, now);
      if (days === 0) await expireTrial(site, now);
      else if (days <= 1 && site.trial_notice !== 'reminder_1') {
        await sendReminder(site, now);
        await setNotice(site, 'reminder_1');
      } else if (days <= 7 && !site.trial_notice) {
        await sendReminder(site, now);
        await setNotice(site, 'reminder_7');
      }
    } catch (error) {
      log.error(`[ESSAI] ${site.slug} :`, error);
    }
  }

  const expired = await strapi.db.query(SITE).findMany({ where: { plan: 'expired', trial_expired_at: { $notNull: true } } });
  for (const site of expired as any[]) {
    try {
      const deletion = deletionDate(site.trial_expired_at);
      if (deletion <= now) {
        await recordActivity({ action: 'commune_delete', siteDocumentId: null, target: { type: 'site', id: site.documentId, label: site.name }, details: { reason: 'trial_expired' } });
        await deleteCommune(site.documentId);
        log.info(`[ESSAI] ${site.slug} supprimée (essai terminé le ${site.trial_expired_at})`);
      } else if (addDays(deletion, -DELETION_NOTICE_DAYS) <= now && site.trial_notice !== 'deletion') {
        await sendDeletionNotice(site);
        await setNotice(site, 'deletion');
      }
    } catch (error) {
      log.error(`[ESSAI] ${site.slug} :`, error);
    }
  }
}

/** Le devis validé qui attendait l'équipe : accepté au passage en live, refusé sinon (#312) */
async function settleQuote(site: any, status: 'accepted' | 'rejected') {
  const quotes = await strapi.db.query('api::quote.quote').findMany({ where: { site: { documentId: site.documentId }, status: 'signed' }, select: ['id'] });
  // updateMany ne filtre pas sur une relation : par identifiants
  if (quotes.length) await strapi.db.query('api::quote.quote').updateMany({ where: { id: { $in: quotes.map((quote: any) => quote.id) } }, data: { status } });
}

/**
 * Remise en ligne : un site retiré à l'expiration revient dès que la commune reprend la main ; au
 * passage en live, un site déjà publié perd tout de suite son bandeau « Site en préparation » (#311).
 */
async function republish(site: any, { ifPublished = false } = {}) {
  const published = !!(site.netlify_site_id || site.live_url);
  if (!(isExpired(site) || (ifPublished && published)) || !isBuildQueueConfigured()) return;
  try {
    await deploymentService.requestBuild(site.documentId, { triggeredBy: null, reason: 'manual' });
  } catch (error) {
    log.error(`[ESSAI] Remise en ligne de ${site.slug} impossible :`, error);
  }
}

/** Passage en live (équipe Communeo) : fin de l'essai ; le site est remis en ligne, sans bandeau d'essai */
export async function goLive(site: any) {
  const updated = await strapi.documents(SITE).update({
    documentId: site.documentId,
    data: { plan: 'live', trial_expired_at: null, trial_notice: null, live_requested_at: null, live_requested_by: null } as any,
  });
  await recordActivity({ action: 'commune_go_live', siteDocumentId: site.documentId, target: { type: 'site', id: site.documentId, label: site.name } });
  await settleQuote(site, 'accepted');
  await republish(site, { ifPublished: true });
  await notifyAdmins(
    site,
    `Le site de ${site.name} est en live — Communeo`,
    [
      `Le site de ${site.name} est passé en live : il reste en ligne sans limite de durée, sans le bandeau « Site en préparation ».`,
      "Vous pouvez maintenant le relier à l'adresse de la commune depuis l'écran Mise en ligne de l'administration.",
    ],
    { label: 'Ouvrir la mise en ligne', path: '/mise-en-ligne' },
  );
  return updated;
}

/** Prolonge l'essai de `days` jours, depuis sa fin prévue ou depuis aujourd'hui s'il est terminé */
export async function extendTrial(site: any, days: number, now: Date = new Date()) {
  const from = site.plan === 'trial' && site.trial_ends_at && new Date(site.trial_ends_at) > now ? new Date(site.trial_ends_at) : now;
  const endsAt = addDays(from, days);
  const updated = await strapi.documents(SITE).update({
    documentId: site.documentId,
    data: { plan: 'trial', trial_ends_at: endsAt, trial_expired_at: null, trial_notice: null } as any,
  });
  await recordActivity({
    action: 'trial_extend',
    siteDocumentId: site.documentId,
    target: { type: 'site', id: site.documentId, label: site.name },
    details: { days, until: endsAt.toISOString() },
  });
  await republish(site);
  return updated;
}

/** Demande de passage en live refusée par l'équipe : la demande est retirée, le motif envoyé à la commune */
export async function rejectGoLive(site: any, reason: string) {
  await strapi.documents(SITE).update({ documentId: site.documentId, data: { live_requested_at: null, live_requested_by: null } as any });
  await settleQuote(site, 'rejected');
  await recordActivity({
    action: 'live_reject',
    siteDocumentId: site.documentId,
    target: { type: 'site', id: site.documentId, label: site.name },
    details: { reason },
  });
  await notifyAdmins(
    site,
    `Votre demande de passage en live — ${site.name}`,
    [
      `L'équipe Communeo n'a pas validé le passage en live du site de ${site.name} :`,
      reason,
      "Vous pouvez valider un nouveau devis depuis l'administration, une fois le point réglé.",
    ],
    GO_LIVE,
  );
}
