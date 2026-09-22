import { richTextDocumentSchema, type RichTextDocument } from '../blocks/rich-text';
import { slugify } from '../site/slug';
import type { RichTextVM, TocEntryVM } from './types';

/** Identifiants d'ancres uniques sur une page (sommaire commun à tous les blocs de texte). */
export class AnchorRegistry {
  private used = new Set<string>();
  readonly toc: TocEntryVM[] = [];

  take(label: string, prefix = 'section'): string {
    const base = slugify(label) || prefix;
    let id = base;
    for (let n = 2; this.used.has(id); n += 1) id = `${base}-${n}`;
    this.used.add(id);
    return id;
  }
}

const plainText = (node: { content?: Array<{ type: string; text?: string }> }) =>
  (node.content ?? []).map((child) => (child.type === 'text' ? child.text : ' ')).join('').replace(/\s+/g, ' ').trim();

/**
 * Valide un texte riche venant de la base et ajoute un identifiant à chaque titre.
 * Un contenu invalide (ancien format, données corrompues) donne `null` plutôt que du HTML non maîtrisé.
 */
export function mapRichText(value: unknown, anchors: AnchorRegistry, options: { toc?: boolean } = {}): RichTextVM | null {
  const parsed = richTextDocumentSchema.safeParse(value);
  if (!parsed.success) return null;
  const doc: RichTextDocument = parsed.data;
  const content = doc.content.map((node) => {
    if (node.type !== 'heading') return node;
    const label = plainText(node);
    const id = anchors.take(label);
    if (options.toc !== false) anchors.toc.push({ id, label, level: node.attrs.level });
    return { ...node, attrs: { level: node.attrs.level, id } };
  });
  return content.some((node) => node.type !== 'paragraph' || (node.content?.length ?? 0) > 0) ? { type: 'doc', content } : null;
}
