/**
 * Réglages du Site (écrans « Mon site ») : lecture et enregistrement explicite (bouton « Enregistrer »).
 * Un réglage enregistré est visible à la prochaine mise en ligne ; la preview peut le montrer avant.
 */
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import type { NavigationConfig, OpeningHours } from '@communeo/core';
import { api } from './api';
import type { LibraryFile } from './media-library';
import { sessionQuery } from './session';

/** Informations pratiques (composant legal.infos-pratiques) */
export interface PracticalInfo {
  opening_hours: OpeningHours | null;
  population: number | null;
  contact_form_intro: string | null;
  latitude: number | null;
  longitude: number | null;
}

/** Mentions légales (composant legal.mentions-legales) ; l'hébergeur est renseigné par Communeo */
export interface LegalNotice {
  siret: string | null;
  publication_director: string | null;
  publication_director_title: string | null;
  hebergeur_name: string | null;
  hebergeur_address: string | null;
  hebergeur_phone: string | null;
  credits: unknown;
  mentions_legales_extra: unknown;
}

export interface PrivacySettings {
  rgpd_policy: unknown;
  dpo_name: string | null;
  dpo_email: string | null;
  dpo_phone: string | null;
}

export type AccessibilityLevel = 'non-conforme' | 'partiellement-conforme' | 'conforme';

export interface AccessibilitySettings {
  accessibility_level: AccessibilityLevel | null;
  accessibility_declaration: unknown;
  accessibility_schema_url: string | null;
  accessibility_action_plan_url: string | null;
}

export interface SocialLink {
  platform: 'facebook' | 'instagram' | 'linkedin' | 'x' | 'youtube' | 'tiktok' | 'autre';
  url: string;
  label: string | null;
}

export interface SiteSettings {
  documentId: string;
  updatedAt: string;
  name: string;
  theme: string | null;
  logo: LibraryFile | null;
  favicon: LibraryFile | null;
  contact_mail: string | null;
  contact_phone: string | null;
  address: string | null;
  infos_pratiques: PracticalInfo | null;
  mentions_legales: LegalNotice | null;
  rgpd: PrivacySettings | null;
  accessibilite: AccessibilitySettings | null;
  social_links: SocialLink[] | null;
  code_insee: string | null;
  comarquage_audiences: string[] | null;
  open_data_url: string | null;
  open_data_platform: 'data-gouv-fr' | 'opendatasoft' | 'custom' | 'none' | null;
  comarquage_enabled: boolean | null;
  open_data_enabled: boolean | null;
  navigation_config: Partial<NavigationConfig> | null;
  /** Notes de la page Collecte des déchets */
  waste_notes: string | null;
  /** Assistant de création (commune créée par l'équipe) ; absent : pas d'assistant */
  onboarding: OnboardingProgress | null;
}

export interface OnboardingProgress {
  /** Étape où reprendre (1 à 7) */
  step: number;
  /** « Enregistrer et continuer plus tard » : plus de redirection, une carte sur le tableau de bord */
  postponedAt?: string | null;
  completedAt?: string | null;
}

const FIELDS = [
  'updatedAt',
  'name',
  'theme',
  'contact_mail',
  'contact_phone',
  'address',
  'comarquage_enabled',
  'comarquage_audiences',
  'code_insee',
  'open_data_enabled',
  'open_data_url',
  'open_data_platform',
  'navigation_config',
  'waste_notes',
  'onboarding',
];
/** Composants et fichiers : chaque écran de réglages enregistre les siens en entier */
const POPULATE = ['logo', 'favicon', 'infos_pratiques', 'mentions_legales', 'rgpd', 'accessibilite', 'social_links'];

export const siteSettingsQuery = (siteDocumentId: string) =>
  queryOptions({
    queryKey: ['site-settings', siteDocumentId],
    queryFn: async () =>
      (
        await api<{ data: SiteSettings }>(
          `/api/sites/${siteDocumentId}?${[
            ...FIELDS.map((field, index) => `fields[${index}]=${field}`),
            ...POPULATE.map((field) => `populate[${field}]=true`),
          ].join('&')}`,
        )
      ).data,
    staleTime: 60_000,
  });

type SettingsValues = Partial<Omit<SiteSettings, 'documentId' | 'updatedAt'>>;

/**
 * Enregistre des réglages du Site. `cached` : les mêmes valeurs telles que l'admin les affiche,
 * quand l'envoi diffère (fichiers envoyés par identifiant).
 */
export async function saveSiteSettings(
  client: QueryClient,
  siteDocumentId: string,
  data: Record<string, unknown>,
  cached: SettingsValues = data as SettingsValues,
) {
  const response = await api<{ data: SiteSettings }>(`/api/sites/${siteDocumentId}`, { method: 'PUT', json: { data } });
  client.setQueryData(siteSettingsQuery(siteDocumentId).queryKey, (current) => ({
    ...current!,
    ...cached,
    updatedAt: response.data.updatedAt,
  }));
  // Nom de la commune et thème : repris dans la barre latérale et l'en-tête
  if (typeof cached.name === 'string' || typeof cached.theme === 'string') {
    client.setQueryData(sessionQuery.queryKey, (user) =>
      user?.site
        ? {
            ...user,
            site: {
              ...user.site,
              ...(typeof cached.name === 'string' ? { name: cached.name } : {}),
              ...(typeof cached.theme === 'string' ? { theme: cached.theme } : {}),
            },
          }
        : user,
    );
  }
  // État de mise en ligne de l'en-tête : un réglage enregistré attend la prochaine mise en ligne
  void client.invalidateQueries({ queryKey: ['publication'] });
}

export interface PageSummary {
  documentId: string;
  title: string;
  slug: string;
}

/** Toutes les pages de la commune (brouillons compris), pour les choisir dans le menu */
export const allPagesQuery = queryOptions({
  queryKey: ['pages', 'toutes'],
  queryFn: async () => {
    const pages: PageSummary[] = [];
    for (let page = 1; ; page += 1) {
      const response = await api<{ data: PageSummary[]; meta: { pagination: { pageCount: number } } }>(
        `/api/pages?status=draft&fields[0]=title&fields[1]=slug&sort[0]=title:asc&pagination[page]=${page}&pagination[pageSize]=100`,
      );
      pages.push(...response.data);
      if (page >= response.meta.pagination.pageCount) return pages;
    }
  },
});
