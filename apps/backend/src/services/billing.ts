/**
 * Facturation intégrée (#314) : factures de l'abonnement Communeo, sans prestataire de paiement.
 *
 * - Émission : au passage en live (montant du devis accepté), puis à chaque échéance annuelle tant que
 *   le renouvellement n'est pas arrêté (`site.billing_renewal`). Numéro sans trou (FAC-2026-0001), PDF
 *   rendu une fois et archivé avec son empreinte ; la facture est envoyée à l'adresse de facturation.
 * - L'équipe la dépose sur Chorus Pro, puis la marque payée à réception du virement.
 * - Relances automatiques après l'échéance (REMINDER_AFTER_DAYS) ; la dernière prévient l'équipe.
 * - Annulation : un avoir (AV-2026-0001), jamais de modification ni de suppression.
 *
 * `processBilling` passe chaque jour (config/cron-tasks.ts) ; chaque étape n'est faite qu'une fois.
 */
import {
  addCalendarDays,
  daysBetween,
  dueDay,
  formatEuros,
  invoiceAmounts,
  invoiceNumber,
  parisDay,
  REMINDER_AFTER_DAYS,
  subscriptionPeriod,
  type InvoiceKind,
} from '@communeo/core';
import { recordActivity } from './activity-log';
import { renderInvoicePdf, type InvoiceIssuer } from './invoice-pdf';
import { sha256 } from './quote-pdf';
import { adminUrl, notifyTeam } from './team-notifications';
import { log } from '../utils/logger';
import { escapeHtml } from '../utils/security';

const INVOICE = 'api::invoice.invoice';
const SITE = 'api::site.site';
const QUOTE = 'api::quote.quote';

export const INVOICE_LABEL = 'Abonnement annuel Communeo : site internet de la commune';

export const invoiceIssuer = (): InvoiceIssuer & { vatRate: number } => {
  const config = strapi.config.get('platform.issuer', {}) as Partial<InvoiceIssuer & { vatRate: number }>;
  return {
    name: config.name ?? '',
    address: config.address ?? '',
    siret: config.siret ?? '',
    email: config.email ?? '',
    iban: config.iban ?? '',
    bic: config.bic ?? '',
    vatRate: config.vatRate ?? 0,
  };
};

export class BillingError extends Error {}

interface Customer {
  name: string;
  siret: string;
  address: string;
  email: string;
}

interface IssueInput {
  /** null : commune supprimée, sa facture est gardée (avoir d'une facture d'une commune supprimée) */
  site: { id?: number; documentId: string; name: string } | null;
  kind: InvoiceKind;
  reason: 'go_live' | 'renewal' | 'manual' | 'cancellation';
  today: string;
  label: string;
  customer: Customer;
  amounts: { ht: number; vatRate: number; vat: number; ttc: number };
  quote?: { documentId: string; number: string } | null;
  period?: { start: string; end: string } | null;
  creditFor?: string | null;
  cancelReason?: string | null;
}

/** Prochain numéro de la suite (type, année) : compté au moment de l'écriture, sans trou */
async function nextNumber(kind: InvoiceKind, year: number): Promise<string> {
  const prefix = invoiceNumber(kind, year, 0).slice(0, -4);
  const count = await strapi.db.query(INVOICE).count({ where: { number: { $startsWith: prefix } } });
  return invoiceNumber(kind, year, count + 1);
}

const isUniqueViolation = (error: any) => /unique|duplicate/i.test(`${error?.message ?? ''} ${error?.details?.errors?.[0]?.message ?? ''}`);

