/**
 * Approbation d'une inscription en libre-service (#337).
 *
 * La personne qui s'inscrit vérifie d'abord sa propre adresse : la commune est alors créée en essai
 * et elle travaille tout de suite dans l'administration. Tant que la mairie (depuis son adresse
 * officielle) ou l'équipe Communeo (sans adresse officielle connue) n'a pas approuvé,
 * `site.signup_approval` vaut `townhall` ou `team`. Le site d'essai est publié quand même sur son
 * adresse Communeo (#369), avec les garde-fous de l'essai : bandeau « Site en préparation », jamais
 * indexé, pas de domaine personnalisé, pas de passage en live sans l'équipe. Refusée, la demande
 * supprime la commune et retire son site de l'hébergeur.
 */
import { ofCommune } from '@communeo/core';
import { recordActivity } from './activity-log';
import { deleteCommune } from './commune-deletion';
import { adminUrl, notifyTeam } from './team-notifications';
import { log } from '../utils/logger';
import { escapeHtml } from '../utils/security';

const REQUEST = 'api::signup-request.signup-request';
const SITE = 'api::site.site';

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
      <p>Ce message est envoyé à l'adresse officielle de la mairie, connue de l'Annuaire de l'administration, pour vérifier que la demande vient bien de la commune. En attendant votre réponse, le site d'essai est visible sur son adresse Communeo, avec un bandeau « Site en préparation », sans être proposé aux moteurs de recherche.</p>
      <p>${button(link, 'Répondre à la demande')}</p>
      <p>Sur la page qui s'ouvre, vous pourrez approuver la demande, ou la refuser si la mairie n'en est pas à l'origine : le site sera alors retiré et ses contenus supprimés. Ce lien est valable 7 jours.</p>
    `,
    text: `${request.first_name} ${request.last_name} (${request.email}) a créé le site internet ${ofName} sur Communeo. En attendant votre réponse, le site d'essai est visible sur son adresse Communeo, avec un bandeau « Site en préparation ». Pour approuver la demande, ou la refuser (le site sera alors retiré et ses contenus supprimés), lien valable 7 jours : ${link}`,
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
 * Inscription approuvée (par la mairie ou l'équipe) : l'essai continue. Le site d'essai, déjà publié
 * pendant l'attente (#369), n'a rien à reconstruire.
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
    `Création du site ${ofCommune(site.name)} approuvée — Communeo`,
    [
      by === 'townhall'
        ? `La mairie ${ofCommune(site.name)} a approuvé la création du site depuis son adresse officielle.`
        : `L'équipe Communeo a vérifié votre demande pour ${site.name}.`,
      "Votre essai continue : le site reste en ligne sur son adresse Communeo, avec le bandeau « Site en préparation ». Pour le garder au-delà de l'essai, validez votre devis depuis l'administration.",
    ],
    { label: 'Passer en live', path: '/passer-en-live' },
  );
  await notifyTeam(
    `Inscription approuvée : ${site.name}`,
    `${site.name} (INSEE ${site.code_insee ?? '?'}) : inscription approuvée par ${by === 'townhall' ? "la mairie, depuis son adresse officielle" : reviewer ?? "l'équipe"}. Fiche : ${adminUrl()}/plateforme/communes/${site.documentId}`,
  );
}

/**
 * Inscription refusée (la mairie n'en est pas à l'origine, ou l'équipe la refuse) : la commune créée
 * pendant l'attente est supprimée, avec ses comptes, ses contenus et son site d'essai chez
 * l'hébergeur (`deleteCommune`) ; le demandeur est prévenu.
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
    `${request.first_name} ${request.last_name} (${request.email}) pour ${request.commune_name} (INSEE ${request.code_insee}) : refusée par ${by === 'townhall' ? "la mairie, depuis son adresse officielle" : options.reviewer ?? "l'équipe"}.${site ? " La commune, ses contenus et son site d'essai ont été supprimés." : ''}`,
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
