/**
 * Historique des versions d'un contenu (#183) : GET /api/content-versions/:type/:documentId,
 * lecture d'une version, brouillon gardé avant une restauration (la restauration se fait dans
 * l'éditeur : nouveau brouillon, version en ligne intacte).
 */
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { ContentApi } from './content-list';

export interface VersionSummary {
  id: number;
  at: string;
  /** `draft` : brouillon gardé avant une restauration */
  kind: 'published' | 'draft';
  summary: string | null;
  blockCount: number | null;
  authorName: string | null;
  /** Version actuellement en ligne */
  live: boolean;
}

export const versionsQuery = (type: ContentApi, documentId: string) =>
  queryOptions({
    queryKey: ['versions', type, documentId],
    queryFn: () =>
      api<{ data: VersionSummary[]; meta: { createdAt: string } }>(`/api/content-versions/${type}/${documentId}`),
    staleTime: 0,
  });

export const versionQuery = (type: ContentApi, documentId: string, id: number) =>
  queryOptions({
    queryKey: ['versions', type, documentId, id],
    queryFn: () =>
      api<{ data: { id: number; at: string; kind: VersionSummary['kind']; snapshot: Record<string, unknown> } }>(
        `/api/content-versions/${type}/${documentId}/${id}`,
      ).then((response) => response.data),
    staleTime: Infinity,
  });

export const keepDraft = (type: ContentApi, documentId: string) =>
  api(`/api/content-versions/${type}/${documentId}/checkpoint`, { method: 'POST' });

export const refreshVersions = (client: QueryClient, type: ContentApi, documentId: string) =>
  client.invalidateQueries({ queryKey: ['versions', type, documentId] });

/** « la version d'aujourd'hui, 09:12 », « d'hier, 17:40 », « du 18 sept., 11:05 » */
export function versionDateText(listDate: string): string {
  if (listDate.startsWith("Aujourd'hui")) return `d'aujourd'hui${listDate.slice("Aujourd'hui".length)}`;
  if (listDate.startsWith('Hier')) return `d'hier${listDate.slice('Hier'.length)}`;
  return `du ${listDate}`;
}

type Block = { __component: string } & Record<string, unknown>;

/** Texte brut d'un texte riche (TipTap) */
export function plainText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  const node = value as { text?: string; content?: unknown[] };
  if (typeof node.text === 'string') return node.text;
  return (node.content ?? []).map(plainText).join(' ').replace(/\s+/g, ' ').trim();
}

const fileName = (file: unknown) =>
  file && typeof file === 'object' ? String((file as { name?: string }).name ?? '') : '';
const clip = (text: string, max = 140) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** Ce que contient un bloc, en une ligne (fenêtres « Voir » et « Comparer ») */
export function blockExcerpt(block: Block): string {
  switch (block.__component) {
    case 'blocks.text':
      return clip(plainText(block.body));
    case 'blocks.image':
      return [fileName(block.image), block.caption].filter(Boolean).join(' — ') || 'Image';
    case 'blocks.buttons':
      return ((block.buttons as Array<{ label?: string }>) ?? [])
        .map((button) => button.label)
        .filter(Boolean)
        .join(', ');
    case 'blocks.callout':
      return clip([block.title, plainText(block.body)].filter(Boolean).join(' — '));
    case 'blocks.documents': {
      const files = (block.files as unknown[]) ?? [];
      return [block.title, `${files.length} fichier${files.length > 1 ? 's' : ''}`].filter(Boolean).join(' — ');
    }
    case 'blocks.gallery': {
      const images = (block.images as unknown[]) ?? [];
      return [block.title, `${images.length} image${images.length > 1 ? 's' : ''}`].filter(Boolean).join(' — ');
    }
    case 'blocks.faq':
      return clip(
        ((block.items as Array<{ question?: string }>) ?? [])
          .map((item) => item.question)
          .filter(Boolean)
          .join(' · '),
      );
    case 'blocks.contact':
      return String(block.name ?? '');
    case 'blocks.video':
      return String(block.title || block.url || '');
    default:
      return '';
  }
}
