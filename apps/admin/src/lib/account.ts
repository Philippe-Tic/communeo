/**
 * Mon compte (#367) : prénom, nom et mot de passe de la personne connectée. L'adresse e-mail, le rôle
 * et la commune ne se changent pas ici (le backend refuse tout autre champ).
 */
import type { QueryClient } from '@tanstack/react-query';
import { api } from './api';
import { sessionQuery, type SessionUser } from './session';

export interface OwnProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  municipality_role: SessionUser['municipality_role'];
}

/** Enregistre le nom et met à jour la session (en-tête, menu du compte) sans la recharger */
export async function updateProfile(client: QueryClient, values: { first_name: string; last_name: string }) {
  const { data } = await api<{ data: OwnProfile }>('/api/user-management/me', {
    method: 'PUT',
    json: { data: { first_name: values.first_name.trim(), last_name: values.last_name.trim() } },
  });
  client.setQueryData(sessionQuery.queryKey, (user) => (user ? { ...user, first_name: data.first_name, last_name: data.last_name } : user));
  return data;
}

/**
 * Change le mot de passe ; Strapi pose un nouveau cookie de session et ferme les autres sessions.
 * Mot de passe actuel faux : `ApiError` 400 avec `details.field === 'currentPassword'`.
 */
export const changePassword = (currentPassword: string, password: string) =>
  api<{ ok: true }>('/api/user-management/me/password', {
    method: 'PUT',
    json: { currentPassword, password, passwordConfirmation: password },
  });

/** Mot de passe actuel oublié : lien de réinitialisation envoyé à l'adresse du compte */
export const sendOwnPasswordReset = () => api<{ ok: true }>('/api/user-management/me/reset-password', { method: 'POST' });
