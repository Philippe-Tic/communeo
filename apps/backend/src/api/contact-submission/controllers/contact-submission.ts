/**
 * contact-submission controller
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { factories } from '@strapi/strapi';
import { rgpdDeadline } from '@communeo/core';
import { log } from '../../../utils/logger';
import { createRateLimiter, escapeHtml } from '../../../utils/security';

const UID = 'api::contact-submission.contact-submission';
const REPLY_MAX = 20_000;

/** Événement de l'historique d'un message (écran Messages, #186) */
export interface HistoryEvent {
  type: 'received' | 'acknowledged' | 'opened' | 'replied' | 'status';
  at: string;
  by?: string | null;
  from?: string;
  to?: string;
  attachment?: string;
  /** Texte de la réponse (chaque réponse reste lisible, `response` ne garde que la dernière) */
  message?: string;
}

const actor = (ctx: any) => {
  const user = ctx.state.user;
  return user ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email : null;
};

async function appendHistory(strapi: any, documentId: string, event: HistoryEvent, data: Record<string, unknown> = {}) {
  const current = await strapi.documents(UID).findOne({ documentId, fields: ['history'] });
  const history = Array.isArray(current?.history) ? current.history : [];
  return strapi.documents(UID).update({ documentId, data: { ...data, history: [...history, event] } });
}

const frenchDate = (date: Date) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
const paragraphs = (text: string) => escapeHtml(text).replace(/\n/g, '<br>');

/** Pièce jointe Resend : contenu du fichier (stockage local de Strapi) ou adresse publique */
async function attachmentFor(strapi: any, file: { name: string; url: string }) {
  if (file.url.startsWith('/')) {
    const content = await fs.readFile(path.join(strapi.dirs.static.public, file.url));
    return { filename: file.name, content: content.toString('base64') };
  }
  return { filename: file.name, path: file.url };
}

// 5 envois par tranche de 10 minutes et par IP
const isRateLimited = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 5 });

const VALID_CATEGORIES = ['general', 'urbanisme', 'etat-civil', 'voirie', 'associations', 'rgpd', 'autre'];

