/**
 * Inscription d'une mairie en libre-service (#309, #337).
 *
 * GET  /api/signup/communes?q=   → communes (nom ou code postal), `taken` si déjà sur Communeo
 * POST /api/signup               → { insee, first_name, last_name, email, terms, website (piège) }
 *   Le lien de confirmation part à l'adresse **saisie** : { status: 'sent', to }.
 * GET  /api/signup/confirm?jeton= → la demande à confirmer (commune, demandeur)
 * POST /api/signup/confirm        → { jeton } : adresse vérifiée ; crée la commune en essai et son
 *   administrateur, renvoie l'invitation (choix du mot de passe) et qui doit encore approuver :
 *   personne si l'adresse est celle de la mairie ou de son domaine, sinon la mairie (e-mail à son
 *   adresse officielle, Annuaire de l'administration) ou l'équipe (aucune adresse officielle connue).
 *   En attendant, le site d'essai est publié sur son adresse Communeo (#369).
 * GET  /api/signup/approve?jeton= → la demande, pour la mairie
 * POST /api/signup/approve        → { jeton } : la mairie approuve, l'essai continue
 * POST /api/signup/decline        → { jeton } : la mairie refuse, la commune créée et son site d'essai sont supprimés
 * GET  /api/signup/approval       → (administration) { status: 'townhall' | 'team' | null, to, sentAt }
 * POST /api/signup/approval/resend → (administrateur) renvoie l'e-mail d'approbation à la mairie
 *
 * Les liens des e-mails n'agissent qu'au clic sur la page (les antivirus de messagerie les ouvrent).
 */
import { ofCommune, signupApproval } from '@communeo/core';
import { recordActivity } from '../../../services/activity-log';
import { adminUrl, notifyTeam } from '../../../services/team-notifications';
import { createCommune, emailTaken } from '../../../services/commune-creation';
import { communeDetails, PublicDataUnavailable, searchCommunes } from '../../../services/public-data';
import { approveSignup, declineSignup, emailRejection, maskEmail, sendApprovalEmail } from '../../../services/signup-approval';
import { isTestAddress } from '../../../utils/test-signup';
import { getEffectiveSite, hasRole } from '../../../utils/getEffectiveSite';
import { log } from '../../../utils/logger';
import { createInvitationToken, createRateLimiter, escapeHtml, lookupInvitationToken } from '../../../utils/security';

export { maskEmail };

const REQUEST = 'api::signup-request.signup-request';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INSEE = /^[0-9][0-9AB][0-9]{3}$/;

const searchLimited = createRateLimiter({ windowMs: 60 * 1000, max: 30 });
const requestLimited = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 10 });
// Une boîte ne reçoit pas plus de 3 liens par jour (celle du demandeur comme celle de la mairie)
const mailboxLimited = createRateLimiter({ windowMs: 24 * 60 * 60 * 1000, max: 3 });
const confirmLimited = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });

const TOO_MANY = 'Trop de demandes : réessayez dans quelques minutes.';
const EXPIRED = 'Ce lien a expiré : refaites la demande depuis la page d’inscription.';
const APPROVAL_EXPIRED = 'Ce lien a expiré : la personne qui a créé le site peut renvoyer la demande depuis son administration.';
const INVALID = 'Ce lien n’est pas valable ou a déjà été utilisé.';
const TAKEN = 'Cette commune a déjà un site Communeo : demandez à son administrateur de vous inviter.';

const unavailable = (ctx) => {
  ctx.status = 502;
  ctx.body = { data: null, error: { status: 502, name: 'BadGatewayError', message: 'Les données publiques ne répondent pas : réessayez dans quelques minutes.' } };
};

async function communeTaken(insee: string) {
  return (await strapi.query('api::site.site').count({ where: { code_insee: insee } })) > 0;
}

async function sendConfirmationEmail(request: any, token: string) {
  const link = `${adminUrl()}/inscription/confirmer?jeton=${token}`;
  const ofName = ofCommune(request.commune_name);
  const commune = escapeHtml(request.commune_name);
  await strapi.plugin('email').service('email').send({
    to: request.email,
    subject: `Confirmez votre adresse pour créer le site ${ofName} — Communeo`,
    html: `
      <h2>Créer le site internet ${escapeHtml(ofName)}</h2>
      <p>Bonjour ${escapeHtml(request.first_name)},</p>
      <p>Pour créer le site internet de la commune <strong>${commune}</strong> sur Communeo, confirmez votre adresse e-mail :</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 24px;background-color:#004643;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Confirmer mon adresse</a></p>
      <p>Ce lien est valable 7 jours. Vous choisirez ensuite votre mot de passe et commencerez vos 30 jours d'essai gratuit.</p>
      <p>Si vous n'avez rien demandé, ignorez ce message : rien ne sera créé.</p>
    `,
    text: `Bonjour ${request.first_name}, pour créer le site internet ${ofName} sur Communeo, confirmez votre adresse (lien valable 7 jours) : ${link}. Si vous n'avez rien demandé, ignorez ce message.`,
  });
}

