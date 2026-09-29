/**
 * Approbation d'une inscription en libre-service (#337).
 *
 * La personne qui s'inscrit vérifie d'abord sa propre adresse : la commune est alors créée en essai
 * et elle travaille tout de suite dans l'administration. Tant que la mairie (depuis son adresse
 * officielle) ou l'équipe Communeo (sans adresse officielle connue) n'a pas approuvé, le site n'est
 * jamais mis en ligne : `site.signup_approval` vaut `townhall` ou `team`, et la mise en ligne
 * manuelle, automatique et le worker s'arrêtent là. Refusée, la demande supprime la commune.
 */
import { ofCommune } from '@communeo/core';
import { recordActivity } from './activity-log';
import { isBuildQueueConfigured } from './build-queue';
import { deleteCommune } from './commune-deletion';
import deploymentService from './deployment';
import { listPendingChanges } from './pending-changes';
import { adminUrl, notifyTeam } from './team-notifications';
import { log } from '../utils/logger';
import { escapeHtml } from '../utils/security';

const REQUEST = 'api::signup-request.signup-request';
const SITE = 'api::site.site';

export const APPROVAL_PENDING_MESSAGE =
  "Le site sera mis en ligne dès que la mairie aura approuvé la création du site. Vous pouvez continuer à le préparer.";
export const TEAM_REVIEW_PENDING_MESSAGE =
  "Le site sera mis en ligne dès que l'équipe Communeo aura vérifié votre demande. Vous pouvez continuer à le préparer.";

/** Vrai tant que la mairie ou l'équipe n'a pas approuvé l'inscription : rien n'est mis en ligne */
export const isAwaitingApproval = (site: { signup_approval?: string | null } | null | undefined) => !!site?.signup_approval;

export const approvalPendingMessage = (site: { signup_approval?: string | null }) =>
  site.signup_approval === 'team' ? TEAM_REVIEW_PENDING_MESSAGE : APPROVAL_PENDING_MESSAGE;

/** « m***@saint-aubin.fr » : assez pour reconnaître la boîte, sans l'exposer */
export const maskEmail = (email: string) => {
  const [local, domain] = email.split('@');
  return `${local!.charAt(0)}***@${domain}`;
};

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;padding:12px 24px;background-color:#004643;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">${escapeHtml(label)}</a>`;

/** Demande d'approbation envoyée à l'adresse officielle de la mairie */
export async function sendApprovalEmail(request: any, token: string) {
  const link = `${adminUrl()}/inscription/approuver?jeton=${token}`;
  const ofName = ofCommune(request.commune_name);
  const commune = escapeHtml(request.commune_name);
  const person = escapeHtml(`${request.first_name} ${request.last_name}`);
  const email = escapeHtml(request.email);
  await strapi.plugin('email').service('email').send({
    to: request.official_email,
    subject: `Approuver la création du site internet ${ofName} — Communeo`,
    html: `
      <h2>Création du site internet ${escapeHtml(ofName)}</h2>
      <p>Bonjour,</p>
      <p><strong>${person}</strong> (${email}) a créé le site internet de la commune <strong>${commune}</strong> sur Communeo et prépare ses contenus.</p>
      <p>Ce message est envoyé à l'adresse officielle de la mairie, connue de l'Annuaire de l'administration, pour vérifier que la demande vient bien de la commune. Le site ne sera mis en ligne qu'après votre approbation.</p>
      <p>${button(link, 'Répondre à la demande')}</p>
      <p>Sur la page qui s'ouvre, vous pourrez approuver la demande, ou la refuser si la mairie n'en est pas à l'origine : le site et ses contenus seront alors supprimés. Ce lien est valable 7 jours.</p>
    `,
    text: `${request.first_name} ${request.last_name} (${request.email}) a créé le site internet ${ofName} sur Communeo. Le site ne sera mis en ligne qu'après l'approbation de la mairie. Pour approuver ou refuser la demande (lien valable 7 jours) : ${link}`,
  });
  await strapi.db.query(REQUEST).update({ where: { id: request.id }, data: { approval_sent_at: new Date() } });
}

async function emailRequester(request: any, subject: string, paragraphs: string[], action?: { label: string; path: string }) {
  const link = action ? `${adminUrl()}${action.path}` : null;
  try {
    await strapi.plugin('email').service('email').send({
      to: request.email,
      subject,
      html: [
        `<p>Bonjour ${escapeHtml(request.first_name)},</p>`,
        ...paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`),
        link ? `<p>${button(link, action!.label)}</p>` : '',
        `<p>L'équipe Communeo</p>`,
      ].join('\n'),
      text: [`Bonjour ${request.first_name},`, ...paragraphs, link ? `${action!.label} : ${link}` : '', "L'équipe Communeo"].filter(Boolean).join('\n\n'),
    });
  } catch (error) {
    log.error(`[INSCRIPTION] E-mail « ${subject} » non envoyé à ${request.email} :`, error);
  }
}

