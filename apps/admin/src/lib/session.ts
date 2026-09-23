/**
 * Session : l'utilisateur connecté et sa commune (GET /api/users/me).
 */
import { queryOptions } from '@tanstack/react-query';
import { THEMES } from '@communeo/core';
import { api, auth } from './api';

export type MunicipalityRole = 'admin' | 'editor' | 'super_admin';

export interface SessionSite {
  documentId: string;
  name: string;
  slug: string;
  theme: string | null;
  live_url: string | null;
}

export interface SessionUser {
  id: number;
  documentId: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  municipality_role: MunicipalityRole;
  site: SessionSite | null;
}

export const sessionQuery = queryOptions({
  queryKey: ['session'],
  queryFn: () => api<SessionUser>('/api/users/me'),
  staleTime: 5 * 60 * 1000,
  retry: false,
});

export const hasSession = () => auth.token() !== null;

export function displayName(user: Pick<SessionUser, 'first_name' | 'last_name' | 'email'>): string {
  return [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;
}

export function themeName(themeId: string | null | undefined): string {
  return THEMES.find((theme) => theme.id === themeId)?.name ?? THEMES[0].name;
}
