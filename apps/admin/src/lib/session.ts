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

/**
 * Un super admin n'a pas de commune : celle qu'il consulte (choisie dans /communes) devient
 * la commune de la session, comme pour un administrateur.
 */
export const sessionQuery = queryOptions({
  queryKey: ['session'],
  queryFn: async (): Promise<SessionUser> => {
    const user = await api<SessionUser>('/api/users/me');
    const impersonated = auth.impersonatedSite();
    if (user.municipality_role !== 'super_admin' || !impersonated) return user;
    const { data: site } = await api<{ data: SessionSite }>(`/api/site-management/${impersonated}`);
    return { ...user, site: { documentId: site.documentId, name: site.name, slug: site.slug, theme: site.theme, live_url: site.live_url } };
  },
  staleTime: 5 * 60 * 1000,
  retry: false,
});

/** `remember` : session de 30 jours au lieu de 12 heures */
export const login = (identifier: string, password: string, remember = false) =>
  api<{ ok: true; expiresIn: number }>('/api/session/login', { method: 'POST', json: { identifier, password, remember } });

/** Super admin sans commune choisie : il passe par la liste des communes */
export const needsSitePicker = (user: SessionUser) => user.municipality_role === 'super_admin' && !user.site;

export const logout = () => api('/api/session/logout', { method: 'POST' });

export function displayName(user: Pick<SessionUser, 'first_name' | 'last_name' | 'email'>): string {
  return [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;
}

export function themeName(themeId: string | null | undefined): string {
  return THEMES.find((theme) => theme.id === themeId)?.name ?? THEMES[0].name;
}