/** Émet une facture ou un avoir : numéro, PDF archivé, écriture ; rien n'est modifiable ensuite */
async function issue(input: IssueInput) {
  const issuer = invoiceIssuer();
  const dueAt = input.kind === 'invoice' ? dueDay(input.today) : input.today;
  // Deux émissions simultanées peuvent viser le même numéro : l'une échoue sur l'unicité et réessaie
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const number = await nextNumber(input.kind, Number(input.today.slice(0, 4)));
    const pdf = await renderInvoicePdf(issuer, {
      kind: input.kind,
      number,
      issuedAt: input.today,
      dueAt,
      periodStart: input.period?.start ?? null,
      periodEnd: input.period?.end ?? null,
      label: input.label,
      quoteNumber: input.quote?.number ?? null,
      creditFor: input.creditFor ?? null,
      cancelReason: input.cancelReason ?? null,
      customer: input.customer,
      amounts: input.amounts,
    });
    try {
      const invoice: any = await strapi.documents(INVOICE as any).create({
        data: {
          site: input.site?.documentId ?? null,
          quote: input.quote?.documentId ?? null,
          number,
          kind: input.kind,
          reason: input.reason,
          status: 'issued',
          credit_for: input.creditFor ?? null,
          cancel_reason: input.cancelReason ?? null,
          issued_at: input.today,
          due_at: dueAt,
          period_start: input.period?.start ?? null,
          period_end: input.period?.end ?? null,
          label: input.label,
          customer_name: input.customer.name,
          customer_siret: input.customer.siret,
          customer_address: input.customer.address,
          customer_email: input.customer.email,
          amount_ht: input.amounts.ht,
          vat_rate: input.amounts.vatRate,
          amount_ttc: input.amounts.ttc,
          reminders_sent: 0,
          pdf: pdf.toString('base64'),
          pdf_sha256: sha256(pdf),
        } as any,
      });
      return { invoice, pdf };
    } catch (error) {
      if (!isUniqueViolation(error) || attempt === 4) throw error;
    }
  }
  throw new BillingError('Numéro de facture indisponible');
}

async function adminEmails(siteDocumentId: string): Promise<string[]> {
  const admins = await strapi.db.query('plugin::users-permissions.user').findMany({
    where: { site: { documentId: siteDocumentId }, municipality_role: 'admin', active: { $ne: false } },
    select: ['email'],
  });
  return admins.map((admin: any) => admin.email).filter(Boolean);
}

/** E-mail à l'adresse de facturation et aux administrateurs de la commune ; un échec est consigné */
async function mailCommune(invoice: any, subject: string, paragraphs: string[], pdf?: Buffer) {
  const siteDocumentId = invoice.site?.documentId;
  const recipients = [...new Set([invoice.customer_email, ...(siteDocumentId ? await adminEmails(siteDocumentId) : [])].filter(Boolean).map((email: string) => email.toLowerCase()))];
  const link = `${adminUrl()}/facturation`;
  const html = [
    '<p>Bonjour,</p>',
    ...paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`),
    `<p><a href="${link}" style="display:inline-block;padding:12px 24px;background-color:#004643;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Voir vos factures</a></p>`,
    "<p>L'équipe Communeo</p>",
  ].join('\n');
  const text = ['Bonjour,', ...paragraphs, `Voir vos factures : ${link}`, "L'équipe Communeo"].join('\n\n');
  for (const to of recipients) {
    try {
      await strapi.plugin('email').service('email').send({
        to,
        subject,
        html,
        text,
        ...(pdf ? { attachments: [{ filename: `${invoice.number}.pdf`, content: pdf.toString('base64') }] } : {}),
      });
    } catch (error) {
      log.error(`[FACTURATION] « ${subject} » non envoyé à ${to} :`, error);
    }
  }
}

const bankLine = () => {
  const { iban } = invoiceIssuer();
  return iban ? `Le règlement se fait par virement sur l'IBAN indiqué sur la facture, en rappelant son numéro.` : 'Le règlement se fait par virement, en rappelant le numéro de la facture.';
};