/**
 * Inscription approuvée (par la mairie ou l'équipe) : le site peut être mis en ligne. Les
 * modifications faites pendant l'attente partent aussitôt si la mise en ligne automatique est active.
 */
export async function approveSignup(request: any, by: 'townhall' | 'team', reviewer?: string) {
  const site: any = await strapi.db.query(SITE).findOne({ where: { id: request.site?.id ?? request.site } });
  if (!site) return;
  const now = new Date();
  await strapi.documents(SITE).update({ documentId: site.documentId, data: { signup_approval: null } as any });
  await strapi.db.query(REQUEST).update({
    where: { id: request.id },
    data: { status: 'confirmed', confirmed_at: now, approval_token: null, ...(reviewer ? { reviewed_at: now, reviewed_by: reviewer } : {}) },
  });
  await recordActivity({
    action: 'signup_approve',
    siteDocumentId: site.documentId,
    target: { type: 'site', id: site.documentId, label: site.name },
    details: { by, ...(reviewer ? { reviewer } : {}) },
  });
  await emailRequester(
    request,
    `Le site ${ofCommune(site.name)} peut être mis en ligne — Communeo`,
    [
      by === 'townhall'
        ? `La mairie ${ofCommune(site.name)} a approuvé la création du site depuis son adresse officielle.`
        : `L'équipe Communeo a vérifié votre demande pour ${site.name}.`,
      "Le site peut maintenant être mis en ligne sur son adresse Communeo, avec le bandeau « Site en préparation » pendant l'essai.",
    ],
    { label: 'Ouvrir la mise en ligne', path: '/mise-en-ligne' },
  );
  await notifyTeam(
    `Inscription approuvée : ${site.name}`,
    `${site.name} (INSEE ${site.code_insee ?? '?'}) : inscription approuvée par ${by === 'townhall' ? "la mairie, depuis son adresse officielle" : reviewer ?? "l'équipe"}. Fiche : ${adminUrl()}/plateforme/communes/${site.documentId}`,
  );

  if (site.auto_deploy_enabled && !site.suspended && site.plan !== 'expired' && isBuildQueueConfigured()) {
    try {
      if ((await listPendingChanges(site.documentId)).length) {
        await deploymentService.requestBuild(site.documentId, { triggeredBy: null, reason: 'manual' });
      }
    } catch (error) {
      log.error(`[INSCRIPTION] Mise en ligne de ${site.slug} après approbation impossible :`, error);
    }
  }
}

/**
 * Inscription refusée (la mairie n'en est pas à l'origine, ou l'équipe la refuse) : la commune créée
 * pendant l'attente est supprimée, avec ses comptes et ses contenus ; le demandeur est prévenu.
 */
export async function declineSignup(request: any, by: 'townhall' | 'team', options: { reason?: string; reviewer?: string } = {}) {
  const site: any = request.site ? await strapi.db.query(SITE).findOne({ where: { id: request.site?.id ?? request.site } }) : null;
  const now = new Date();
  await strapi.db.query(REQUEST).update({
    where: { id: request.id },
    data: {
      status: 'rejected',
      approval_token: null,
      token: null,
      site: null,
      reviewed_at: now,
      reviewed_by: options.reviewer ?? (by === 'townhall' ? 'mairie' : null),
      ...(options.reason ? { rejection_reason: options.reason } : {}),
    },
  });
  await recordActivity({
    action: 'signup_reject',
    siteDocumentId: null,
    target: { type: 'signup-request', id: request.id, label: request.commune_name },
    details: { email: request.email, by, ...(options.reason ? { reason: options.reason } : {}) },
  });
  if (site) {
    await recordActivity({
      action: 'commune_delete',
      siteDocumentId: null,
      target: { type: 'site', id: site.documentId, label: site.name },
      details: { reason: 'signup_rejected' },
    });
    await deleteCommune(site.documentId);
  }
  await notifyTeam(
    `Inscription refusée : ${request.commune_name}`,
    `${request.first_name} ${request.last_name} (${request.email}) pour ${request.commune_name} (INSEE ${request.code_insee}) : refusée par ${by === 'townhall' ? "la mairie, depuis son adresse officielle" : options.reviewer ?? "l'équipe"}.${site ? ' La commune et ses contenus ont été supprimés.' : ''}`,
  );
}

/** Refus envoyé au demandeur ; `false` si l'e-mail n'est pas parti */
export async function emailRejection(request: any, paragraphs: string[]): Promise<boolean> {
  try {
    await strapi.plugin('email').service('email').send({
      to: request.email,
      subject: `Votre demande de site pour ${request.commune_name} — Communeo`,
      html: [`<p>Bonjour ${escapeHtml(request.first_name)},</p>`, ...paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`), `<p>L'équipe Communeo</p>`].join('\n'),
      text: [`Bonjour ${request.first_name},`, ...paragraphs, "L'équipe Communeo"].join('\n\n'),
    });
    return true;
  } catch (error) {
    log.error('[INSCRIPTION] Refus non envoyé au demandeur :', error);
    return false;
  }
}
