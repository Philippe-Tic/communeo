/**
 * Tableau de bord (#147) : prochains événements et derniers contenus modifiés. Les autres blocs
 * reprennent les requêtes des écrans concernés (messages, alertes, mise en ligne, conformité),
 * pour partager leur cache.
 */
import { queryOptions } from '@tanstack/react-query';
import { api } from './api';
import type { ContentApi } from './content-list';

export interface UpcomingEvent {
  documentId: string;
  title: string;
  start_date: string;
}

/** Trois prochains événements (brouillons compris : l'état de publication est lu à part) */
export const upcomingEventsQuery = queryOptions({
  queryKey: ['tableau-de-bord', 'evenements'],
  queryFn: async () => {
    const search = new URLSearchParams({
      status: 'draft',
      'fields[0]': 'title',
      'fields[1]': 'start_date',
      'filters[start_date][$gte]': new Date().toISOString(),
      'sort[0]': 'start_date:asc',
      'pagination[pageSize]': '3',
    });
    return (await api<{ data: UpcomingEvent[] }>(`/api/evenements?${search}`)).data;
  },
});

export interface RecentContent {
  type: Exclude<ContentApi, 'official-documents'>;
  documentId: string;
  title: string;
  updatedAt: string;
}

const RECENT_TYPES: RecentContent['type'][] = ['articles', 'pages', 'evenements'];

/** Trois derniers contenus modifiés, tous types confondus */
export const recentContentsQuery = queryOptions({
  queryKey: ['tableau-de-bord', 'derniers-contenus'],
  queryFn: async () => {
    const lists = await Promise.all(
      RECENT_TYPES.map(async (type) => {
        const search = new URLSearchParams({
          status: 'draft',
          'fields[0]': 'title',
          'fields[1]': 'updatedAt',
          'sort[0]': 'updatedAt:desc',
          'pagination[pageSize]': '3',
        });
        const { data } = await api<{ data: Omit<RecentContent, 'type'>[] }>(`/api/${type}?${search}`);
        return data.map((entry) => ({ ...entry, type }));
      }),
    );
    return lists
      .flat()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 3);
  },
});

export const CONTENT_LABELS: Record<RecentContent['type'], { label: string; to: string }> = {
  articles: { label: 'Actualité', to: '/actualites/$documentId' },
  pages: { label: 'Page', to: '/pages/$documentId' },
  evenements: { label: 'Événement', to: '/agenda/$documentId' },
};
