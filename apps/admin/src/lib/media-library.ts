/**
 * Médiathèque (#142) : fiches de la commune (nom, dossier, auteur de l'envoi) et leur fichier
 * (texte alternatif, légende, crédit portés par le fichier et repris partout, #189). Envois
 * multiples avec progression par fichier, qui continuent pendant la navigation.
 */
import { infiniteQueryOptions, queryOptions, type QueryClient } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import { api, ApiError, auth } from './api';
import { checkFile, DOCUMENT_TYPES, IMAGE_TYPES, type UploadedFile } from './media';

export const LIBRARY_TYPES = [...IMAGE_TYPES, 'image/svg+xml', ...DOCUMENT_TYPES];

export interface LibraryFile extends UploadedFile {
  alternativeText: string | null;
  caption: string | null;
  credit: string | null;
  width: number | null;
  height: number | null;
  formats?: { thumbnail?: { url: string }; small?: { url: string } } | null;
}

export interface MediaItem {
  documentId: string;
  name: string;
  folder: string | null;
  uploaded_by_name: string | null;
  createdAt: string;
  file: LibraryFile;
}

export interface MediaFilters {
  q: string;
  folder?: string;
  kind?: 'images' | 'documents';
  missingAlt?: boolean;
}

export const isImage = (file: Pick<LibraryFile, 'mime'> | null | undefined) => !!file?.mime?.startsWith('image/');
export const needsAlt = (item: MediaItem) => isImage(item.file) && !item.file.alternativeText?.trim();
export const thumbnailOf = (file: LibraryFile) => file.formats?.small?.url ?? file.formats?.thumbnail?.url ?? file.url;

export const PAGE_SIZE = 48;

/**
 * Image d'un contenu (image principale) : à la publication, une image sans texte alternatif est
 * signalée ; l'erreur mène au bouton « Ajouter le texte alternatif » du champ.
 */
export const imageSchema = z.custom<LibraryFile | null>().superRefine((file, ctx) => {
  if (file && isImage(file) && !file.alternativeText?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['alternativeText'], message: "Texte alternatif manquant sur l'image" });
  }
});

export function mediaListUrl({ q, folder, kind, missingAlt }: MediaFilters, page: number): string {
  const search = new URLSearchParams({
    'populate[file]': 'true',
    'sort[0]': 'createdAt:desc',
    'pagination[page]': String(page),
    'pagination[pageSize]': String(PAGE_SIZE),
  });
  if (q.trim()) search.set('filters[name][$containsi]', q.trim());
  if (folder) search.set('filters[folder][$eq]', folder);
  if (kind === 'images' || missingAlt) search.set('filters[file][mime][$startsWith]', 'image/');
  if (kind === 'documents') search.set('filters[file][mime][$notContainsi]', 'image/');
  if (missingAlt) {
    search.set('filters[$or][0][file][alternativeText][$null]', 'true');
    search.set('filters[$or][1][file][alternativeText][$eq]', '');
  }
  return `/api/media-items?${search}`;
}

export const mediaListQuery = (filters: MediaFilters) =>
  infiniteQueryOptions({
    queryKey: ['media', 'list', filters],
    queryFn: async ({ pageParam }) =>
      api<{ data: MediaItem[]; meta: { pagination: { page: number; pageCount: number; total: number } } }>(
        mediaListUrl(filters, pageParam),
      ),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.pagination.page < last.meta.pagination.pageCount ? last.meta.pagination.page + 1 : undefined,
  });

export interface FolderSummary {
  total: number;
  bytes: number;
  missingAlt: number;
  folders: Array<{ name: string; count: number }>;
}

export const foldersQuery = queryOptions({
  queryKey: ['media', 'folders'],
  queryFn: async () => (await api<{ data: FolderSummary }>('/api/media-items/folders')).data,
});

export interface MediaUsage {
  uid: string;
  documentId: string;
  label: string;
  path: string;
}

export const usageQuery = (fileId: number) =>
  queryOptions({
    queryKey: ['media', 'usage', fileId],
    queryFn: async () => (await api<{ data: MediaUsage[] }>(`/api/media-items/usage?file=${fileId}`)).data,
  });

export async function updateMedia(
  documentId: string,
  data: { name?: string; folder?: string | null; alt_text?: string; caption?: string; credit?: string },
): Promise<MediaItem> {
  return (await api<{ data: MediaItem }>(`/api/media-items/${documentId}`, { method: 'PUT', json: { data } })).data;
}