async function announce(invoice: any, pdf: Buffer, site: { name: string }) {
  const amount = formatEuros(Number(invoice.amount_ttc));
  if (invoice.kind === 'credit_note') {
    await mailCommune(invoice, `Avoir ${invoice.number} — Communeo`, [
      `Vous trouverez ci-joint l'avoir ${invoice.number} (${amount}), qui annule la facture ${invoice.credit_for}. Il est aussi transmis par Chorus Pro.`,
    ], pdf);
  } else {
    await mailCommune(invoice, `Facture ${invoice.number} — abonnement Communeo de ${site.name}`, [
      `Vous trouverez ci-joint la facture ${invoice.number} de l'abonnement Communeo de ${site.name} : ${amount}, à régler au plus tard le ${frenchDay(invoice.due_at)}.`,
      `Elle vous est aussi transmise par Chorus Pro. ${bankLine()}`,
    ], pdf);
  }
  await recordActivity({
    action: invoice.kind === 'credit_note' ? 'invoice_cancel' : 'invoice_issue',
    siteDocumentId: invoice.site?.documentId ?? null,
    target: { type: 'invoice', id: invoice.documentId, label: invoice.number },
    details: { amountTTC: Number(invoice.amount_ttc), ...(invoice.credit_for ? { creditFor: invoice.credit_for } : {}) },
  });
  await notifyTeam(
    `${invoice.kind === 'credit_note' ? 'Avoir' : 'Facture'} ${invoice.number} : ${site.name}, à déposer sur Chorus Pro`,
    `${invoice.kind === 'credit_note' ? `L'avoir ${invoice.number} annule la facture ${invoice.credit_for}` : `La facture ${invoice.number} a été émise`} pour ${site.name} (${amount}). Déposez-le sur Chorus Pro, puis indiquez-le dans l'espace équipe : ${adminUrl()}/plateforme/facturation`,
  );
}

const frenchDay = (day: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${String(day).slice(0, 10)}T00:00:00Z`));

const withSite = (invoice: any) => strapi.db.query(INVOICE).findOne({ where: { documentId: invoice.documentId }, populate: ['site'] });

/** Facture en cours de validité de la commune (la plus récente, hors avoirs et factures annulées) */
export const currentInvoice = (siteDocumentId: string) =>
  strapi.db.query(INVOICE).findOne({
    where: { site: { documentId: siteDocumentId }, kind: 'invoice', status: { $ne: 'cancelled' } },
    orderBy: { period_end: 'desc' },
  });

/**
 * Première facture, au passage en live : montant et coordonnées du devis accepté. Sans devis (commune
 * créée par l'équipe), rien n'est émis : l'équipe en est prévenue.
 */
export async function issueGoLiveInvoice(site: any, now: Date = new Date()) {
  if (await currentInvoice(site.documentId)) return null;
  const quote: any = await strapi.db.query(QUOTE).findOne({ where: { site: { documentId: site.documentId }, status: 'accepted' }, orderBy: { signed_at: 'desc' } });
  if (!quote) {
    await notifyTeam(
      `${site.name} est en live sans devis : aucune facture émise`,
      `${site.name} est passée en live sans devis accepté : aucune facture n'a été émise. Faites valider un devis à la commune (écran « Passer en live ») ou facturez-la hors de Communeo.`,
    );
    return null;
  }
  const today = parisDay(now);
  const { invoice, pdf } = await issue({
    site,
    kind: 'invoice',
    reason: 'go_live',
    today,
    label: INVOICE_LABEL,
    customer: { name: `Commune de ${quote.commune_name}`, siret: quote.siret, address: quote.address, email: quote.billing_email },
    amounts: invoiceAmounts(Number(quote.amount_ht), Number(quote.vat_rate)),
    quote: { documentId: quote.documentId, number: quote.number },
    period: subscriptionPeriod(today),
  });
  await announce({ ...invoice, site }, pdf, site);
  return invoice;
}

/** Échéance annuelle : même montant et mêmes coordonnées que la facture précédente, TVA en vigueur */
async function renew(site: any, previous: any, today: string) {
  const start = addCalendarDays(String(previous.period_end).slice(0, 10), 1);
  const { invoice, pdf } = await issue({
    site,
    kind: 'invoice',
    reason: 'renewal',
    today,
    label: INVOICE_LABEL,
    customer: { name: previous.customer_name, siret: previous.customer_siret, address: previous.customer_address, email: previous.customer_email },
    amounts: invoiceAmounts(Number(previous.amount_ht), invoiceIssuer().vatRate),
    quote: previous.quote ? { documentId: previous.quote.documentId, number: previous.quote.number } : null,
    period: subscriptionPeriod(start),
  });
  await announce({ ...invoice, site }, pdf, site);
  return invoice;
}

