/**
 * Espace de l'équipe Communeo (super admin) : communes de la plateforme, fiche, création, suspension,
 * entrée dans l'administration d'une commune (bandeau « Mode équipe Communeo »).
 */
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { api, auth } from './api';
import type { CommuneUser } from './users';

export type CommunePublication = 'new' | 'running' | 'failed' | 'pending' | 'ok';

export interface CommuneSummary {
  documentId: string;
  name: string;
  slug: string;
  theme: string | null;
  liveUrl: string | null;
  customDomain: string | null;
  population: number | null;
  suspended: boolean;
  plan: 'trial' | 'live' | 'expired';
  trialEndsAt: string | null;
  trialExpiredAt: string | null;
  liveRequestedAt: string | null;
  onboarding?: { step: number; postponedAt?: string | null; completedAt?: string | null } | null;
  createdAt: string;
  lastActivity: string;
  publication: { state: CommunePublication; at: string | null; pendingCount: number };
  users: { active: number; invited: number };
}

export interface CommuneDetail extends CommuneSummary {
  domainStatus: 'pending' | 'verified' | 'error' | null;
  sslEnabled: boolean;
  users: CommuneSummary['users'];
  members: CommuneUser[];
  counts: { pages: number; articles: number; documents: number };
  deployments: { succeeded: number; failed: number };
}

export const INACTIVE_DAYS = 30;
export const isInactive = (commune: Pick<CommuneSummary, 'lastActivity'>, now = Date.now()) =>
  now - new Date(commune.lastActivity).getTime() > INACTIVE_DAYS * 86_400_000;

export const communesQuery = queryOptions({
  queryKey: ['equipe', 'communes'],
  queryFn: () => api<{ data: CommuneSummary[] }>('/api/site-management').then((response) => response.data),
});

export const communeQuery = (documentId: string) =>
  queryOptions({
    queryKey: ['equipe', 'communes', documentId],
    queryFn: async () => {
      const { data } = await api<{
        data: CommuneSummary & Omit<CommuneDetail, 'members' | 'users'> & { users: CommuneUser[] };
      }>(`/api/site-management/${documentId}`);
      // La fiche renvoie la liste des comptes ; le résumé les compte
      const members = data.users;
      return {
        ...data,
        members,
        users: {
          active: members.filter((user) => !user.blocked && user.active !== false).length,
          invited: members.filter((user) => user.blocked && user.active !== false).length,
        },
      } as CommuneDetail;
    },
  });

export const refreshCommunes = (client: QueryClient) => client.invalidateQueries({ queryKey: ['equipe', 'communes'] });

export const slugAvailable = (slug: string) =>
  api<{ available: boolean; reason?: string }>(`/api/site-management/slug-available?slug=${encodeURIComponent(slug)}`);

export const createCommune = (values: {
  name: string;
  slug: string;
  admin_email: string;
  admin_first_name: string;
  admin_last_name: string;
}) => api<{ data: CommuneSummary }>('/api/site-management', { method: 'POST', json: { data: values } });

export const updateCommune = (
  documentId: string,
  data: { name?: string; suspended?: boolean; plan?: 'live'; extendTrialDays?: number },
) =>
  api<{ data: CommuneSummary }>(`/api/site-management/${documentId}`, { method: 'PUT', json: { data } });

/** Ouvre l'administration de la commune : tout le cache est vidé (autre commune, autres données) */
export function enterCommune(client: QueryClient, documentId: string) {
  auth.setImpersonatedSite(documentId);
  client.clear();
}

export const PUBLICATION_LABELS: Record<CommunePublication, string> = {
  new: 'En création',
  running: 'En cours',
  failed: 'Échec',
  pending: 'En attente',
  ok: 'À jour',
};

// --- Utilisateurs et statistiques de la plateforme ------------------------------------------------

export interface PlatformUser extends CommuneUser {
  site: { documentId: string; name: string } | null;
}

export const platformUsersQuery = queryOptions({
  queryKey: ['equipe', 'utilisateurs'],
  queryFn: () => api<{ data: PlatformUser[] }>('/api/user-management').then((response) => response.data),
});

export interface PlatformStats {
  communes: { total: number; thisMonth: number };
  activeUsers: number;
  deployments: { total: number; succeeded: number; medianSeconds: number | null };
  themes: Array<{ theme: string; count: number }>;
}

export const platformStatsQuery = queryOptions({
  queryKey: ['equipe', 'statistiques'],
  queryFn: () => api<{ data: PlatformStats }>('/api/site-management/stats').then((response) => response.data),
});
