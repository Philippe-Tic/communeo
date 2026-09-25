/**
 * File de validation de l'équipe Communeo (#313), réservée aux super admins.
 *
 * GET  /api/validations → { signups, liveRequests }
 *   - inscriptions à vérifier : commune sans adresse officielle dans l'Annuaire (la confirmation n'a
 *     pas pu partir à la mairie) ;
 *   - passages en live demandés : devis validé en ligne par la commune (#312), joint à la demande.
 * POST /api/validations/signups/:id/approve → crée la commune en essai et invite le demandeur
 * POST /api/validations/signups/:id/reject  → { reason } envoyé au demandeur
 * POST /api/validations/live/:documentId/approve → passage en live (services/trial.ts), devis accepté
 * POST /api/validations/live/:documentId/reject  → { reason } envoyé aux administrateurs, devis refusé
 *
 * Aucune commune ne passe en live sans l'équipe : ici, ou depuis sa fiche (PUT /api/site-management).
 */
import { recordActivity } from '../../../services/activity-log';
import { createCommune, emailTaken } from '../../../services/commune-creation';
import { goLive, rejectGoLive } from '../../../services/trial';
import { log } from '../../../utils/logger';
import { escapeHtml } from '../../../utils/security';
import { sendInvitationEmail } from '../../user-management/controllers/user-management';

const REQUEST = 'api::signup-request.signup-request';
const SITE = 'api::site.site';
const MAX_REASON = 2000;

async function requireSuperAdmin(ctx) {
  const user = ctx.state.user;
  if (!user) ctx.throw(401, 'Not authenticated');
  const full = await strapi.query('plugin::users-permissions.user').findOne({ where: { id: user.id } });
  if (full?.municipality_role !== 'super_admin') ctx.throw(403, 'Super admin access required');
  return full;
}

/** Devis validé qui accompagne la demande (#312) */
async function signedQuote(siteDocumentId: string) {
  const quote: any = await strapi.db.query('api::quote.quote').findOne({ where: { site: { documentId: siteDocumentId }, status: 'signed' }, orderBy: { signed_at: 'desc' } });
  return quote
    ? {
        documentId: quote.documentId,
        number: quote.number,
        amountHT: Number(quote.amount_ht),
        tierLabel: quote.tier_label,
        signatory: `${quote.signatory_name}, ${quote.signatory_role}`,
        signedAt: quote.signed_at,
      }
    : null;
}

