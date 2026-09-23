/**
 * Contenus en Draft & Publish (pages ; actualités et événements ensuite) : lecture du brouillon,
 * enregistrement (brouillon par défaut, voir le middleware site-isolation), publication, suppression.
 */
import { queryOptions } from '@tanstack/react-query';
import type { Block } from '@/components/blocks';
import { api } from './api';

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

export interface PageDocument {
  documentId: string;
  title: string;
  slug: string;
  lead: string | null;
  meta_description: string | null;
  show_in_menu: boolean | null;
  scheduled_at: string | null;
  publishedAt: string | null;
  updatedAt: string;
  blocks: Block[] | null;
}

/** Brouillon avec ses blocs, et savoir s'il existe une version publiée */
export interface PageDraft extends PageDocument {
  published: boolean;
}

const POPULATE = 'populate[blocks][populate]=*';

export const pageQuery = (documentId: string) =>
  queryOptions({
    queryKey: ['pages', documentId],
    queryFn: async (): Promise<PageDraft> => {
      const [draft, published] = await Promise.all([
        api<{ data: PageDocument }>(`/api/pages/${documentId}?status=draft&${POPULATE}`),
        api<{ data: PageDocument | null }>(`/api/pages/${documentId}?status=published&fields[0]=publishedAt`).catch(() => ({ data: null })),
      ]);
      return { ...draft.data, published: !!published.data };
    },
    staleTime: Infinity,
  });

export type PageValues = {
  title: string;
  slug: string;
  lead: string;
  meta_description: string;
  show_in_menu: boolean;
  blocks: Block[];
};

export function pageToValues(page: PageDocument | undefined): PageValues {
  return {
    title: page?.title ?? '',
    slug: page?.slug ?? '',
    lead: page?.lead ?? '',
    meta_description: page?.meta_description ?? '',
    show_in_menu: page?.show_in_menu ?? false,
    blocks: page?.blocks ?? [],
  };
}

function payload(values: PageValues, extra: Record<string, unknown> = {}) {
  return {
    data: {
      title: values.title.trim(),
      // Adresse vide : le backend la génère depuis le titre
      ...(values.slug.trim() ? { slug: values.slug.trim() } : {}),
      lead: values.lead.trim() || null,
      meta_description: values.meta_description.trim() || null,
      show_in_menu: values.show_in_menu,
      blocks: toApiValue(values.blocks),
      ...extra,
    },
  };
}

export async function savePageDraft(documentId: string | null, values: PageValues): Promise<PageDocument> {
  const response = documentId
    ? await api<{ data: PageDocument }>(`/api/pages/${documentId}`, { method: 'PUT', json: payload(values) })
    : await api<{ data: PageDocument }>('/api/pages', { method: 'POST', json: payload(values) });
  return response.data;
}

export async function publishPage(documentId: string | null, values: PageValues): Promise<PageDocument> {
  const body = payload(values, { scheduled_at: null });
  const response = documentId
    ? await api<{ data: PageDocument }>(`/api/pages/${documentId}?status=published`, { method: 'PUT', json: body })
    : await api<{ data: PageDocument }>('/api/pages?status=published', { method: 'POST', json: body });
  return response.data;
}

export async function schedulePage(documentId: string | null, values: PageValues, at: Date): Promise<PageDocument> {
  const body = payload(values, { scheduled_at: at.toISOString() });
  const response = documentId
    ? await api<{ data: PageDocument }>(`/api/pages/${documentId}`, { method: 'PUT', json: body })
    : await api<{ data: PageDocument }>('/api/pages', { method: 'POST', json: body });
  return response.data;
}

export async function deletePage(documentId: string): Promise<void> {
  await api(`/api/pages/${documentId}`, { method: 'DELETE' });
}
