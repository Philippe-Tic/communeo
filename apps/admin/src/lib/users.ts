/**
 * Utilisateurs de la commune (administrateurs) : invitation, rôle, désactivation, suppression.
 * Un compte invité reste bloqué tant que la personne n'a pas choisi son mot de passe ; un compte
 * désactivé (`active: false`) ne peut plus se connecter et sa session en cours est coupée.
 */
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { api } from './api';

export type Role = 'admin' | 'editor';

export interface CommuneUser {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  municipality_role: Role | 'super_admin';
  /** Invitation pas encore acceptée */
  blocked: boolean;
  /** `false` : compte désactivé */
  active: boolean | null;
  createdAt: string;
}

export type UserState = 'active' | 'invited' | 'disabled';

export const stateOf = (user: CommuneUser): UserState =>
  user.active === false ? 'disabled' : user.blocked ? 'invited' : 'active';

export const ROLES: Array<{ value: Role; label: string; description: string }> = [
  {
    value: 'editor',
    label: 'Éditeur',
    description:
      'Rédige et publie les contenus, répond aux messages. Ne gère ni les utilisateurs, ni le thème, ni le domaine.',
  },
  {
    value: 'admin',
    label: 'Administrateur',
    description: 'Tout ce que fait un éditeur, plus les utilisateurs, le thème, le domaine et les réglages légaux.',
  },
];

export const roleLabel = (role: CommuneUser['municipality_role']) =>
  role === 'super_admin' ? 'Équipe Communeo' : (ROLES.find((entry) => entry.value === role)?.label ?? role);

export const fullName = (user: Pick<CommuneUser, 'first_name' | 'last_name' | 'email'>) =>
  [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;

export const usersQuery = queryOptions({
  queryKey: ['utilisateurs'],
  queryFn: async () => {
    const { data } = await api<{ data: CommuneUser[] }>('/api/user-management');
    // Administrateurs puis éditeurs, invitations en attente et comptes désactivés à la fin
    const order: Record<UserState, number> = { active: 0, invited: 1, disabled: 2 };
    return [...data]
      .filter((user) => user.municipality_role !== 'super_admin')
      .sort(
        (a, b) =>
          order[stateOf(a)] - order[stateOf(b)] ||
          (a.municipality_role === 'admin' ? -1 : 1) - (b.municipality_role === 'admin' ? -1 : 1) ||
          fullName(a).localeCompare(fullName(b), 'fr'),
      );
  },
});

export const refreshUsers = (client: QueryClient) => client.invalidateQueries({ queryKey: usersQuery.queryKey });

export function inviteUser(values: { first_name: string; last_name: string; email: string; role: Role }) {
  const email = values.email.trim().toLowerCase();
  return api<{ data: CommuneUser }>('/api/user-management', {
    method: 'POST',
    json: {
      data: {
        username: email,
        email,
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        municipality_role: values.role,
      },
    },
  });
}

export const updateUser = (id: number, data: Partial<Pick<CommuneUser, 'municipality_role' | 'active'>>) =>
  api<{ data: CommuneUser }>(`/api/user-management/${id}`, { method: 'PUT', json: { data } });

export const deleteUser = (id: number) => api(`/api/user-management/${id}`, { method: 'DELETE' });
export const resendInvitation = (id: number) => api(`/api/user-management/${id}/resend-invitation`, { method: 'POST' });
export const sendPasswordReset = (id: number) => api(`/api/user-management/${id}/reset-password`, { method: 'POST' });
