/**
 * Fichiers : envoi dans la médiathèque de la commune (POST /api/media-items/upload) et affichage
 * (« PDF · 4,2 Mo »). Les formats et le poids sont vérifiés ici pour un message immédiat, et par Strapi.
 */
import { useSyncExternalStore } from 'react';
import { api } from './api';

export interface UploadedFile {
  id: number;
  name: string;
  ext: string | null;
  mime: string | null;
  /** Poids en Ko (convention Strapi) */
  size: number | null;
  url: string;
}

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/** Types acceptés, pour l'attribut `accept` et le contrôle avant envoi */
export const DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
];
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Contrôle avant envoi ; `null` si le fichier convient */
export function checkFile(file: File, types: string[]): string | null {
  if (!types.includes(file.type)) {
    const images = types.some((type) => type.startsWith('image/'));
    const documents = types.some((type) => !type.startsWith('image/'));
    const imageList = types.includes('image/svg+xml') ? 'JPG, PNG, WebP ou SVG' : 'JPG, PNG ou WebP';
    return `Format non accepté : ${images && documents ? `images (${imageList.replace(' ou ', ', ')}), PDF, Word, Excel ou OpenDocument` : images ? imageList : 'PDF, Word, Excel ou OpenDocument'}.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) return 'Fichier trop lourd : 20 Mo au maximum.';
  return null;
}

export async function uploadFile(file: File, folder = 'Documents officiels'): Promise<UploadedFile> {
  const form = new FormData();
  form.append('files', file);
  form.append('name', file.name);
  form.append('folder', folder);
  const response = await api<{ data: { file: UploadedFile } }>('/api/media-items/upload', {
    method: 'POST',
    body: form,
  });
  return response.data.file;
}

/** « PDF · 4,2 Mo » */
export function describeFile(file: Pick<UploadedFile, 'ext' | 'size'>): string {
  const format = (file.ext ?? '').replace('.', '').toUpperCase() || 'Fichier';
  if (file.size == null) return format;
  const size =
    file.size < 1024
      ? `${Math.max(1, Math.round(file.size))} Ko`
      : `${(file.size / 1024).toFixed(1).replace('.', ',')} Mo`;
  return `${format} · ${size}`;
}

// --- Envois en cours -------------------------------------------------------------------------------
// Tant qu'un fichier part, « Enregistrer » et « Publier » attendent : sinon le contenu serait
// enregistré sans lui, sans que personne ne s'en aperçoive.

let pending = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export async function trackUpload<T>(upload: Promise<T>): Promise<T> {
  pending += 1;
  notify();
  try {
    return await upload;
  } finally {
    pending -= 1;
    notify();
  }
}

export const usePendingUploads = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => pending,
  );