const nameOf = (user: any) => [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;

/** Motif obligatoire : il est envoyé par e-mail */
function reasonOf(ctx): string | null {
  const reason = String(ctx.request.body?.reason ?? '').trim();
  if (!reason) {
    ctx.badRequest('Écrivez le motif : il est envoyé par e-mail.');
    return null;
  }
  if (reason.length > MAX_REASON) {
    ctx.badRequest('Le motif ne doit pas dépasser 2 000 caractères.');
    return null;
  }
  return reason;
}

async function pendingSignup(ctx) {
  const request = await strapi.db.query(REQUEST).findOne({ where: { id: Number(ctx.params.id), status: 'awaiting_review' } });
  if (!request) ctx.notFound('Demande introuvable ou déjà traitée');
  return request;
}

async function liveRequest(ctx) {
  const site = await strapi.db.query(SITE).findOne({ where: { documentId: ctx.params.documentId } });
  if (!site || !site.live_requested_at || (site.plan ?? 'live') === 'live') {
    ctx.notFound('Demande introuvable ou déjà traitée');
    return null;
  }
  return site;
}

export default {
  async list(ctx) {
    await requireSuperAdmin(ctx);
    const [signups, sites] = await Promise.all([
      strapi.db.query(REQUEST).findMany({ where: { status: 'awaiting_review' }, orderBy: { createdAt: 'asc' } }),
      strapi.db.query(SITE).findMany({ where: { live_requested_at: { $notNull: true }, plan: { $in: ['trial', 'expired'] } }, orderBy: { live_requested_at: 'asc' } }),
    ]);
    ctx.body = {
      data: {
        signups: signups.map((request: any) => ({
          id: request.id,
          communeName: request.commune_name,
          insee: request.code_insee,
          firstName: request.first_name,
          lastName: request.last_name,
          email: request.email,
          requestedAt: request.createdAt,
        })),
        liveRequests: await Promise.all(sites.map(async (site: any) => ({
          quote: await signedQuote(site.documentId),
          documentId: site.documentId,
          name: site.name,
          insee: site.code_insee ?? null,
          plan: site.plan,
          trialEndsAt: site.trial_ends_at ?? null,
          trialExpiredAt: site.trial_expired_at ?? null,
          requestedAt: site.live_requested_at,
          requestedBy: site.live_requested_by ?? null,
        }))),
      },
    };
  },

  async approveSignup(ctx) {
    const reviewer = await requireSuperAdmin(ctx);
    const request = await pendingSignup(ctx);
    if (!request) return;
    if (await strapi.query(SITE).count({ where: { code_insee: request.code_insee } })) {
      return ctx.conflict('Cette commune a déjà un site Communeo : refusez la demande.');
    }
    if (await emailTaken(request.email)) return ctx.conflict('Un compte existe déjà avec cet e-mail : refusez la demande.');

    const { site, invitationToken } = await createCommune({
      name: request.commune_name,
      codeInsee: request.code_insee,
      contactMail: request.email,
      admin: { email: request.email, firstName: request.first_name, lastName: request.last_name },
      trial: true,
    });
    await strapi.db.query(REQUEST).update({
      where: { id: request.id },
      data: { status: 'confirmed', confirmed_at: new Date(), reviewed_at: new Date(), reviewed_by: nameOf(reviewer), site: site.id },
    });
    await recordActivity({
      action: 'commune_create',
      siteDocumentId: site.documentId,
      target: { type: 'site', id: site.documentId, label: request.commune_name },
      details: { admin: request.email, signup: true, reviewed: true },
    });
    try {
      await sendInvitationEmail(request.email, request.first_name, invitationToken, request.commune_name);
    } catch (error) {
      // La commune existe : l'équipe renvoie l'invitation depuis sa fiche
      log.error('[VALIDATION] Invitation non envoyée :', error);
    }
    ctx.body = { data: { documentId: site.documentId } };
  },

  async rejectSignup(ctx) {
    const reviewer = await requireSuperAdmin(ctx);
    const request = await pendingSignup(ctx);
    if (!request) return;
    const reason = reasonOf(ctx);
    if (!reason) return;
    await strapi.db.query(REQUEST).update({
      where: { id: request.id },
      data: { status: 'rejected', reviewed_at: new Date(), reviewed_by: nameOf(reviewer), rejection_reason: reason },
    });
    await recordActivity({
      action: 'signup_reject',
      siteDocumentId: null,
      target: { type: 'signup-request', id: request.id, label: request.commune_name },
      details: { email: request.email, reason },
    });
    try {
      await strapi.plugin('email').service('email').send({
        to: request.email,
        subject: `Votre demande de site pour ${request.commune_name} — Communeo`,
        html: `
          <p>Bonjour ${escapeHtml(request.first_name)},</p>
          <p>L'équipe Communeo n'a pas pu valider la création du site de <strong>${escapeHtml(request.commune_name)}</strong> :</p>
          <p>${escapeHtml(reason)}</p>
          <p>L'équipe Communeo</p>
        `,
        text: `Bonjour ${request.first_name}, l'équipe Communeo n'a pas pu valider la création du site de ${request.commune_name} : ${reason}`,
      });
    } catch (error) {
      log.error('[VALIDATION] Motif de refus non envoyé :', error);
      ctx.body = { data: { emailed: false } };
      return;
    }
    ctx.body = { data: { emailed: true } };
  },

  async approveLive(ctx) {
    await requireSuperAdmin(ctx);
    const site = await liveRequest(ctx);
    if (!site) return;
    await goLive(site);
    ctx.body = { data: { documentId: site.documentId } };
  },

  async rejectLive(ctx) {
    await requireSuperAdmin(ctx);
    const site = await liveRequest(ctx);
    if (!site) return;
    const reason = reasonOf(ctx);
    if (!reason) return;
    await rejectGoLive(site, reason);
    ctx.body = { data: { documentId: site.documentId } };
  },
};
