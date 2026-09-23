/**
 * Listes de contenus (gabarit #134) : lecture paginée des brouillons par l'API REST de Strapi,
 * avec l'état de publication de chaque document (GET /api/publication/:type), que l'API REST
 * ne donne pas. Actions communes : publier, dépublier, supprimer.
 */
import { keepPreviousData, queryOptions, type QueryClient } from '@tanstack/react-query';
import { api } from './api';

export type PublicationState = 'draft' | 'published' | 'modified';
export interface Publication {
  state: PublicationState;
  scheduledAt: string | null;
}
export type PublicationMap = Record<string, Publication>;

/** Types de contenu en Draft & Publish, par leur nom d'API (« pages », « articles »…) */
export type ContentApi = 'pages' | 'articles' | 'evenements' | 'official-documents';

export const publicationStatesQuery = (type: ContentApi) =>
  queryOptions({
    queryKey: ['publication-states', type],
    queryFn: async () => (await api<{ data: PublicationMap }>(`/api/publication/${type}`)).data,
  });

export type StatusFilter = 'brouillon' | 'publie' | 'programme';

export interface ListParams {
  q: string;
  statut?: StatusFilter;
  /** Filtres propres au type : champ Strapi → valeur */
  filters: Record<string, string>;
  sort: string;
  order: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface ListSource {
  type: ContentApi;
  /** Champs lus pour la liste (documentId et updatedAt toujours inclus) */
  fields: string[];
  /** Images : champ média → vignette */
  media?: string[];
  searchField: string;
}

export interface ListResult<T> {
  rows: T[];
  total: number;
  pageCount: number;
}

/** Adresse de la requête REST : brouillons, recherche, filtres, tri, page */
export function listUrl(source: ListSource, params: ListParams, states: PublicationMap): string | null {
  const search = new URLSearchParams({ status: 'draft' });
  [...new Set(['documentId', 'updatedAt', 'scheduled_at', ...source.fields])].forEach((field, index) => search.set(`fields[${index}]`, field));
  for (const field of source.media ?? []) {
    ['url', 'formats', 'alternativeText'].forEach((attribute, index) => search.set(`populate[${field}][fields][${index}]`, attribute));
  }
  if (params.q.trim()) search.set(`filters[${source.searchField}][$containsi]`, params.q.trim());
  for (const [field, value] of Object.entries(params.filters)) search.set(`filters[${field}][$eq]`, value);

  // Statut : l'état de publication vient de /api/publication ; on filtre par identifiants.
  // Les brouillons jamais publiés sont peu nombreux : c'est cette liste qui part dans l'adresse.
  const neverPublished = Object.entries(states)
    .filter(([, entry]) => entry.state === 'draft')
    .map(([documentId]) => documentId);
  if (params.statut === 'programme') search.set('filters[scheduled_at][$notNull]', 'true');
  if (params.statut === 'brouillon') {
    if (neverPublished.length === 0) return null;
    search.set('filters[scheduled_at][$null]', 'true');
    neverPublished.forEach((documentId, index) => search.set(`filters[documentId][$in][${index}]`, documentId));
  }
  if (params.statut === 'publie') neverPublished.forEach((documentId, index) => search.set(`filters[documentId][$notIn][${index}]`, documentId));

  search.set('sort[0]', `${params.sort}:${params.order}`);
  search.set('sort[1]', 'documentId:asc');
  search.set('pagination[page]', String(params.page));
  search.set('pagination[pageSize]', String(params.pageSize));
  return `/api/${source.type}?${search}`;
}

export const listQuery = <T>(client: QueryClient, source: ListSource, params: ListParams) =>
  queryOptions({
    queryKey: ['list', source.type, params],
    queryFn: async (): Promise<ListResult<T>> => {
      // fetchQuery (et non ensureQueryData) : après une publication, les états invalidés sont relus
      const states = params.statut ? await client.fetchQuery(publicationStatesQuery(source.type)) : {};
      const url = listUrl(source, params, states);
      if (!url) return { rows: [], total: 0, pageCount: 0 };
      const response = await api<{ data: T[]; meta: { pagination: { total: number; pageCount: number } } }>(url);
      return { rows: response.data, total: response.meta.pagination.total, pageCount: response.meta.pagination.pageCount };
    },
    placeholderData: keepPreviousData,
  });

/**
 * Après une modification : listes, états de publication, et « Mise en ligne » de l'en-tête
 * (sauf pour un simple brouillon, `draftOnly`, qui ne change pas le site en ligne).
 */
export async function refreshContent(client: QueryClient, type: ContentApi, { draftOnly = false } = {}) {
  await Promise.all([
    client.invalidateQueries({ queryKey: ['publication-states', type] }),
    client.invalidateQueries({ queryKey: ['list', type] }),
    // État de mise en ligne de l'en-tête (lib/publication.ts)
    draftOnly ? undefined : client.invalidateQueries({ queryKey: ['publication'] }),
  ]);
}

/** Publie le brouillon tel quel (et annule une publication programmée) */
export const publishDocument = (type: ContentApi, documentId: string) =>
  api(`/api/${type}/${documentId}?status=published`, { method: 'PUT', json: { data: { scheduled_at: null } } });

/** Retire la version en ligne, garde le brouillon (jamais `DELETE ?status=published`, qui supprime tout) */
export const unpublishDocument = (type: ContentApi, documentId: string) => api(`/api/publication/${type}/${documentId}/unpublish`, { method: 'POST' });

export const deleteDocument = (type: ContentApi, documentId: string) => api(`/api/${type}/${documentId}`, { method: 'DELETE' });
