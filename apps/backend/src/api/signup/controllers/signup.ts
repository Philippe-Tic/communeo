/**
 * Inscription d'une mairie en libre-service (#309).
 *
 * GET  /api/signup/communes?q=   → communes (nom ou code postal), `taken` si déjà sur Communeo
 * POST /api/signup               → { insee, first_name, last_name, email, terms, website (piège) }
 *   La confirmation part à l'adresse **officielle** de la mairie (Annuaire de l'administration), pas à
 *   l'adresse saisie : { status: 'sent', to: 'm***@…' }. Sans adresse officielle connue, la demande
 *   attend la vérification de l'équipe : { status: 'review' }.
 * GET  /api/signup/confirm?jeton= → la demande à confirmer (commune, demandeur)
 * POST /api/signup/confirm        → { jeton } : crée la commune et son administrateur, renvoie
 *   l'invitation qui mène au choix du mot de passe puis à l'assistant de démarrage.
 */
import { recordActivity } from '../../../services/activity-log';
import { adminUrl, notifyTeam } from '../../../services/team-notifications';
import { createCommune, emailTaken } from '../../../services/commune-creation';
import { communeDetails, PublicDataUnavailable, searchCommunes } from '../../../services/public-data';
import { log } from '../../../utils/logger';
import { createInvitationToken, createRateLimiter, escapeHtml, lookupInvitationToken } from '../../../utils/security';

const REQUEST = 'api::signup-request.signup-request';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INSEE = /^[0-9][0-9AB][0-9]{3}$/;

const searchLimited = createRateLimiter({ windowMs: 60 * 1000, max: 30 });
const requestLimited = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 10 });
// Une boîte de mairie ne reçoit pas plus de 3 demandes de confirmation par jour
const mailboxLimited = createRateLimiter({ windowMs: 24 * 60 * 60 * 1000, max: 3 });
const confirmLimited = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });

const TOO_MANY = 'Trop de demandes : réessayez dans quelques minutes.';
const EXPIRED = 'Ce lien a expiré : refaites la demande depuis la page d’inscription.';
const INVALID = 'Ce lien n’est pas valable ou a déjà été utilisé.';

/** « m***@saint-aubin.fr » : assez pour reconnaître la boîte, sans l'exposer */
export const maskEmail = (email: string) => {
  const [local, domain] = email.split('@');
  return `${local!.charAt(0)}***@${domain}`;
};

const unavailable = (ctx) => {
  ctx.status = 502;
  ctx.body = { data: null, error: { status: 502, name: 'BadGatewayError', message: 'Les données publiques ne répondent pas : réessayez dans quelques minutes.' } };
};

async function communeTaken(insee: string) {
  return (await strapi.query('api::site.site').count({ where: { code_insee: insee } })) > 0;
}

async function sendConfirmationEmail(to: string, request: any, token: string) {
  const link = `${adminUrl()}/inscription/confirmer?jeton=${token}`;
  const commune = escapeHtml(request.commune_name);
  const person = escapeHtml(`${request.first_name} ${request.last_name}`);
  const email = escapeHtml(request.email);
  await strapi.plugin('email').service('email').send({
    to,
    subject: `Création du site internet de ${request.commune_name} — Communeo`,
    html: `
      <h2>Création du site internet de ${commune}</h2>
      <p>Bonjour,</p>
      <p><strong>${person}</strong> (${email}) demande à créer le site internet de la commune <strong>${commune}</strong> sur Communeo.</p>
      <p>Ce message est envoyé à l'adresse officielle de la mairie pour vérifier que la demande vient bien de la commune. Si vous l'approuvez, confirmez-la :</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 24px;background-color:#004643;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Confirmer la création du site</a></p>
      <p>Ce lien est valable 7 jours. ${person} recevra alors l'accès à l'administration, avec 30 jours d'essai gratuit.</p>
      <p>Si la commune n'est pas à l'origine de cette demande, ignorez ce message : rien ne sera créé.</p>
    `,
    text: `${request.first_name} ${request.last_name} (${request.email}) demande à créer le site internet de ${request.commune_name} sur Communeo. Pour confirmer (lien valable 7 jours) : ${link}. Si la commune n'est pas à l'origine de cette demande, ignorez ce message.`,
  });
}

const teamReview = (request: any) =>
  notifyTeam(
    `Inscription à vérifier : ${request.commune_name}`,
    `${request.first_name} ${request.last_name} (${request.email}) demande un site pour ${request.commune_name} (INSEE ${request.code_insee}). Aucune adresse officielle de mairie n'est connue : vérifiez la demande dans l'espace équipe : ${adminUrl()}/plateforme/a-valider`,
  );

