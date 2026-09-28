/**
 * Facturation intégrée (#314) : Communeo émet ses factures au passage en live puis à chaque échéance
 * annuelle ; la mairie les reçoit sur Chorus Pro et paie par virement ; l'équipe marque la facture
 * payée. Une facture émise n'est jamais modifiée ni supprimée : on l'annule par un avoir.
 *
 * Les dates de la facturation sont des jours du calendrier de Paris (« 2026-09-28 »), pas des instants.
 */
import type { InvoiceKind, InvoiceStatus } from '../generated/strapi';

/** Délai de paiement d'une collectivité (art. R. 2192-10 du Code de la commande publique) */
export const PAYMENT_TERM_DAYS = 30;

/** Relances automatiques, en jours après l'échéance ; la dernière prévient aussi l'équipe */
export const REMINDER_AFTER_DAYS = [7, 30] as const;

/** État affiché : une facture émise est « en attente » puis « en retard » après son échéance */
export type InvoiceState = 'pending' | 'overdue' | 'paid' | 'cancelled' | 'credit_note';

export const INVOICE_STATE_LABELS: Record<InvoiceState, string> = {
  pending: 'En attente',
  overdue: 'En retard',
  paid: 'Payée',
  cancelled: 'Annulée',
  credit_note: 'Avoir',
};

export const INVOICE_SERIES: Record<InvoiceKind, string> = { invoice: 'FAC', credit_note: 'AV' };

/** FAC-2026-0001, AV-2026-0001 : une suite par type et par année, sans trou */
export const invoiceNumber = (kind: InvoiceKind, year: number, sequence: number) =>
  `${INVOICE_SERIES[kind]}-${year}-${String(sequence).padStart(4, '0')}`;

/** Jour du calendrier de Paris : « 2026-09-28 » */
export function parisDay(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

const fromDay = (day: string) => {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, date));
};
const toDay = (date: Date) => date.toISOString().slice(0, 10);

export const addCalendarDays = (day: string, days: number) => {
  const date = fromDay(day);
  date.setUTCDate(date.getUTCDate() + days);
  return toDay(date);
};

/** Même jour un an plus tard ; un 29 février devient le 28 */
export function addOneYear(day: string): string {
  const date = fromDay(day);
  const target = new Date(Date.UTC(date.getUTCFullYear() + 1, date.getUTCMonth(), date.getUTCDate()));
  if (target.getUTCMonth() !== date.getUTCMonth()) target.setUTCDate(0);
  return toDay(target);
}

/** Période d'abonnement de 12 mois commençant `start` : du 28/09/2026 au 27/09/2027 */
export const subscriptionPeriod = (start: string) => ({ start, end: addCalendarDays(addOneYear(start), -1) });

export const dueDay = (issuedDay: string) => addCalendarDays(issuedDay, PAYMENT_TERM_DAYS);

/** Nombre de jours de `from` à `to` (positif si `to` est après) */
export const daysBetween = (from: string, to: string) => Math.round((fromDay(to).getTime() - fromDay(from).getTime()) / 86_400_000);

export interface InvoiceLike {
  kind: InvoiceKind;
  status: InvoiceStatus;
  dueAt: string;
}

export function invoiceState(invoice: InvoiceLike, today: string = parisDay()): InvoiceState {
  if (invoice.kind === 'credit_note') return 'credit_note';
  if (invoice.status === 'paid') return 'paid';
  if (invoice.status === 'cancelled') return 'cancelled';
  return today > invoice.dueAt ? 'overdue' : 'pending';
}

export interface SummaryInvoice extends InvoiceLike {
  amountTTC: number;
  paidAmount: number | null;
  chorusDepositedAt: string | null;
}

/** Indicateurs de l'espace équipe : ce qui reste à déposer sur Chorus Pro, à encaisser, en retard */
export function billingSummary(invoices: SummaryInvoice[], today: string = parisDay()) {
  const summary = { issued: 0, collected: 0, outstanding: 0, overdue: 0, overdueCount: 0, toDeposit: 0 };
  for (const invoice of invoices) {
    const state = invoiceState(invoice, today);
    // À déposer : factures et avoirs pas encore sur Chorus Pro (une facture annulée n'y part plus)
    if (!invoice.chorusDepositedAt && state !== 'cancelled') summary.toDeposit += 1;
    if (state === 'credit_note' || state === 'cancelled') continue;
    summary.issued += invoice.amountTTC;
    if (state === 'paid') summary.collected += invoice.paidAmount ?? invoice.amountTTC;
    else {
      summary.outstanding += invoice.amountTTC;
      if (state === 'overdue') {
        summary.overdue += invoice.amountTTC;
        summary.overdueCount += 1;
      }
    }
  }
  return summary;
}

/** Montants d'une facture (arrondis au centime) */
export function invoiceAmounts(ht: number, vatRate: number) {
  const round = (value: number) => Math.round(value * 100) / 100;
  const vat = round(ht * vatRate);
  return { ht: round(ht), vatRate, vat, ttc: round(ht + vat) };
}

/** Coordonnées bancaires affichées sur la facture : IBAN par groupes de 4 */
export const formatIban = (iban: string) => iban.replace(/\s/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();
