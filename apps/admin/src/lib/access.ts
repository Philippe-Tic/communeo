/**
 * Accès au compte : mot de passe oublié, liens d'invitation et de réinitialisation.
 */
import { queryOptions } from '@tanstack/react-query';
import { api } from './api';

export interface LinkInfo {
  status: 'valid' | 'expired' | 'invalid';
  purpose?: 'invitation' | 'reset';
  firstName?: string | null;
  siteName?: string | null;
  role?: 'admin' | 'editor' | 'super_admin' | null;
  email?: string;
}

export const linkQuery = (token: string) =>
  queryOptions({
    queryKey: ['acces', token],
    queryFn: () => api<LinkInfo>(`/api/user-management/invitation?jeton=${encodeURIComponent(token)}`),
    retry: false,
    staleTime: Infinity,
  });

export const forgotPassword = (email: string) => api<{ ok: true }>('/api/user-management/forgot-password', { method: 'POST', json: { email } });

export const acceptLink = (token: string, password: string) =>
  api<{ ok: true }>('/api/user-management/accept-invitation', { method: 'POST', json: { token, password, passwordConfirmation: password } });

export const requestInvitation = (token: string) => api<{ ok: true }>('/api/user-management/request-invitation', { method: 'POST', json: { jeton: token } });

export const ROLE_LABELS: Record<string, string> = { admin: 'administrateur', editor: 'éditeur', super_admin: 'équipe Communeo' };