export default factories.createCoreController('api::contact-submission.contact-submission', ({ strapi }) => ({
  async publicCreate(ctx) {
    if (isRateLimited(ctx.request.ip)) {
      return ctx.tooManyRequests('Trop de demandes. Veuillez réessayer dans quelques minutes.');
    }

    const { data } = ctx.request.body;

    if (!data) {
      return ctx.badRequest('Missing data');
    }

    const { first_name, last_name, email, subject, message, category, site, phone } = data;

    // Validate required fields
    if (!first_name || !last_name || !email || !subject || !message || !category) {
      return ctx.badRequest('Champs requis manquants : first_name, last_name, email, subject, message, category');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return ctx.badRequest('Format d\'email invalide');
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(category)) {
      return ctx.badRequest(`Catégorie invalide. Valeurs acceptées : ${VALID_CATEGORIES.join(', ')}`);
    }

    // Validate site exists
    if (!site) {
      return ctx.badRequest('Le champ site est requis');
    }

    const sites = await strapi.documents('api::site.site').findMany({
      filters: { documentId: { $eq: site } } as any,
    });

    if (!sites || sites.length === 0) {
      return ctx.badRequest('Site introuvable');
    }

    // Generate SVE reference number: SVE-{YYYY}-{N}
    const year = new Date().getFullYear();
    const existingCount = await strapi.documents('api::contact-submission.contact-submission').findMany({
      filters: {
        reference_number: { $startsWith: `SVE-${year}-` },
      },
      sort: { createdAt: 'desc' },
      limit: 1,
    });

    let nextNumber = 1;
    if (existingCount && existingCount.length > 0) {
      const lastRef = existingCount[0].reference_number;
      const lastNumber = parseInt(lastRef.split('-').pop(), 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    const reference_number = `SVE-${year}-${String(nextNumber).padStart(4, '0')}`;

    // Create the submission
    const receivedAt = new Date();
    const entry = await strapi.documents('api::contact-submission.contact-submission').create({
      data: {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : undefined,
        subject: subject.trim(),
        message: message.trim(),
        category,
        status: 'received',
        reference_number,
        acknowledgment_sent: false,
        history: [{ type: 'received', at: receivedAt.toISOString() }],
        site: sites[0].documentId,
      } as any,
    });

    // Accusé de réception à l'habitant (avec l'échéance légale pour une demande RGPD)
    const siteName = sites[0].name;
    const deadline = category === 'rgpd' ? `\n\nConformément au RGPD, la mairie vous répondra au plus tard le ${frenchDate(rgpdDeadline(receivedAt))}.` : '';
    try {
      await strapi.plugin('email').service('email').send({
        to: entry.email,
        ...((sites[0] as any).contact_mail ? { replyTo: (sites[0] as any).contact_mail } : {}),
        subject: `Votre demande a bien été reçue — ${siteName} [${reference_number}]`,
        text: `Bonjour ${entry.first_name},\n\nVotre demande « ${entry.subject} » a bien été reçue par la mairie de ${siteName}, sous la référence ${reference_number}.${deadline}\n\nCet e-mail est envoyé automatiquement.`,
        html: `<p>Bonjour ${escapeHtml(entry.first_name)},</p><p>Votre demande « ${escapeHtml(entry.subject)} » a bien été reçue par la mairie de ${escapeHtml(siteName)}, sous la référence <strong>${reference_number}</strong>.${deadline ? `</p><p>${escapeHtml(deadline.trim())}` : ''}</p><p>Cet e-mail est envoyé automatiquement.</p>`,
      });
      await appendHistory(strapi, entry.documentId, { type: 'acknowledged', at: new Date().toISOString() }, { acknowledgment_sent: true, acknowledged_at: new Date().toISOString() });
    } catch (error) {
      // La demande est enregistrée : l'accusé manquant se voit dans l'historique (pas d'événement)
      log.error('[contact] Accusé de réception non envoyé :', error);
    }

    ctx.status = 201;
    return {
      data: {
        reference_number: entry.reference_number,
        message: 'Votre demande a été enregistrée. Vous recevrez un accusé de réception.',
      },
    };
  },

  /**
   * Ouverture d'un message dans l'admin : « Ouvert par … » dans l'historique, et le message n'est
   * plus « non lu ». POST /api/contact-submissions/:id/open (commune vérifiée par site-isolation)
   */
  async open(ctx) {
    const message = await strapi.documents(UID).findOne({ documentId: ctx.params.id, fields: ['opened_at'] });
    if (!message) return ctx.notFound();
    if (message.opened_at) {
      ctx.body = { data: message };
      return;
    }
    const at = new Date().toISOString();
    ctx.body = { data: await appendHistory(strapi, ctx.params.id, { type: 'opened', at, by: actor(ctx) }, { opened_at: at }) };
  },

  /**
   * Réponse à l'habitant par e-mail, conservée dans le message (#186).
   * POST /api/contact-submissions/:id/reply { message, resolve?, attachmentFileId? }
   */
  async reply(ctx) {
    const { message: raw, resolve = true, attachmentFileId } = (ctx.request.body ?? {}) as { message?: unknown; resolve?: boolean; attachmentFileId?: number };
    const text = typeof raw === 'string' ? raw.trim() : '';
    if (!text) return ctx.badRequest('La réponse est vide');
    if (text.length > REPLY_MAX) return ctx.badRequest('La réponse est trop longue');

    const message = await strapi.documents(UID).findOne({ documentId: ctx.params.id, populate: ['site'] });
    if (!message) return ctx.notFound();
    const site = (message as any).site;

    // Pièce jointe : un fichier de la médiathèque de cette commune, pas un autre
    let attachment: { filename: string; content?: string; path?: string } | undefined;
    if (attachmentFileId !== undefined && attachmentFileId !== null) {
      const item = await strapi.db.query('api::media-item.media-item').findOne({
        where: { file: { id: Number(attachmentFileId) }, site: { documentId: site?.documentId } },
        populate: ['file'],
      });
      if (!item?.file) return ctx.badRequest('Pièce jointe introuvable dans la médiathèque de la commune');
      attachment = await attachmentFor(strapi, item.file);
    }

    try {
      await strapi.plugin('email').service('email').send({
        to: message.email,
        ...(site?.contact_mail ? { replyTo: site.contact_mail } : {}),
        subject: `Re : ${message.subject} [${message.reference_number}]`,
        text: `${text}\n\n—\nMairie de ${site?.name ?? ''} · référence ${message.reference_number}`,
        html: `<p>${paragraphs(text)}</p><hr><p style="color:#4a4942">Mairie de ${escapeHtml(site?.name ?? '')} · référence ${message.reference_number}</p>`,
        ...(attachment ? { attachments: [attachment] } : {}),
      });
    } catch (error) {
      log.error('[contact] Réponse non envoyée :', error);
      ctx.status = 502;
      ctx.body = { error: { status: 502, message: "La réponse n'a pas pu être envoyée par e-mail. Elle n'est pas enregistrée : réessayez." } };
      return;
    }

    const at = new Date().toISOString();
    const status = resolve ? 'resolved' : message.status === 'received' ? 'in_progress' : message.status;
    const updated = await appendHistory(
      strapi,
      message.documentId,
      { type: 'replied', at, by: actor(ctx), message: text, ...(attachment ? { attachment: attachment.filename } : {}) },
      { response: text, responded_at: at, status, ...(message.opened_at ? {} : { opened_at: at }) },
    );
    ctx.body = { data: updated };
  },

  /** Changement de statut depuis l'admin : noté dans l'historique */
  async update(ctx) {
    const before = await strapi.documents(UID).findOne({ documentId: ctx.params.id, fields: ['status'] });
    const response = await super.update(ctx);
    const next = ctx.request.body?.data?.status;
    if (before && next && next !== before.status) {
      await appendHistory(strapi, ctx.params.id, { type: 'status', at: new Date().toISOString(), by: actor(ctx), from: before.status, to: next });
    }
    return response;
  },
}));
