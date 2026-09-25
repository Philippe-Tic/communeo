/**
 * Devis en ligne (#312) : offre selon la population INSEE, projet de devis en PDF, validation par un
 * administrateur (vaut demande de passage en live, validée ensuite par l'équipe Communeo).
 */
import { queryOptions } from '@tanstack/react-query';
import { api, auth } from './api';

export interface QuoteSummary {
  documentId: string;
  number: string;
  status: 'signed' | 'accepted' | 'rejected';
  signedAt: string;
  signatoryName: string;
  signatoryRole: string;
  amountHT: number;
  amountTTC: number;
}

export interface QuoteOffer {
  commune: { name: string; insee: string; siret: string | null; address: string | null; billingEmail: string | null };
  offer: { population: number; tierLabel: string; amounts: { ht: number; vatRate: number; vat: number; ttc: number } };
  quote: QuoteSummary | null;
}

export const quoteQuery = queryOptions({
  queryKey: ['devis'],
  queryFn: () => api<{ data: QuoteOffer }>('/api/quote').then((response) => response.data),
  retry: false,
});

export interface QuoteSigning {
  siret: string;
  address: string;
  billingEmail: string;
  signatoryName: string;
  signatoryRole: string;
}

export const signQuote = (values: QuoteSigning) =>
  api<{ data: QuoteSummary }>('/api/quote/sign', { method: 'POST', json: { ...values, accept: true } });

/** Projet de devis avec la saisie en cours (s'ouvre dans un nouvel onglet) */
export const draftQuoteUrl = (values: Partial<Pick<QuoteSigning, 'siret' | 'address' | 'billingEmail'>>) => {
  const search = new URLSearchParams(Object.entries(values).filter((entry): entry is [string, string] => !!entry[1]?.trim()));
  // Équipe Communeo dans l'administration d'une commune : le lien ne porte pas l'en-tête d'impersonation
  const site = auth.impersonatedSite();
  if (site) search.set('site', site);
  return `/api/quote/draft${search.size ? `?${search}` : ''}`;
};

export const quotePdfUrl = (documentId: string) => `/api/quote/${documentId}/pdf`;
