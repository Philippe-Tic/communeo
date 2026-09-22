/** Petits constructeurs pour écrire les fixtures au format de l'API Strapi. */
import type { Media, RichTextDocument } from '@communeo/core';

let counter = 0;
const nextId = () => ++counter;

export const FIXTURE_NOW = new Date('2026-09-22T10:00:00+02:00');
const stamp = '2026-09-01T08:00:00.000Z';

export function doc<T extends string>(documentId: T, extra: Record<string, unknown> = {}) {
  return { id: nextId(), documentId, createdAt: stamp, updatedAt: stamp, publishedAt: stamp, ...extra };
}

/** Fichier de la médiathèque servi depuis le dossier assets des fixtures. */
export function media(file: string, options: { alt?: string; caption?: string; width?: number; height?: number; size?: number } = {}): Media {
  const ext = `.${file.split('.').pop()}`;
  const isImage = ext === '.svg';
  return {
    id: nextId(),
    documentId: `media-${file}`,
    createdAt: stamp,
    updatedAt: stamp,
    name: file,
    alternativeText: options.alt ?? null,
    caption: options.caption ?? null,
    width: isImage ? (options.width ?? 1200) : null,
    height: isImage ? (options.height ?? 800) : null,
    formats: null,
    hash: file,
    ext,
    mime: isImage ? 'image/svg+xml' : 'application/pdf',
    size: options.size ?? 120,
    url: `/fixtures/${file}`,
  };
}

type Inline = { type: 'text'; text: string; marks?: Array<{ type: 'bold' | 'italic' } | { type: 'link'; attrs: { href: string } }> };

export const t = (text: string): Inline => ({ type: 'text', text });
export const b = (text: string): Inline => ({ type: 'text', text, marks: [{ type: 'bold' }] });
export const a = (text: string, href: string): Inline => ({ type: 'text', text, marks: [{ type: 'link', attrs: { href } }] });

export const p = (...content: Array<Inline | string>) => ({
  type: 'paragraph' as const,
  content: content.map((item) => (typeof item === 'string' ? t(item) : item)),
});
export const h2 = (text: string) => ({ type: 'heading' as const, attrs: { level: 2 as const }, content: [t(text)] });
export const h3 = (text: string) => ({ type: 'heading' as const, attrs: { level: 3 as const }, content: [t(text)] });
export const ul = (...items: string[]) => ({
  type: 'bulletList' as const,
  content: items.map((item) => ({ type: 'listItem' as const, content: [p(item)] })),
});
export const ol = (...items: string[]) => ({
  type: 'orderedList' as const,
  content: items.map((item) => ({ type: 'listItem' as const, content: [p(item)] })),
});

export const rich = (...content: RichTextDocument['content']): RichTextDocument => ({ type: 'doc', content });
