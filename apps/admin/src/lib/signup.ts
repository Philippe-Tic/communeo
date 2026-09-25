/**
 * Inscription d'une mairie en libre-service (#309) : routes publiques de l'API.
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

/** `sent` : confirmation envoyée à l'adresse officielle `to` ; `review` : vérification par l'équipe */
export type SignupResult = { status: 'sent'; to: string } | { status: 'review' };

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

/** Crée la commune ; renvoie le jeton d'invitation qui mène au choix du mot de passe */
export const confirmSignup = (token: string) =>
  api<{ data: { invitation: string } }>('/api/signup/confirm', { method: 'POST', json: { jeton: token } }).then((response) => response.data.invitation);

/** Adresse des conditions d'utilisation (page publique de Communeo), si elle est configurée */
export const TERMS_URL = import.meta.env.VITE_TERMS_URL as string | undefined;
