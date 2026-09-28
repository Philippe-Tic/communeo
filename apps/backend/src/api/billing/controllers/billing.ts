/**
 * Facturation (#314).
 *
 * Commune (administrateurs, et équipe en impersonation) :
 *   GET /api/billing/invoices                 → ses factures et avoirs, renouvellement
 *   GET /api/billing/invoices/:documentId/pdf → le PDF archivé (commune concernée ou équipe)
 * Équipe Communeo (super admins) :
 *   GET  /api/billing/team                                → toutes les factures, communes live sans facture, réglages manquants
 *   POST /api/billing/team/invoices/:documentId/paid      → { paidAt, amount, note? }
 *   POST /api/billing/team/invoices/:documentId/chorus    → { depositedAt, reference? }
 *   POST /api/billing/team/invoices/:documentId/remind    → relance par e-mail
 *   POST /api/billing/team/invoices/:documentId/cancel    → { reason } : avoir du même montant
 *   POST /api/billing/team/sites/:documentId/invoice      → première facture (devis accepté requis)
 *   PUT  /api/billing/team/sites/:documentId/renewal      → { enabled } : arrêt ou reprise du renouvellement
 */
import { parisDay } from '@communeo/core';
import {
  BillingError,
  cancelWithCreditNote,
  currentInvoice,
  findInvoice,
  invoiceIssuer,
  issueFirstInvoice,
  markDeposited,
  markPaid,
  remindNow,
  setRenewal,
} from '../../../services/billing';
import { getEffectiveSite, hasRole } from '../../../utils/getEffectiveSite';

const INVOICE = 'api::invoice.invoice';
const SITE = 'api::site.site';
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TEXT = 500;

const day = (value: unknown) => (value ? String(value).slice(0, 10) : null);
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/** Facture telle que l'admin l'affiche ; `team` : champs internes de l'équipe en plus */
function serialize(invoice: any, team = false) {
  return {
    documentId: invoice.documentId,
    number: invoice.number,
    kind: invoice.kind,
    reason: invoice.reason,
    status: invoice.status,
    creditFor: invoice.credit_for ?? null,
    cancelReason: invoice.cancel_reason ?? null,
    issuedAt: day(invoice.issued_at),
    dueAt: day(invoice.due_at),
    periodStart: day(invoice.period_start),
    periodEnd: day(invoice.period_end),
    label: invoice.label,
    customerName: invoice.customer_name,
    amountHT: Number(invoice.amount_ht),
    vatRate: Number(invoice.vat_rate),
    amountTTC: Number(invoice.amount_ttc),
    paidAt: day(invoice.paid_at),
    paidAmount: invoice.paid_amount != null ? Number(invoice.paid_amount) : null,
    chorusDepositedAt: day(invoice.chorus_deposited_at),
    ...(team
      ? {
          site: invoice.site ? { documentId: invoice.site.documentId, name: invoice.site.name } : null,
          chorusReference: invoice.chorus_reference ?? null,
          paymentNote: invoice.payment_note ?? null,
          remindersSent: invoice.reminders_sent ?? 0,
          lastReminderAt: invoice.last_reminder_at ?? null,
          customerEmail: invoice.customer_email,
          customerSiret: invoice.customer_siret,
        }
      : {}),
  };
}

async function requireSuperAdmin(ctx) {
  if (!ctx.state.user) ctx.throw(401, 'Not authenticated');
  const user = await strapi.query('plugin::users-permissions.user').findOne({ where: { id: ctx.state.user.id } });
  if (user?.municipality_role !== 'super_admin') ctx.throw(403, 'Réservé à l’équipe Communeo');
}

async function teamInvoice(ctx) {
  await requireSuperAdmin(ctx);
  const invoice = await findInvoice(ctx.params.documentId);
  if (!invoice) ctx.notFound('Facture introuvable');
  return invoice;
}

/** Action de l'équipe : une règle métier non respectée répond 409 avec son message */
async function act(ctx, action: () => Promise<any>) {
  try {
    const result = await action();
    ctx.body = { data: result ? serialize(result, true) : null };
  } catch (error) {
    if (error instanceof BillingError) return ctx.conflict(error.message);
    throw error;
  }
}

/** Renouvellement : prochaine échéance (lendemain de la fin de période), arrêté ou non */
async function renewalOf(site: any) {
  const current: any = await currentInvoice(site.documentId);
  const end = current ? day(current.period_end) : null;
  return {
    enabled: site.billing_renewal !== false,
    periodEnd: end,
  };
}