export async function deleteMedia(documentId: string): Promise<void> {
  await api(`/api/media-items/${documentId}`, { method: 'DELETE' });
}

export const refreshMedia = (client: QueryClient) => client.invalidateQueries({ queryKey: ['media'] });

/** « 1,2 Mo », « 980 Ko », « 1,4 Go » (poids en octets) */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1).replace('.', ',')} Go`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1).replace('.', ',')} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

// --- Envois avec progression ------------------------------------------------------------------------

export interface UploadJob {
  id: number;
  name: string;
  /** 0 → 1 */
  progress: number;
  status: 'waiting' | 'uploading' | 'done' | 'error';
  error?: string;
  result?: MediaItem;
  abort?: () => void;
}

let jobs: UploadJob[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const set = (update: (current: UploadJob[]) => UploadJob[]) => {
  jobs = update(jobs);
  listeners.forEach((listener) => listener());
};
const patch = (id: number, change: Partial<UploadJob>) =>
  set((current) => current.map((job) => (job.id === id ? { ...job, ...change } : job)));

/** Envoi d'un fichier avec progression (fetch ne donne pas la progression d'un envoi) */
export function uploadWithProgress(
  file: File,
  fields: Record<string, string>,
  onProgress: (ratio: number) => void,
): { promise: Promise<MediaItem>; abort: () => void } {
  const request = new XMLHttpRequest();
  const promise = new Promise<MediaItem>((resolve, reject) => {
    const form = new FormData();
    form.append('files', file);
    form.append('name', file.name);
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    request.open('POST', '/api/media-items/upload');
    request.withCredentials = true;
    request.setRequestHeader('X-Communeo-Csrf', '1');
    const site = auth.impersonatedSite();
    if (site) request.setRequestHeader('X-Site-Document-Id', site);
    request.upload.onprogress = (event) => event.lengthComputable && onProgress(event.loaded / event.total);
    request.onload = () => {
      let body: { data?: MediaItem; error?: { message?: string } } | null = null;
      try {
        body = JSON.parse(request.responseText);
      } catch {
        /* réponse vide */
      }
      if (request.status >= 200 && request.status < 300 && body?.data) resolve(body.data);
      else reject(new ApiError(request.status, body?.error?.message ?? "L'envoi a échoué."));
    };
    request.onerror = () => reject(new ApiError(0, 'Connexion perdue pendant l’envoi.'));
    request.onabort = () => reject(new ApiError(0, 'Envoi annulé.'));
    request.send(form);
  });
  return { promise, abort: () => request.abort() };
}

const CONCURRENCY = 3;

async function run(client: QueryClient, job: UploadJob, file: File, folder: string | null) {
  const { promise, abort } = uploadWithProgress(file, folder ? { folder } : {}, (progress) =>
    patch(job.id, { progress }),
  );
  patch(job.id, { status: 'uploading', abort });
  try {
    const result = await promise;
    patch(job.id, { status: 'done', progress: 1, result, abort: undefined });
  } catch (error) {
    patch(job.id, {
      status: 'error',
      error: error instanceof ApiError ? error.message : "L'envoi a échoué.",
      abort: undefined,
    });
  }
  void refreshMedia(client);
}

/** Envoie les fichiers (3 à la fois) dans un dossier ; les refusés d'office sont signalés tout de suite */
export async function startUploads(client: QueryClient, files: File[], folder: string | null): Promise<void> {
  const queue: Array<{ job: UploadJob; file: File }> = [];
  for (const file of files) {
    const problem = checkFile(file, LIBRARY_TYPES);
    const job: UploadJob = {
      id: nextId++,
      name: file.name,
      progress: 0,
      status: problem ? 'error' : 'waiting',
      error: problem ?? undefined,
    };
    set((current) => [...current.filter((entry) => entry.status !== 'done'), job]);
    if (!problem) queue.push({ job, file });
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    for (let next = queue.shift(); next; next = queue.shift()) await run(client, next.job, next.file, folder);
  });
  await Promise.all(workers);
}

export const dismissUpload = (id: number) => {
  jobs.find((job) => job.id === id)?.abort?.();
  set((current) => current.filter((job) => job.id !== id));
};
export const clearFinishedUploads = () =>
  set((current) => current.filter((job) => job.status === 'uploading' || job.status === 'waiting'));

export const useUploads = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => jobs,
  );
