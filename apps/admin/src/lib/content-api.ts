/**
 * Contenus en Draft & Publish (pages, actualités, événements) : lecture du brouillon, enregistrement
 * (brouillon par défaut, voir le middleware site-isolation), publication, programmation, suppression.
 * Chaque type décrit ses valeurs de formulaire et leur envoi (`payload`) ; le reste est commun.
 */
import { queryOptions } from '@tanstack/react-query';
import type { Block } from '@/components/blocks';
import { api } from './api';
import type { ContentApi } from './content-list';

/** Strapi 5 refuse les `id` des composants en écriture : la zone de blocs est réécrite à chaque fois */
export function toApiValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toApiValue);
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    // Fichier de la médiathèque : seul son identifiant est envoyé
    if (typeof object.id === 'number' && ('url' in object || 'mime' in object)) return object.id;
    return Object.fromEntries(Object.entries(object).filter(([key]) => key !== 'id').map(([key, item]) => [key, toApiValue(item)]));
  }
  return value;
}

/** Champs communs aux contenus éditables */
export interface BaseDocument {
  documentId: string;
  title: string;
  slug: string;
  scheduled_at: string | null;
  publishedAt: string | null;
  updatedAt: string;
  blocks?: Block[] | null;
}

/** Brouillon, et savoir s'il existe une version publiée (modifiée depuis ou non) */
export type Draft<D extends BaseDocument> = D & { published: boolean; modified: boolean };

export interface DocumentApi<D extends BaseDocument, V> {
  type: ContentApi;
  query: (documentId: string) => ReturnType<typeof draftQuery<D>>;
  saveDraft: (documentId: string | null, values: V) => Promise<D>;
  publish: (documentId: string | null, values: V) => Promise<D>;
  schedule: (documentId: string | null, values: V, at: Date) => Promise<D>;
  remove: (documentId: string) => Promise<void>;
}

/** Relations lues avec le brouillon : les blocs par défaut */
const BLOCKS = 'populate[blocks][populate]=*';

function draftQuery<D extends BaseDocument>(type: ContentApi, documentId: string, populate = BLOCKS) {
  return queryOptions({
    queryKey: [type, documentId],
    queryFn: async (): Promise<Draft<D>> => {
      // L'état de publication vient de /api/publication : demander la version en ligne d'un contenu
      // jamais publié répondrait 404 (erreur inutile dans la console)
      const [draft, states] = await Promise.all([
        api<{ data: D }>(`/api/${type}/${documentId}?status=draft&${populate}`),
        api<{ data: Record<string, { state: 'draft' | 'published' | 'modified' }> }>(`/api/publication/${type}`),
      ]);
      const state = states.data[documentId]?.state ?? 'draft';
      return { ...draft.data, published: state !== 'draft', modified: state === 'modified' };
    },
    staleTime: Infinity,
  });
}

/** API d'un type : `payload` transforme les valeurs du formulaire en données Strapi */
export function documentApi<D extends BaseDocument, V>(
  type: ContentApi,
  payload: (values: V) => Record<string, unknown>,
  { populate = BLOCKS }: { populate?: string } = {},
): DocumentApi<D, V> {
  const body = (values: V, extra: Record<string, unknown> = {}) => ({ data: { ...payload(values), ...extra } });
  const write = async (documentId: string | null, data: unknown, status?: 'published') => {
    const query = status ? `?status=${status}` : '';
    const response = documentId
      ? await api<{ data: D }>(`/api/${type}/${documentId}${query}`, { method: 'PUT', json: data })
      : await api<{ data: D }>(`/api/${type}${query}`, { method: 'POST', json: data });
    return response.data;
  };
  return {
    type,
    query: (documentId) => draftQuery<D>(type, documentId, populate),
    saveDraft: (documentId, values) => write(documentId, body(values)),
    publish: (documentId, values) => write(documentId, body(values, { scheduled_at: null }), 'published'),
    schedule: (documentId, values, at) => write(documentId, body(values, { scheduled_at: at.toISOString() })),
    remove: async (documentId) => {
      await api(`/api/${type}/${documentId}`, { method: 'DELETE' });
    },
  };
}

/** Texte facultatif : vide → null */
export const optional = (value: string | null | undefined) => value?.trim() || null;

// --- Pages -----------------------------------------------------------------------------------------

export interface PageDocument extends BaseDocument {
  lead: string | null;
  meta_description: string | null;
}
export type PageDraft = Draft<PageDocument>;

export type PageValues = {
  title: string;
  slug: string;
  lead: string;
  meta_description: string;
  blocks: Block[];
};

export function pageToValues(page: PageDocument | undefined): PageValues {
  return {
    title: page?.title ?? '',
    slug: page?.slug ?? '',
    lead: page?.lead ?? '',
    meta_description: page?.meta_description ?? '',
    blocks: page?.blocks ?? [],
  };
}

export const pagesApi = documentApi<PageDocument, PageValues>('pages', (values) => ({
  title: values.title.trim(),
  // Adresse vide : le backend la génère depuis le titre
  ...(values.slug.trim() ? { slug: values.slug.trim() } : {}),
  lead: optional(values.lead),
  meta_description: optional(values.meta_description),
  blocks: toApiValue(values.blocks),
}));

export const pageQuery = pagesApi.query;
export const savePageDraft = pagesApi.saveDraft;