/** Demande à l'étape `status` d'après le jeton `field` du lien ; répond et renvoie null sinon */
async function requestFromLink(ctx, token: unknown, field: 'token' | 'approval_token', status: string, expiredMessage: string) {
  const lookup = lookupInvitationToken(token);
  if (!lookup) {
    ctx.badRequest(INVALID);
    return null;
  }
  const request = await strapi.db.query(REQUEST).findOne({ where: { [field]: lookup.stored, status }, populate: ['site'] });
  if (!request) {
    ctx.badRequest(INVALID);
    return null;
  }
  if (lookup.expired) {
    ctx.status = 410;
    ctx.body = { data: null, error: { status: 410, name: 'GoneError', message: expiredMessage } };
    return null;
  }
  return request;
}

const pendingEmail = (ctx, token: unknown) => requestFromLink(ctx, token, 'token', 'pending_email', EXPIRED);
const pendingTownHall = (ctx, token: unknown) => requestFromLink(ctx, token, 'approval_token', 'pending_townhall', APPROVAL_EXPIRED);

const requestSummary = (request: any) => ({ commune: request.commune_name, firstName: request.first_name, lastName: request.last_name, email: request.email });

/** Commune de l'utilisateur connecté, tous champs (l'équipe qui consulte une commune n'en a que l'identifiant) */
async function currentSite(ctx) {
  const site = await getEffectiveSite(ctx);
  return site ? strapi.db.query('api::site.site').findOne({ where: { documentId: site.documentId } }) : null;
}

/** Demande d'approbation de la commune de l'utilisateur connecté (commune en attente) */
async function approvalRequestOf(site: any) {
  return strapi.db.query(REQUEST).findOne({ where: { site: { documentId: site.documentId }, status: { $in: ['pending_townhall', 'awaiting_review'] } } });
}