export default {
  async list(ctx) {
    if (!hasRole(ctx, ['admin', 'super_admin'])) return ctx.forbidden('Réservé aux administrateurs de la commune');
    const effective = await getEffectiveSite(ctx);
    if (!effective) return ctx.forbidden('Aucun site assigné à ce compte');
    const site: any = await strapi.db.query(SITE).findOne({ where: { documentId: effective.documentId } });
    const invoices = await strapi.db.query(INVOICE).findMany({
      where: { site: { documentId: effective.documentId } },
      orderBy: [{ issued_at: 'desc' }, { id: 'desc' }],
    });
    ctx.body = { data: { invoices: invoices.map((invoice: any) => serialize(invoice)), renewal: site ? await renewalOf(site) : null } };
  },

  async pdf(ctx) {
    const invoice: any = await strapi.db.query(INVOICE).findOne({ where: { documentId: ctx.params.documentId }, populate: ['site'] });
    if (!invoice) return ctx.notFound('Facture introuvable');
    if (!hasRole(ctx, ['super_admin'])) {
      const effective = await getEffectiveSite(ctx);
      if (!hasRole(ctx, ['admin']) || !effective || invoice.site?.documentId !== effective.documentId) return ctx.notFound('Facture introuvable');
    }
    ctx.type = 'application/pdf';
    ctx.set('Content-Disposition', `inline; filename="${invoice.number}.pdf"`);
    ctx.set('Cache-Control', 'private, no-store');
    ctx.body = Buffer.from(invoice.pdf, 'base64');
  },

  async team(ctx) {
    await requireSuperAdmin(ctx);
    const invoices = await strapi.db.query(INVOICE).findMany({ populate: ['site'], orderBy: [{ issued_at: 'desc' }, { id: 'desc' }] });
    const live = await strapi.db.query(SITE).findMany({ where: { plan: 'live' }, select: ['id', 'documentId', 'name', 'billing_renewal'] });
    const invoiced = new Set(
      invoices.filter((invoice: any) => invoice.kind === 'invoice' && invoice.status !== 'cancelled').map((invoice: any) => invoice.site?.documentId),
    );
    const accepted = await strapi.db.query('api::quote.quote').findMany({ where: { status: 'accepted' }, populate: ['site'], select: ['id'] });
    const withQuote = new Set(accepted.map((quote: any) => quote.site?.documentId));
    const issuer = invoiceIssuer();
    const missing = [
      !issuer.name && 'COMMUNEO_LEGAL_NAME',
      !issuer.address && 'COMMUNEO_LEGAL_ADDRESS',
      !issuer.siret && 'COMMUNEO_SIRET',
      !issuer.email && 'COMMUNEO_BILLING_EMAIL',
      !issuer.iban && 'COMMUNEO_IBAN',
      !issuer.bic && 'COMMUNEO_BIC',
    ].filter((name): name is string => !!name);
    const renewals = await Promise.all(live.map(async (site: any) => ({ documentId: site.documentId, name: site.name, ...(await renewalOf(site)) })));
    ctx.body = {
      data: {
        today: parisDay(),
        invoices: invoices.map((invoice: any) => serialize(invoice, true)),
        uninvoiced: live
          .filter((site: any) => !invoiced.has(site.documentId))
          .map((site: any) => ({ documentId: site.documentId, name: site.name, hasAcceptedQuote: withQuote.has(site.documentId) })),
        renewals,
        missingSettings: missing,
      },
    };
  },

  async markPaid(ctx) {
    const invoice = await teamInvoice(ctx);
    if (!invoice) return;
    const body = (ctx.request.body ?? {}) as Record<string, unknown>;
    const paidAt = text(body.paidAt);
    const amount = Number(body.amount);
    const note = text(body.note);
    if (!DAY.test(paidAt) || paidAt > parisDay()) return ctx.badRequest('Indiquez la date de réception du virement (pas dans le futur).');
    if (!Number.isFinite(amount) || amount <= 0) return ctx.badRequest('Indiquez le montant reçu.');
    if (note.length > MAX_TEXT) return ctx.badRequest('La note dépasse 500 caractères.');
    await act(ctx, () => markPaid(invoice, { paidAt, amount: Math.round(amount * 100) / 100, note }));
  },

  async markDeposited(ctx) {
    const invoice = await teamInvoice(ctx);
    if (!invoice) return;
    const body = (ctx.request.body ?? {}) as Record<string, unknown>;
    const depositedAt = text(body.depositedAt);
    const reference = text(body.reference);
    if (!DAY.test(depositedAt) || depositedAt > parisDay()) return ctx.badRequest('Indiquez la date du dépôt sur Chorus Pro (pas dans le futur).');
    if (reference.length > 100) return ctx.badRequest('La référence dépasse 100 caractères.');
    await act(ctx, () => markDeposited(invoice, { depositedAt, reference }));
  },

  async remind(ctx) {
    const invoice = await teamInvoice(ctx);
    if (!invoice) return;
    await act(ctx, () => remindNow(invoice));
  },

  async cancel(ctx) {
    const invoice = await teamInvoice(ctx);
    if (!invoice) return;
    const reason = text((ctx.request.body ?? {}).reason);
    if (!reason) return ctx.badRequest('Indiquez le motif de l’annulation : il figure sur l’avoir.');
    if (reason.length > MAX_TEXT) return ctx.badRequest('Le motif dépasse 500 caractères.');
    await act(ctx, () => cancelWithCreditNote(invoice, reason));
  },

  async issueFirst(ctx) {
    await requireSuperAdmin(ctx);
    const site: any = await strapi.db.query(SITE).findOne({ where: { documentId: ctx.params.documentId } });
    if (!site) return ctx.notFound('Commune introuvable');
    await act(ctx, async () => findInvoice((await issueFirstInvoice(site)).documentId));
  },

  async renewal(ctx) {
    await requireSuperAdmin(ctx);
    const site: any = await strapi.db.query(SITE).findOne({ where: { documentId: ctx.params.documentId } });
    if (!site) return ctx.notFound('Commune introuvable');
    const enabled = (ctx.request.body ?? {}).enabled;
    if (typeof enabled !== 'boolean') return ctx.badRequest('enabled : true ou false');
    await setRenewal(site, enabled);
    ctx.body = { data: { documentId: site.documentId, ...(await renewalOf({ ...site, billing_renewal: enabled })) } };
  },
};