async function sendReminder(invoice: any, step: number, today: string) {
  const late = daysBetween(String(invoice.due_at).slice(0, 10), today);
  await mailCommune(
    invoice,
    `Rappel : facture ${invoice.number} en attente de paiement — Communeo`,
    [
      `Sauf erreur de notre part, la facture ${invoice.number} (${formatEuros(Number(invoice.amount_ttc))}), échue le ${frenchDay(invoice.due_at)}, n'est pas encore réglée${late > 0 ? ` (${late} jour${late > 1 ? 's' : ''} de retard)` : ''}.`,
      `Elle vous a été transmise par Chorus Pro ; vous la trouvez aussi ci-joint. ${bankLine()} Si le paiement est déjà parti, merci de ne pas tenir compte de ce message.`,
    ],
    invoice.pdf ? Buffer.from(invoice.pdf, 'base64') : undefined,
  );
  await strapi.db.query(INVOICE).update({ where: { id: invoice.id }, data: { reminders_sent: step, last_reminder_at: new Date() } });
  await recordActivity({
    action: 'invoice_remind',
    siteDocumentId: invoice.site?.documentId ?? null,
    target: { type: 'invoice', id: invoice.documentId, label: invoice.number },
    details: { step, daysLate: late },
  });
}

/** Tâche quotidienne : renouvellements échus, puis relances des factures en retard */
export async function processBilling(now: Date = new Date()) {
  const today = parisDay(now);

  // Filtré ici : en SQL, `billing_renewal <> false` écarte aussi les communes antérieures au champ (NULL)
  const live = await strapi.db.query(SITE).findMany({ where: { plan: 'live' }, select: ['id', 'documentId', 'name', 'billing_renewal'] });
  for (const site of live.filter((candidate: any) => candidate.billing_renewal !== false)) {
    try {
      const previous: any = await strapi.db.query(INVOICE).findOne({
        where: { site: { documentId: site.documentId }, kind: 'invoice', status: { $ne: 'cancelled' } },
        orderBy: { period_end: 'desc' },
        populate: ['quote'],
      });
      if (previous?.period_end && String(previous.period_end).slice(0, 10) < today) await renew(site, previous, today);
    } catch (error) {
      log.error(`[FACTURATION] Renouvellement de ${site.name} impossible :`, error);
    }
  }

  const unpaid = await strapi.db.query(INVOICE).findMany({ where: { kind: 'invoice', status: 'issued' }, populate: ['site'] });
  for (const invoice of unpaid) {
    const late = daysBetween(String(invoice.due_at).slice(0, 10), today);
    // Relance la plus avancée due, une seule fois (une tâche manquée ne rattrape pas toutes les étapes)
    const step = REMINDER_AFTER_DAYS.filter((days) => late >= days).length;
    if (step <= (invoice.reminders_sent ?? 0)) continue;
    try {
      await sendReminder(invoice, step, today);
      if (step === REMINDER_AFTER_DAYS.length) {
        await notifyTeam(
          `Facture en retard : ${invoice.site?.name ?? invoice.customer_name} (${invoice.number})`,
          `La facture ${invoice.number} (${formatEuros(Number(invoice.amount_ttc))}) est impayée depuis ${late} jours ; la commune a été relancée ${step} fois. Voyez avec la mairie ou son comptable public : ${adminUrl()}/plateforme/facturation`,
        );
      }
    } catch (error) {
      log.error(`[FACTURATION] Relance de ${invoice.number} impossible :`, error);
    }
  }
}

// ─── Actions de l'équipe ─────────────────────────────────────────────

export async function findInvoice(documentId: string) {
  return strapi.db.query(INVOICE).findOne({ where: { documentId }, populate: ['site', 'quote'] });
}

