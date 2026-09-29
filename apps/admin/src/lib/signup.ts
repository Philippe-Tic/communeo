/**
 * Inscription d'une mairie en libre-service (#309, #337) : routes publiques de l'API (demande,
 * confirmation de l'adresse, réponse de la mairie) et état de l'approbation pour l'administration.
 */
import { queryOptions } from '@tanstack/react-query';
import type { CommuneMatch } from '@communeo/core/client';
import { api } from './api';

export type SignupCommune = CommuneMatch & { taken: boolean };

export interface SignupRequest {
  insee: string;
  first_name: string;
  last_name: string;
  email: string;
  terms: boolean;
  /** Piège à robots, toujours vide */
  website: string;
}

/** Lien de confirmation envoyé à l'adresse saisie `to` */
export type SignupResult = { status: 'sent'; to: string };

/** Qui doit encore approuver l'inscription avant la mise en ligne : la mairie, l'équipe, ou personne */
export type SignupApproval = 'townhall' | 'team' | null;

export interface SignupConfirmation {
  commune: string;
  firstName: string;
  lastName: string;
  email: string;
}

export const searchSignupCommunes = (q: string) =>
  api<{ data: SignupCommune[] }>(`/api/signup/communes?${new URLSearchParams({ q })}`).then((response) => response.data);

export const requestSignup = (request: SignupRequest) =>
  api<{ data: SignupResult }>('/api/signup', { method: 'POST', json: request }).then((response) => response.data);

export const signupConfirmationQuery = (token: string) =>
  queryOptions({
    queryKey: ['inscription', token],
    queryFn: () => api<{ data: SignupConfirmation }>(`/api/signup/confirm?jeton=${encodeURIComponent(token)}`).then((response) => response.data),
    retry: false,
    staleTime: Infinity,
  });

/** Adresse confirmée : crée la commune ; renvoie le jeton d'invitation qui mène au choix du mot de passe */
export const confirmSignup = (token: string) =>
  api<{ data: { invitation: string; approval: SignupApproval } }>('/api/signup/confirm', { method: 'POST', json: { jeton: token } }).then(
    (response) => response.data,
  );

/** Demande que la mairie approuve ou refuse, depuis le lien reçu à son adresse officielle */
export const townHallApprovalQuery = (token: string) =>
  queryOptions({
    queryKey: ['inscription', 'approbation', token],
    queryFn: () => api<{ data: SignupConfirmation }>(`/api/signup/approve?jeton=${encodeURIComponent(token)}`).then((response) => response.data),
    retry: false,
    staleTime: Infinity,
  });

export const approveAsTownHall = (token: string) => api('/api/signup/approve', { method: 'POST', json: { jeton: token } });

/** La mairie n'est pas à l'origine de la demande : la commune créée est supprimée */
export const declineAsTownHall = (token: string) => api('/api/signup/decline', { method: 'POST', json: { jeton: token } });

export interface ApprovalState {
  status: SignupApproval;
  /** Adresse officielle masquée (« m***@saint-aubin.fr ») */
  to: string | null;
  sentAt: string | null;
}

export const approvalStateQuery = queryOptions({
  queryKey: ['inscription', 'etat'],
  queryFn: () => api<{ data: ApprovalState }>('/api/signup/approval').then((response) => response.data),
  staleTime: 60 * 1000,
});

export const resendApproval = () =>
  api<{ data: { to: string; sentAt: string } }>('/api/signup/approval/resend', { method: 'POST' }).then((response) => response.data);

/** Qui doit encore approuver l'inscription de la commune de la session ; `null` : rien n'attend */
export const awaitingApproval = (site: { signup_approval?: SignupApproval } | null | undefined): SignupApproval => site?.signup_approval ?? null;

/** Ce qu'attend la mise en ligne, en une phrase */
export const approvalWaitingLabel = (approval: Exclude<SignupApproval, null>) =>
  approval === 'townhall'
    ? 'Le site sera mis en ligne dès que la mairie aura approuvé sa création, depuis son adresse officielle.'
    : 'Le site sera mis en ligne dès que l’équipe Communeo aura vérifié votre demande.';

/** Adresse des conditions d'utilisation (page publique de Communeo), si elle est configurée */
export const TERMS_URL = import.meta.env.VITE_TERMS_URL as string | undefined;
