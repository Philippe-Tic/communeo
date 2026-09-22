/**
 * Texte riche des blocs : JSON TipTap restreint.
 *
 * Seuls les nœuds et marques ci-dessous sont acceptés. Tout le reste (H1, HTML brut, images inline,
 * couleurs, alignements…) est refusé, ce qui garantit une structure accessible quel que soit le thème.
 */
import { z } from 'zod';

// Liens : http(s), mailto, tel ou chemin interne. Jamais `javascript:` ni `data:`.
const SAFE_HREF = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i;

export const linkMarkSchema = z
  .object({
    type: z.literal('link'),
    attrs: z
      .object({
        href: z.string().trim().min(1).regex(SAFE_HREF, 'Lien non autorisé'),
        target: z.enum(['_blank']).nullish(),
        rel: z.string().nullish(),
        class: z.null().optional(),
      })
      .strict(),
  })
  .strict();

export const markSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('bold') }).strict(),
  z.object({ type: z.literal('italic') }).strict(),
  linkMarkSchema,
]);

export const textNodeSchema = z
  .object({
    type: z.literal('text'),
    text: z.string().min(1),
    marks: z.array(markSchema).optional(),
  })
  .strict();

export const hardBreakSchema = z.object({ type: z.literal('hardBreak') }).strict();

const inlineSchema = z.discriminatedUnion('type', [textNodeSchema, hardBreakSchema]);

export const paragraphSchema = z
  .object({
    type: z.literal('paragraph'),
    content: z.array(inlineSchema).optional(),
  })
  .strict();

export const headingSchema = z
  .object({
    type: z.literal('heading'),
    attrs: z.object({ level: z.union([z.literal(2), z.literal(3)]) }).strict(),
    content: z.array(inlineSchema).optional(),
  })
  .strict();

export type RichTextMark = z.infer<typeof markSchema>;
export type RichTextInline = z.infer<typeof inlineSchema>;
export type RichTextParagraph = z.infer<typeof paragraphSchema>;
export type RichTextHeading = z.infer<typeof headingSchema>;
export type RichTextList = {
  type: 'bulletList' | 'orderedList';
  attrs?: { start?: number; type?: null };
  content: RichTextListItem[];
};
export type RichTextListItem = {
  type: 'listItem';
  content: Array<RichTextParagraph | RichTextList>;
};
export type RichTextBlockNode = RichTextParagraph | RichTextHeading | RichTextList;
export type RichTextDocument = { type: 'doc'; content: RichTextBlockNode[] };

// Listes récursives (une liste peut contenir une sous-liste)
export const listItemSchema: z.ZodType<RichTextListItem> = z.lazy(() =>
  z
    .object({
      type: z.literal('listItem'),
      content: z.array(z.union([paragraphSchema, listSchema])).min(1),
    })
    .strict(),
);

export const listSchema: z.ZodType<RichTextList> = z.lazy(() =>
  z
    .object({
      type: z.enum(['bulletList', 'orderedList']),
      attrs: z
        .object({ start: z.number().int().optional(), type: z.null().optional() })
        .strict()
        .optional(),
      content: z.array(listItemSchema).min(1),
    })
    .strict(),
);

type RichTextOptions = {
  /** Autoriser les titres (H2, H3). Désactivé pour les textes courts : réponses de FAQ, encadrés. */
  headings: boolean;
};

export function richTextSchema({ headings }: RichTextOptions): z.ZodType<RichTextDocument> {
  const blockNode = headings ? z.union([paragraphSchema, headingSchema, listSchema]) : z.union([paragraphSchema, listSchema]);
  return z
    .object({
      type: z.literal('doc'),
      content: z.array(blockNode),
    })
    .strict() as z.ZodType<RichTextDocument>;
}

/** Texte riche complet (bloc Texte) : titres H2/H3, paragraphes, listes, gras, italique, liens. */
export const richTextDocumentSchema = richTextSchema({ headings: true });

/** Texte riche court (réponses de FAQ, encadrés) : sans titres. */
export const shortRichTextDocumentSchema = richTextSchema({ headings: false });

/** Vrai si le document ne contient aucun texte (paragraphes vides uniquement). */
export function isRichTextEmpty(doc: RichTextDocument | null | undefined): boolean {
  if (!doc) return true;
  const hasText = (node: unknown): boolean => {
    if (!node || typeof node !== 'object') return false;
    const n = node as { type?: string; text?: string; content?: unknown[] };
    if (n.type === 'text') return (n.text ?? '').trim().length > 0;
    return Array.isArray(n.content) && n.content.some(hasText);
  };
  return !doc.content.some(hasText);
}