export default {
  async communes(ctx) {
    if (searchLimited(`search:${ctx.request.ip}`)) return ctx.tooManyRequests(TOO_MANY);
    const query = String(ctx.query.q ?? '').trim();
    if (query.length < 2) {
      ctx.body = { data: [] };
      return;
    }
    try {
      const communes = await searchCommunes(query);
      const codes = communes.map((commune) => commune.insee);
      const sites = codes.length ? await strapi.db.query('api::site.site').findMany({ where: { code_insee: { $in: codes } }, select: ['code_insee'] }) : [];
      const taken = new Set(sites.map((site: any) => site.code_insee));
      ctx.body = { data: communes.map((commune) => ({ ...commune, taken: taken.has(commune.insee) })) };
    } catch (error) {
      if (error instanceof PublicDataUnavailable) return unavailable(ctx);
      throw error;
    }
  },

  async request(ctx) {
    const body = (ctx.request.body ?? {}) as Record<string, unknown>;
    const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
    const insee = text(body.insee).toUpperCase();
    const firstName = text(body.first_name);
    const lastName = text(body.last_name);
    const email = text(body.email).toLowerCase();

    // Piège à robots : réponse identique à une demande envoyée, rien n'est créé
    if (text(body.website)) {
      ctx.status = 202;
      ctx.body = { data: { status: 'sent', to: email } };
      return;
    }
    if (requestLimited(`signup:${ctx.request.ip}`)) return ctx.tooManyRequests(TOO_MANY);
    if (!INSEE.test(insee) || !firstName || !lastName || !EMAIL.test(email)) {
      return ctx.badRequest('Commune, prénom, nom et e-mail sont obligatoires.');
    }
    if (body.terms !== true) return ctx.badRequest('Acceptez les conditions d’utilisation pour continuer.');

    let details;
    try {
      details = await communeDetails(insee);
    } catch (error) {
      if (error instanceof PublicDataUnavailable) return unavailable(ctx);
      throw error;
    }
    if (!details) return ctx.badRequest('Commune introuvable.');
    if (await communeTaken(insee)) return ctx.conflict(TAKEN);
    if (await emailTaken(email)) return ctx.conflict('Un compte existe déjà avec cet e-mail : connectez-vous.');
    if (mailboxLimited(`mailbox:${email}`)) return ctx.tooManyRequests('Plusieurs liens ont déjà été envoyés à cette adresse aujourd’hui : vérifiez votre boîte de réception.');

    // Une nouvelle demande pour la même commune remplace celles dont l'adresse n'est pas encore vérifiée
    await strapi.db.query(REQUEST).deleteMany({ where: { code_insee: insee, status: { $in: ['pending_email', 'pending_confirmation'] } } });

    const { token, stored } = createInvitationToken();
    const request = await strapi.db.query(REQUEST).create({
      data: {
        code_insee: insee,
        commune_name: details.name,
        first_name: firstName,
        last_name: lastName,
        email,
        // Inscription de test de l'équipe : jamais l'adresse de la vraie mairie (l'équipe approuve)
        official_email: isTestAddress(email) ? null : details.townHall?.email?.trim().toLowerCase() || null,
        terms_accepted_at: new Date(),
        status: 'pending_email',
        token: stored,
      },
    });
    try {
      await sendConfirmationEmail(request, token);
    } catch (error) {
      log.error('[INSCRIPTION] E-mail de confirmation non envoyé :', error);
      await strapi.db.query(REQUEST).delete({ where: { id: request.id } });
      ctx.status = 502;
      ctx.body = { data: null, error: { status: 502, name: 'BadGatewayError', message: 'L’e-mail de confirmation n’a pas pu partir : réessayez dans quelques minutes.' } };
      return;
    }
    ctx.status = 202;
    ctx.body = { data: { status: 'sent', to: email } };
  },

  async confirmInfo(ctx) {
    if (confirmLimited(`confirm:${ctx.request.ip}`)) return ctx.tooManyRequests(TOO_MANY);
    const request = await pendingEmail(ctx, ctx.query.jeton);
    if (!request) return;
    ctx.body = { data: requestSummary(request) };
  },

  async confirm(ctx) {
    if (confirmLimited(`confirm:${ctx.request.ip}`)) return ctx.tooManyRequests(TOO_MANY);
    const request = await pendingEmail(ctx, (ctx.request.body ?? {}).jeton);
    if (!request) return;
    // Entre la demande et la confirmation, la commune ou le compte ont pu être créés autrement
    if (await communeTaken(request.code_insee)) return ctx.conflict(TAKEN);
    if (await emailTaken(request.email)) return ctx.conflict('Un compte existe déjà avec cet e-mail : connectez-vous.');

    const approval = signupApproval(request.email, request.official_email);
    const waitingFor = approval === 'townhall' || approval === 'team' ? approval : null;
    const { site, invitationToken } = await createCommune({
      name: request.commune_name,
      codeInsee: request.code_insee,
      contactMail: request.official_email ?? request.email,
      admin: { email: request.email, firstName: request.first_name, lastName: request.last_name },
      trial: true,
      awaitingApproval: waitingFor,
    });
    const now = new Date();
    const approvalLink = waitingFor === 'townhall' ? createInvitationToken() : null;
    await strapi.db.query(REQUEST).update({
      where: { id: request.id },
      data: {
        status: waitingFor === 'townhall' ? 'pending_townhall' : waitingFor === 'team' ? 'awaiting_review' : 'confirmed',
        approval,
        email_confirmed_at: now,
        ...(waitingFor ? {} : { confirmed_at: now }),
        token: null,
        approval_token: approvalLink?.stored ?? null,
        site: site.id,
      },
    });
    await recordActivity({
      action: 'commune_create',
      siteDocumentId: site.documentId,
      target: { type: 'site', id: site.documentId, label: request.commune_name },
      details: { admin: request.email, signup: true, approval },
    });

    if (approvalLink) {
      try {
        await sendApprovalEmail({ ...request, id: request.id }, approvalLink.token);
      } catch (error) {
        // La commune existe : le demandeur renvoie la demande depuis son administration
        log.error('[INSCRIPTION] Demande d’approbation non envoyée à la mairie :', error);
      }
    }
    const fiche = `${adminUrl()}/plateforme/communes/${site.documentId}`;
    const who = `${request.first_name} ${request.last_name} (${request.email})`;
    if (waitingFor === 'team' && isTestAddress(request.email)) {
      await notifyTeam(
        `Inscription de test : ${request.commune_name}`,
        `${who} a créé le site de test ${ofCommune(request.commune_name)} (INSEE ${request.code_insee}), adresse de test (SIGNUP_TEST_EMAILS) : aucune demande n'est partie à la mairie. Le site d'essai est publié ; approuvez ou refusez la demande dans l'espace équipe : ${adminUrl()}/plateforme/a-valider`,
      );
    } else if (waitingFor === 'team') {
      await notifyTeam(
        `Inscription à vérifier : ${request.commune_name}`,
        `${who} a créé le site ${ofCommune(request.commune_name)} (INSEE ${request.code_insee}). Aucune adresse officielle de mairie n'est connue : le site d'essai est publié, vérifiez la demande dans l'espace équipe (un refus le retire) : ${adminUrl()}/plateforme/a-valider`,
      );
    } else {
      await notifyTeam(
        `Nouvelle commune en essai : ${request.commune_name}`,
        waitingFor === 'townhall'
          ? `${request.commune_name} (INSEE ${request.code_insee}) est en essai. Administrateur : ${who}. La demande d'approbation est partie à l'adresse officielle de la mairie ; le site d'essai est publié en attendant sa réponse. Fiche : ${fiche}`
          : `${request.commune_name} (INSEE ${request.code_insee}) est en essai. Administrateur : ${who}, inscrit avec ${approval === 'same_email' ? "l'adresse officielle de la mairie" : "une adresse du domaine de la mairie"}. Fiche : ${fiche}`,
      );
    }
    ctx.body = { data: { invitation: invitationToken, approval: waitingFor } };
  },

  async approveInfo(ctx) {
    if (confirmLimited(`confirm:${ctx.request.ip}`)) return ctx.tooManyRequests(TOO_MANY);
    const request = await pendingTownHall(ctx, ctx.query.jeton);
    if (!request) return;
    ctx.body = { data: requestSummary(request) };
  },

  async approve(ctx) {
    if (confirmLimited(`confirm:${ctx.request.ip}`)) return ctx.tooManyRequests(TOO_MANY);
    const request = await pendingTownHall(ctx, (ctx.request.body ?? {}).jeton);
    if (!request) return;
    await approveSignup(request, 'townhall');
    ctx.body = { data: { commune: request.commune_name } };
  },

  async decline(ctx) {
    if (confirmLimited(`confirm:${ctx.request.ip}`)) return ctx.tooManyRequests(TOO_MANY);
    const request = await pendingTownHall(ctx, (ctx.request.body ?? {}).jeton);
    if (!request) return;
    await declineSignup(request, 'townhall');
    await emailRejection(request, [
      `La mairie ${ofCommune(request.commune_name)} n'a pas approuvé la création du site internet de la commune sur Communeo : le site d'essai a été retiré et ses contenus supprimés.`,
      "Si c'est une erreur, rapprochez-vous de la mairie avant de refaire la demande.",
    ]);
    ctx.body = { data: { commune: request.commune_name } };
  },

  async approvalState(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Authentification requise');
    const site: any = await currentSite(ctx);
    if (!site) return ctx.badRequest('Utilisateur sans site assigné');
    const request: any = site.signup_approval ? await approvalRequestOf(site) : null;
    ctx.body = {
      data: {
        status: site.signup_approval ?? null,
        to: site.signup_approval === 'townhall' && request?.official_email ? maskEmail(request.official_email) : null,
        sentAt: request?.approval_sent_at ?? null,
      },
    };
  },

  async resendApproval(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Authentification requise');
    if (!hasRole(ctx, ['admin', 'super_admin'])) return ctx.forbidden('Réservé aux administrateurs');
    const site: any = await currentSite(ctx);
    if (!site) return ctx.badRequest('Utilisateur sans site assigné');
    const request: any = site.signup_approval === 'townhall' ? await approvalRequestOf(site) : null;
    if (!request?.official_email) return ctx.badRequest('Aucune demande d’approbation n’attend la mairie.');
    if (mailboxLimited(`mailbox:${request.official_email}`)) {
      return ctx.tooManyRequests('La demande a déjà été envoyée plusieurs fois aujourd’hui : réessayez demain, ou contactez la mairie.');
    }
    const { token, stored } = createInvitationToken();
    await strapi.db.query(REQUEST).update({ where: { id: request.id }, data: { approval_token: stored } });
    try {
      await sendApprovalEmail(request, token);
    } catch (error) {
      log.error('[INSCRIPTION] Demande d’approbation non renvoyée :', error);
      ctx.status = 502;
      ctx.body = { data: null, error: { status: 502, name: 'BadGatewayError', message: 'L’e-mail n’a pas pu partir : réessayez dans quelques minutes.' } };
      return;
    }
    ctx.body = { data: { to: maskEmail(request.official_email), sentAt: new Date().toISOString() } };
  },
};