export async function markPaid(invoice: any, input: { paidAt: string; amount: number; note?: string }) {
  if (invoice.kind !== 'invoice' || invoice.status !== 'issued') throw new BillingError('Seule une facture en attente peut être marquée payée.');
  await strapi.db.query(INVOICE).update({
    where: { id: invoice.id },
    data: { status: 'paid', paid_at: input.paidAt, paid_amount: input.amount, payment_note: input.note || null },
  });
  await recordActivity({
    action: 'invoice_paid',
    siteDocumentId: invoice.site?.documentId ?? null,
    target: { type: 'invoice', id: invoice.documentId, label: invoice.number },
    details: { amount: input.amount, paidAt: input.paidAt },
  });
  return withSite(invoice);
}

export async function markDeposited(invoice: any, input: { depositedAt: string; reference?: string }) {
  if (invoice.status === 'cancelled' && !invoice.chorus_deposited_at) throw new BillingError('Une facture annulée ne se dépose plus : déposez son avoir.');
  await strapi.db.query(INVOICE).update({
    where: { id: invoice.id },
    data: { chorus_deposited_at: input.depositedAt, chorus_reference: input.reference || null },
  });
  await recordActivity({
    action: 'invoice_chorus',
    siteDocumentId: invoice.site?.documentId ?? null,
    target: { type: 'invoice', id: invoice.documentId, label: invoice.number },
    details: { depositedAt: input.depositedAt, ...(input.reference ? { reference: input.reference } : {}) },
  });
  return withSite(invoice);
}

/** Relance manuelle : même message que la relance automatique, sans changer l'étape suivie */
export async function remindNow(invoice: any, now: Date = new Date()) {
  if (invoice.kind !== 'invoice' || invoice.status !== 'issued') throw new BillingError('Seule une facture en attente peut être relancée.');
  await sendReminder(invoice, invoice.reminders_sent ?? 0, parisDay(now));
  return withSite(invoice);
}

/** Annulation : un avoir du même montant ; la facture passe « annulée », elle n'est pas modifiée */
export async function cancelWithCreditNote(invoice: any, reason: string, now: Date = new Date()) {
  if (invoice.kind !== 'invoice' || invoice.status === 'cancelled') throw new BillingError('Cette facture est déjà annulée.');
  // Commune supprimée (#391) : la facture reste, au nom du client figé à l'émission
  const site = invoice.site ?? null;
  const { invoice: credit, pdf } = await issue({
    site,
    kind: 'credit_note',
    reason: 'cancellation',
    today: parisDay(now),
    label: invoice.label,
    customer: { name: invoice.customer_name, siret: invoice.customer_siret, address: invoice.customer_address, email: invoice.customer_email },
    amounts: invoiceAmounts(Number(invoice.amount_ht), Number(invoice.vat_rate)),
    quote: invoice.quote ? { documentId: invoice.quote.documentId, number: invoice.quote.number } : null,
    period: invoice.period_start ? { start: String(invoice.period_start).slice(0, 10), end: String(invoice.period_end).slice(0, 10) } : null,
    creditFor: invoice.number,
    cancelReason: reason,
  });
  await strapi.db.query(INVOICE).update({ where: { id: invoice.id }, data: { status: 'cancelled', cancel_reason: reason } });
  await announce({ ...credit, site }, pdf, site ?? { name: invoice.customer_name });
  return credit;
}

/** Arrêt (résiliation à l'échéance) ou reprise du renouvellement annuel */
export async function setRenewal(site: any, enabled: boolean) {
  await strapi.db.query(SITE).update({ where: { id: site.id }, data: { billing_renewal: enabled } });
  await recordActivity({
    action: 'billing_renewal',
    siteDocumentId: site.documentId,
    target: { type: 'site', id: site.documentId, label: site.name },
    details: { enabled },
  });
}

/** Première facture émise à la main par l'équipe (commune passée en live avant la facturation) */
export async function issueFirstInvoice(site: any, now: Date = new Date()) {
  if (site.plan !== 'live') throw new BillingError("La commune n'est pas en live.");
  if (await currentInvoice(site.documentId)) throw new BillingError('Cette commune a déjà une facture en cours.');
  const quote = await strapi.db.query(QUOTE).findOne({ where: { site: { documentId: site.documentId }, status: 'accepted' } });
  if (!quote) throw new BillingError('Aucun devis accepté : la commune doit d’abord valider un devis.');
  return issueGoLiveInvoice(site, now);
}
