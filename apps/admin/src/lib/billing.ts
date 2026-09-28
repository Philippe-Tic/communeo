/**
 * Facturation (#314) : factures de l'abonnement Communeo. La commune voit ses factures ; l'équipe suit
 * ce qui reste à déposer sur Chorus Pro, à encaisser et en retard, et agit (payée, déposée, relance,
 * avoir, renouvellement).
 */
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { INVOICE_STATE_LABELS, invoiceState, type InvoiceKind, type InvoiceState, type InvoiceStatus } from '@communeo/core';
import type { Tone } from '@/components/ui/status-badge';
import { api } from './api';

export interface Invoice {
  documentId: string;
  number: string;
  kind: InvoiceKind;
  reason: 'go_live' | 'renewal' | 'manual' | 'cancellation';
  status: InvoiceStatus;
  creditFor: string | null;
  cancelReason: string | null;
  issuedAt: string;
  dueAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  label: string;
  customerName: string;
  amountHT: number;
  vatRate: number;
  amountTTC: number;
  paidAt: string | null;
  paidAmount: number | null;
  chorusDepositedAt: string | null;
}

/** Champs que seule l'équipe reçoit */
export interface TeamInvoice extends Invoice {
  site: { documentId: string; name: string } | null;
  chorusReference: string | null;
  paymentNote: string | null;
  remindersSent: number;
  lastReminderAt: string | null;
  customerEmail: string;
  customerSiret: string;
}

export interface Renewal {
  enabled: boolean;
  /** Fin de la période en cours : la facture suivante est émise le lendemain */
  periodEnd: string | null;
}

export interface TeamBilling {
  today: string;
  invoices: TeamInvoice[];
  /** Communes en live sans facture en cours */
  uninvoiced: { documentId: string; name: string; hasAcceptedQuote: boolean }[];
  renewals: ({ documentId: string; name: string } & Renewal)[];
  /** Variables d'environnement de l'émetteur non renseignées : factures incomplètes */
  missingSettings: string[];
}

export const invoicesQuery = queryOptions({
  queryKey: ['factures'],
  queryFn: () => api<{ data: { invoices: Invoice[]; renewal: Renewal | null } }>('/api/billing/invoices').then((response) => response.data),
});

export const teamBillingQuery = queryOptions({
  queryKey: ['equipe', 'facturation'],
  queryFn: () => api<{ data: TeamBilling }>('/api/billing/team').then((response) => response.data),
});

export const invoicePdfUrl = (documentId: string) => `/api/billing/invoices/${documentId}/pdf`;

export const markPaid = (documentId: string, values: { paidAt: string; amount: number; note: string }) =>
  api<{ data: TeamInvoice }>(`/api/billing/team/invoices/${documentId}/paid`, { method: 'POST', json: values });
export const markDeposited = (documentId: string, values: { depositedAt: string; reference: string }) =>
  api<{ data: TeamInvoice }>(`/api/billing/team/invoices/${documentId}/chorus`, { method: 'POST', json: values });
export const remind = (documentId: string) => api<{ data: TeamInvoice }>(`/api/billing/team/invoices/${documentId}/remind`, { method: 'POST' });
export const cancelInvoice = (documentId: string, reason: string) =>
  api<{ data: TeamInvoice }>(`/api/billing/team/invoices/${documentId}/cancel`, { method: 'POST', json: { reason } });
export const issueFirstInvoice = (siteDocumentId: string) =>
  api<{ data: TeamInvoice }>(`/api/billing/team/sites/${siteDocumentId}/invoice`, { method: 'POST' });
export const setRenewal = (siteDocumentId: string, enabled: boolean) =>
  api(`/api/billing/team/sites/${siteDocumentId}/renewal`, { method: 'PUT', json: { enabled } });

/** Une action de l'équipe change aussi la fiche de la commune et son journal */
export const refreshBilling = (client: QueryClient) => client.invalidateQueries({ queryKey: ['equipe'] });

export const stateOf = (invoice: Invoice, today?: string): InvoiceState => invoiceState(invoice, today);

const TONES: Record<InvoiceState, Tone> = {
  pending: 'info',
  overdue: 'danger',
  paid: 'success',
  cancelled: 'neutral',
  credit_note: 'warning',
};

export const stateBadge = (state: InvoiceState) => ({ tone: TONES[state], label: INVOICE_STATE_LABELS[state] });

/** « 28 septembre 2026 » d'un jour du calendrier (« 2026-09-28 ») */
export const formatCalendarDay = (day: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`));

/** « 28/09/2026 », pour les tableaux */
export const formatShortDay = (day: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`));
