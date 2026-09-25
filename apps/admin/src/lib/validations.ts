/**
 * File « À valider » de l'équipe Communeo (#313) : inscriptions sans adresse officielle de mairie et
 * passages en live demandés, validés ou refusés (motif envoyé par e-mail).
 */
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { api } from './api';

export interface SignupToReview {
  id: number;
  communeName: string;
  insee: string;
  firstName: string;
  lastName: string;
  email: string;
  requestedAt: string;
}

export interface LiveRequest {
  documentId: string;
  name: string;
  insee: string | null;
  plan: 'trial' | 'expired';
  trialEndsAt: string | null;
  trialExpiredAt: string | null;
  requestedAt: string;
  /** « Prénom Nom, qualité (e-mail) » de la personne qui a validé le devis */
  requestedBy: string | null;
  /** Devis validé qui accompagne la demande (#312) */
  quote: { documentId: string; number: string; amountHT: number; tierLabel: string; signatory: string; signedAt: string } | null;
}

export const validationsQuery = queryOptions({
  queryKey: ['equipe', 'validations'],
  queryFn: () => api<{ data: { signups: SignupToReview[]; liveRequests: LiveRequest[] } }>('/api/validations').then((response) => response.data),
  refetchInterval: 60_000,
});

export const pendingCount = (data: { signups: unknown[]; liveRequests: unknown[] } | undefined) =>
  data ? data.signups.length + data.liveRequests.length : 0;

export const approveSignup = (id: number) => api<{ data: { documentId: string } }>(`/api/validations/signups/${id}/approve`, { method: 'POST' });
export const rejectSignup = (id: number, reason: string) =>
  api<{ data: { emailed: boolean } }>(`/api/validations/signups/${id}/reject`, { method: 'POST', json: { reason } });
export const approveLive = (documentId: string) => api(`/api/validations/live/${documentId}/approve`, { method: 'POST' });
export const rejectLive = (documentId: string, reason: string) =>
  api(`/api/validations/live/${documentId}/reject`, { method: 'POST', json: { reason } });

/** Une décision change aussi la liste et les fiches des communes */
export const refreshValidations = (client: QueryClient) => client.invalidateQueries({ queryKey: ['equipe'] });
