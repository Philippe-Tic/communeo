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
  /** Assistant de création en cours (commune créée par l'équipe Communeo) */
  onboarding?: { step: number; postponedAt?: string | null; completedAt?: string | null } | null;
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
    // Fiche de l'espace équipe : adresse du site en `liveUrl` (domaine personnalisé compris)
    const { data: site } = await api<{ data: SessionSite & { liveUrl?: string | null; customDomain?: string | null } }>(`/api/site-management/${impersonated}`);
    const liveUrl = site.customDomain ? `https://${site.customDomain}` : (site.liveUrl ?? site.live_url ?? null);
    return { ...user, site: { documentId: site.documentId, name: site.name, slug: site.slug, theme: site.theme, live_url: liveUrl, onboarding: site.onboarding ?? null } };
  },
  staleTime: 5 * 60 * 1000,
  retry: false,
});

/** `remember` : session de 30 jours ; sinon, elle se ferme après 8 heures d'inactivité */
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
