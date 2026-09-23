/**
 * Réglages du Site (écrans « Mon site ») : lecture et enregistrement explicite (bouton « Enregistrer »).
 * Un réglage enregistré est visible à la prochaine mise en ligne ; la preview peut le montrer avant.
 */
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import type { NavigationConfig } from '@communeo/core';
import { api } from './api';

export interface SiteSettings {
  documentId: string;
  updatedAt: string;
  theme: string | null;
  comarquage_enabled: boolean | null;
  open_data_enabled: boolean | null;
  navigation_config: Partial<NavigationConfig> | null;
  /** Notes de la page Collecte des déchets */
  waste_notes: string | null;
}

const FIELDS = ['updatedAt', 'theme', 'comarquage_enabled', 'open_data_enabled', 'navigation_config', 'waste_notes'];

export const siteSettingsQuery = (siteDocumentId: string) =>
  queryOptions({
    queryKey: ['site-settings', siteDocumentId],
    queryFn: async () =>
      (
        await api<{ data: SiteSettings }>(
          `/api/sites/${siteDocumentId}?${FIELDS.map((field, index) => `fields[${index}]=${field}`).join('&')}`,
        )
      ).data,
    staleTime: 60_000,
  });

export async function saveSiteSettings(
  client: QueryClient,
  siteDocumentId: string,
  data: Partial<Omit<SiteSettings, 'documentId' | 'updatedAt'>>,
) {
  const response = await api<{ data: SiteSettings }>(`/api/sites/${siteDocumentId}`, { method: 'PUT', json: { data } });
  client.setQueryData(siteSettingsQuery(siteDocumentId).queryKey, (current) => ({
    ...current!,
    ...data,
    updatedAt: response.data.updatedAt,
  }));
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
