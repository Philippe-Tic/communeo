/**
 * Journal d'activité (#190) : GET /api/activity-log. Équipe Communeo : toutes les communes (filtre
 * par commune) ; administrateur : sa commune, actions de l'équipe comprises. Gardé 6 mois.
 */
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { api } from './api';

export type ActivityAction =
  | 'login'
  | 'publish'
  | 'unpublish'
  | 'delete'
  | 'theme_change'
  | 'domain_change'
  | 'user_invite'
  | 'role_change'
  | 'user_deactivate'
  | 'user_reactivate'
  | 'user_delete'
  | 'commune_create'
  | 'commune_suspend'
  | 'commune_unsuspend'
  | 'commune_delete'
  | 'trial_extend'
  | 'trial_expire'
  | 'live_request'
  | 'commune_go_live'
  | 'live_reject'
  | 'signup_reject'
  | 'quote_sign';

export interface ActivityEntry {
  id: number;
  at: string;
  action: ActivityAction;
  actorName: string | null;
  /** Action de l'équipe Communeo dans l'administration de la commune */
  onBehalf: boolean;
  target: { type: string; id: string | null; label: string | null } | null;
  site: { documentId: string; name: string } | null;
  /** Adresse IP d'une connexion (équipe Communeo seulement) */
  ip?: string | null;
  details: Record<string, unknown> | null;
}

export interface ActivityParams {
  page: number;
  action?: ActivityAction;
  site?: string;
}

export const activityQuery = (params: ActivityParams) =>
  queryOptions({
    queryKey: ['journal', params],
    queryFn: () => {
      const search = new URLSearchParams({ page: String(params.page) });
      if (params.action) search.set('action', params.action);
      if (params.site) search.set('site', params.site);
      return api<{ data: ActivityEntry[]; meta: { pagination: { total: number; pageCount: number } } }>(
        `/api/activity-log?${search}`,
      );
    },
    placeholderData: keepPreviousData,
  });

export const ACTION_LABELS: Record<ActivityAction, string> = {
  login: 'Connexion',
  publish: 'Publication',
  unpublish: 'Retrait du site',
  delete: 'Suppression',
  theme_change: 'Changement de thème',
  domain_change: 'Domaine',
  user_invite: 'Invitation',
  role_change: 'Changement de rôle',
  user_deactivate: 'Compte désactivé',
  user_reactivate: 'Compte réactivé',
  user_delete: 'Compte supprimé',
  commune_create: 'Commune créée',
  commune_suspend: 'Commune suspendue',
  commune_unsuspend: 'Suspension levée',
  commune_delete: 'Commune supprimée',
  trial_extend: 'Essai prolongé',
  trial_expire: 'Essai terminé',
  live_request: 'Passage en live demandé',
  commune_go_live: 'Passage en live',
  live_reject: 'Passage en live refusé',
  signup_reject: 'Inscription refusée',
  quote_sign: 'Devis validé',
};

/** Actions qu'une commune voit (les autres concernent la plateforme) */
export const COMMUNE_ACTIONS: ActivityAction[] = [
  'login',
  'publish',
  'unpublish',
  'delete',
  'theme_change',
  'domain_change',
  'user_invite',
  'role_change',
  'user_deactivate',
  'user_reactivate',
  'user_delete',
  'trial_extend',
  'trial_expire',
  'live_request',
  'commune_go_live',
  'live_reject',
  'quote_sign',
];

const TYPE_LABELS: Record<string, string> = {
  article: 'Actualité',
  page: 'Page',
  evenement: 'Événement',
  'official-document': 'Document officiel',
  alerte: 'Alerte',
  'team-member': 'Équipe municipale',
  association: 'Association',
  'contact-submission': 'Message',
  'newsletter-subscriber': 'Abonné à la newsletter',
  'media-item': 'Fichier',
  'school-menu': 'Menu de la cantine',
  'waste-schedule': 'Collecte des déchets',
  site: 'Site',
  'signup-request': "Demande d'inscription",
  quote: 'Devis',
  user: 'Compte',
  domain: 'Domaine',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  editor: 'Éditeur',
  super_admin: 'Équipe Communeo',
};

/** Ce qui a été touché, en une ligne : « Actualité — Brocante de printemps », « Éditeur → Administrateur » */
export function describeTarget(entry: ActivityEntry, themeName: (id: string) => string): string {
  const details = entry.details ?? {};
  if (entry.action === 'theme_change')
    return `${themeName(String(details.from ?? ''))} → ${themeName(String(details.to ?? ''))}`;
  if (entry.action === 'role_change')
    return `${entry.target?.label ?? ''} : ${ROLE_LABELS[String(details.from)] ?? details.from} → ${ROLE_LABELS[String(details.to)] ?? details.to}`;
  if (entry.action === 'domain_change')
    return `${details.change === 'remove' ? 'Retiré' : 'Configuré'}${entry.target?.label ? ` : ${entry.target.label}` : ''}`;
  if (entry.action === 'login') return entry.ip ? `Adresse IP ${entry.ip}` : '';
  // La commune elle-même : déjà dans la colonne Commune (équipe) ou c'est la sienne (administrateur)
  if (entry.action.startsWith('commune_')) return '';
  if (!entry.target) return '';
  const type = TYPE_LABELS[entry.target.type];
  return [type, entry.target.label].filter(Boolean).join(' — ');
}
