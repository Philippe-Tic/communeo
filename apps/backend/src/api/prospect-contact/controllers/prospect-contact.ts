/**
 * Formulaire de contact du site de Communeo (communeo.fr, #315) : le message part par e-mail à l'équipe
 * (`SIGNUP_NOTIFY_EMAIL`), avec l'adresse de l'expéditeur en réponse. Rien n'est enregistré dans la base.
 * Un champ piège (`site_web`, caché aux personnes) écarte les robots sans le leur dire.
 */
import { createRateLimiter, escapeHtml } from '../../../utils/security';
import { log } from '../../../utils/logger';

const limited = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5 });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELDS = { nom: 120, fonction: 120, commune: 120, email: 200, message: 5000 } as const;
type Field = keyof typeof FIELDS;

export default {
  async send(ctx) {
    const body = (ctx.request.body ?? {}) as Record<string, unknown>;
    if (typeof body.site_web === 'string' && body.site_web.trim()) {
      ctx.status = 202;
      ctx.body = { data: { status: 'sent' } };
      return;
    }
    if (limited(`prospect:${ctx.request.ip}`)) return ctx.tooManyRequests('Plusieurs messages ont déjà été envoyés : réessayez dans une heure ou écrivez à contact@communeo.fr.');

    const values = {} as Record<Field, string>;
    for (const [field, max] of Object.entries(FIELDS) as Array<[Field, number]>) {
      const value = typeof body[field] === 'string' ? (body[field] as string).trim() : '';
      if (!value || value.length > max) return ctx.badRequest(`Champ « ${field} » manquant ou trop long.`);
      values[field] = value;
    }
    if (!EMAIL.test(values.email)) return ctx.badRequest('Adresse e-mail invalide.');
    if (body.consent !== true) return ctx.badRequest('Le consentement est nécessaire pour répondre.');

    const to = process.env.SIGNUP_NOTIFY_EMAIL;
    if (!to) {
      log.error('[CONTACT] SIGNUP_NOTIFY_EMAIL non défini : message du site non transmis');
      return ctx.serviceUnavailable('Le formulaire est indisponible : écrivez à contact@communeo.fr.');
    }
    const lines = [`${values.nom} (${values.fonction}), ${values.commune}`, values.email, '', values.message];
    try {
      await strapi.plugin('email').service('email').send({
        to,
        replyTo: values.email,
        subject: `Message du site : ${values.commune} (${values.nom})`,
        text: lines.join('\n'),
        html: `<p><strong>${escapeHtml(values.nom)}</strong> (${escapeHtml(values.fonction)}), ${escapeHtml(values.commune)}<br>${escapeHtml(values.email)}</p><p style="white-space:pre-wrap">${escapeHtml(values.message)}</p>`,
      });
    } catch (error) {
      log.error('[CONTACT] Message du site non envoyé :', error);
      ctx.status = 502;
      ctx.body = { data: null, error: { status: 502, name: 'BadGatewayError', message: 'Le message n’a pas pu partir : réessayez dans quelques minutes ou écrivez à contact@communeo.fr.' } };
      return;
    }
    ctx.status = 202;
    ctx.body = { data: { status: 'sent' } };
  },
};