/** Demande en attente de confirmation d'après le jeton du lien ; répond et renvoie null sinon */
async function pendingRequest(ctx, token: unknown) {
  const lookup = lookupInvitationToken(token);
  if (!lookup) {
    ctx.badRequest(INVALID);
    return null;
  }
  const request = await strapi.db.query(REQUEST).findOne({ where: { token: lookup.stored, status: 'pending_confirmation' } });
  if (!request) {
    ctx.badRequest(INVALID);
    return null;
  }
  if (lookup.expired) {
    ctx.status = 410;
    ctx.body = { data: null, error: { status: 410, name: 'GoneError', message: EXPIRED } };
    return null;
  }
  return request;
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
      ctx.body = { data: { status: 'review' } };
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
    if (await communeTaken(insee)) {
      return ctx.conflict('Cette commune a déjà un site Communeo : demandez à son administrateur de vous inviter.');
    }
    if (await emailTaken(email)) return ctx.conflict('Un compte existe déjà avec cet e-mail : connectez-vous.');

    // Une nouvelle demande pour la même commune remplace celles qui attendent encore
    await strapi.db.query(REQUEST).deleteMany({ where: { code_insee: insee, status: { $in: ['pending_confirmation', 'awaiting_review'] } } });

    const official = details.townHall?.email?.trim().toLowerCase() || null;
    const base = {
      code_insee: insee,
      commune_name: details.name,
      first_name: firstName,
      last_name: lastName,
      email,
      official_email: official,
      terms_accepted_at: new Date(),
    };

    if (!official) {
      const request = await strapi.db.query(REQUEST).create({ data: { ...base, status: 'awaiting_review' } });
      await teamReview(request);
      ctx.status = 202;
      ctx.body = { data: { status: 'review' } };
      return;
    }

    if (mailboxLimited(`mailbox:${insee}`)) return ctx.tooManyRequests('Plusieurs demandes ont déjà été envoyées à cette mairie aujourd’hui : vérifiez sa boîte de réception.');
    const { token, stored } = createInvitationToken();
    const request = await strapi.db.query(REQUEST).create({ data: { ...base, status: 'pending_confirmation', token: stored } });
    try {
      await sendConfirmationEmail(official, request, token);
    } catch (error) {
      log.error('[INSCRIPTION] E-mail de confirmation non envoyé :', error);
      await strapi.db.query(REQUEST).delete({ where: { id: request.id } });
      ctx.status = 502;
      ctx.body = { data: null, error: { status: 502, name: 'BadGatewayError', message: 'L’e-mail de confirmation n’a pas pu partir : réessayez dans quelques minutes.' } };
      return;
    }
    ctx.status = 202;
    ctx.body = { data: { status: 'sent', to: maskEmail(official) } };
  },

  async confirmInfo(ctx) {
    if (confirmLimited(`confirm:${ctx.request.ip}`)) return ctx.tooManyRequests(TOO_MANY);
    const request = await pendingRequest(ctx, ctx.query.jeton);
    if (!request) return;
    ctx.body = {
      data: { commune: request.commune_name, firstName: request.first_name, lastName: request.last_name, email: request.email },
    };
  },

  async confirm(ctx) {
    if (confirmLimited(`confirm:${ctx.request.ip}`)) return ctx.tooManyRequests(TOO_MANY);
    const request = await pendingRequest(ctx, (ctx.request.body ?? {}).jeton);
    if (!request) return;
    // Entre la demande et la confirmation, la commune ou le compte ont pu être créés autrement
    if (await communeTaken(request.code_insee)) {
      return ctx.conflict('Cette commune a déjà un site Communeo : demandez à son administrateur de vous inviter.');
    }
    if (await emailTaken(request.email)) return ctx.conflict('Un compte existe déjà avec cet e-mail : connectez-vous.');

    const { site, invitationToken } = await createCommune({
      name: request.commune_name,
      codeInsee: request.code_insee,
      contactMail: request.official_email,
      admin: { email: request.email, firstName: request.first_name, lastName: request.last_name },
      trial: true,
    });
    await strapi.db.query(REQUEST).update({
      where: { id: request.id },
      data: { status: 'confirmed', confirmed_at: new Date(), token: null, site: site.id },
    });
    await recordActivity({
      action: 'commune_create',
      siteDocumentId: site.documentId,
      target: { type: 'site', id: site.documentId, label: request.commune_name },
      details: { admin: request.email, signup: true },
    });
    await notifyTeam(
      `Nouvelle commune en essai : ${request.commune_name}`,
      `${request.commune_name} (INSEE ${request.code_insee}) a confirmé son inscription depuis l'adresse officielle de la mairie. Administrateur : ${request.first_name} ${request.last_name} (${request.email}). Fiche : ${adminUrl()}/plateforme/communes/${site.documentId}`,
    );
    ctx.body = { data: { invitation: invitationToken } };
  },
};
