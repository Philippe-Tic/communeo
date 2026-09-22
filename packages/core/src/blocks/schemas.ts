/**
 * Catalogue fermé des blocs de contenu (dynamic zone `blocks` des pages, actualités et événements).
 *
 * Deux niveaux de validation :
 * - `draft` : à chaque enregistrement (autosave compris) — structure, nœuds autorisés, limites hautes ;
 * - `publish` : à la publication — en plus, champs obligatoires et nombres minimums.
 */
import { z } from 'zod';
import { isRichTextEmpty, richTextDocumentSchema, shortRichTextDocumentSchema, type RichTextDocument } from './rich-text';

export const BLOCK_UIDS = [
  'blocks.text',
  'blocks.image',
  'blocks.buttons',
  'blocks.callout',
  'blocks.documents',
  'blocks.gallery',
  'blocks.faq',
  'blocks.contact',
  'blocks.video',
] as const;

export type BlockUid = (typeof BLOCK_UIDS)[number];
export type ValidationMode = 'draft' | 'publish';

export const CALLOUT_VARIANTS = ['info', 'warning', 'important', 'tip'] as const;
export const BUTTON_STYLES = ['primary', 'secondary'] as const;
export const IMAGE_WIDTHS = ['normal', 'full'] as const;

export const BLOCK_LIMITS = {
  buttons: { min: 1, max: 3 },
  gallery: { min: 3, max: 12 },
  documents: { min: 1, max: 20 },
  faq: { min: 1, max: 50 },
} as const;

const SAFE_URL = /^(https?:\/\/|mailto:|tel:|\/(?!\/))/i;
const VIDEO_URL = /^https:\/\/(www\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com|dailymotion\.com|dai\.ly|vimeo\.com|player\.vimeo\.com)\//i;

/**
 * Référence à un fichier de la médiathèque : un id à l'écriture, un objet peuplé à la lecture.
 * Quand l'objet est peuplé, le texte alternatif est exigé à la publication.
 */
const mediaRef = (mode: ValidationMode) =>
  z.union([
    z.number().int().positive(),
    z.string().min(1),
    z
      .object({
        id: z.number().int().positive(),
        alternativeText: z.string().nullish(),
        mime: z.string().optional(),
      })
      .passthrough()
      .superRefine((media, ctx) => {
        if (mode === 'publish' && 'alternativeText' in media && media.mime?.startsWith('image/') !== false) {
          if (!media.alternativeText || !media.alternativeText.trim()) {
            ctx.addIssue({ code: 'custom', message: "Texte alternatif manquant sur l'image", path: ['alternativeText'] });
          }
        }
      }),
  ]);

/** Champ obligatoire à la publication, facultatif en brouillon. */
const required = <T extends z.ZodTypeAny>(schema: T, mode: ValidationMode) =>
  mode === 'publish' ? schema : schema.nullish();

const optionalText = (max: number) => z.string().max(max).nullish();

const richText = (schema: z.ZodType<RichTextDocument>, mode: ValidationMode, label: string) =>
  mode === 'publish'
    ? schema.refine((doc) => !isRichTextEmpty(doc), { message: `${label} est vide` })
    : schema.nullish();

const list = <T extends z.ZodTypeAny>(item: T, limits: { min: number; max: number }, mode: ValidationMode) =>
  mode === 'publish'
    ? z.array(item).min(limits.min, `Au moins ${limits.min} élément(s)`).max(limits.max, `Au plus ${limits.max} éléments`)
    : z.array(item).max(limits.max, `Au plus ${limits.max} éléments`).nullish();

const base = { id: z.number().int().optional() };

export function blockSchemas(mode: ValidationMode) {
  const buttonItem = z.object({
    ...base,
    label: required(z.string().trim().min(1, 'Libellé du bouton requis').max(60), mode),
    url: required(z.string().trim().regex(SAFE_URL, 'Lien non autorisé'), mode),
    style: z.enum(BUTTON_STYLES).nullish(),
  });

  const faqItem = z.object({
    ...base,
    question: required(z.string().trim().min(1, 'Question requise').max(200), mode),
    answer: richText(shortRichTextDocumentSchema, mode, 'La réponse'),
  });

  return {
    'blocks.text': z.object({ ...base, body: richText(richTextDocumentSchema, mode, 'Le texte') }),
    'blocks.image': z.object({
      ...base,
      image: required(mediaRef(mode), mode),
      caption: optionalText(300),
      width: z.enum(IMAGE_WIDTHS).nullish(),
    }),
    'blocks.buttons': z.object({ ...base, buttons: list(buttonItem, BLOCK_LIMITS.buttons, mode) }),
    'blocks.callout': z.object({
      ...base,
      variant: required(z.enum(CALLOUT_VARIANTS), mode),
      title: optionalText(120),
      body: richText(shortRichTextDocumentSchema, mode, "Le texte de l'encadré"),
    }),
    'blocks.documents': z.object({
      ...base,
      title: optionalText(120),
      files: list(mediaRef(mode), BLOCK_LIMITS.documents, mode),
    }),
    'blocks.gallery': z.object({
      ...base,
      title: optionalText(120),
      images: list(mediaRef(mode), BLOCK_LIMITS.gallery, mode),
    }),
    'blocks.faq': z.object({
      ...base,
      title: optionalText(120),
      items: list(faqItem, BLOCK_LIMITS.faq, mode),
    }),
    'blocks.contact': z.object({
      ...base,
      name: required(z.string().trim().min(1, 'Nom requis').max(120), mode),
      address: optionalText(300),
      phone: optionalText(30),
      email: z.string().trim().email('E-mail invalide').nullish().or(z.literal('')),
      hours: optionalText(500),
      show_map: z.boolean().nullish(),
    }),
    'blocks.video': z.object({
      ...base,
      url: required(z.string().trim().regex(VIDEO_URL, 'Seules les vidéos YouTube, Dailymotion et Vimeo sont acceptées'), mode),
      title: required(z.string().trim().min(1, 'Titre de la vidéo requis').max(200), mode),
      transcript: optionalText(20000),
    }),
  } satisfies Record<BlockUid, z.ZodTypeAny>;
}

export type BlockIssue = {
  /** Position du bloc dans la liste (0 = premier) */
  index: number;
  component: string | null;
  path: (string | number)[];
  message: string;
};

export type BlocksValidationResult = { success: boolean; issues: BlockIssue[] };

const MAX_BLOCKS = 100;

/** Valide la liste des blocs d'un contenu. */
export function validateBlocks(blocks: unknown, mode: ValidationMode): BlocksValidationResult {
  if (blocks === null || blocks === undefined) return { success: true, issues: [] };
  if (!Array.isArray(blocks)) {
    return { success: false, issues: [{ index: -1, component: null, path: [], message: 'Les blocs doivent être une liste' }] };
  }
  if (blocks.length > MAX_BLOCKS) {
    return {
      success: false,
      issues: [{ index: -1, component: null, path: [], message: `Au plus ${MAX_BLOCKS} blocs par contenu` }],
    };
  }

  const schemas = blockSchemas(mode);
  const issues: BlockIssue[] = [];

  blocks.forEach((block, index) => {
    const component = (block as { __component?: unknown })?.__component;
    if (typeof component !== 'string' || !(BLOCK_UIDS as readonly string[]).includes(component)) {
      issues.push({ index, component: typeof component === 'string' ? component : null, path: [], message: 'Type de bloc inconnu' });
      return;
    }
    const result = schemas[component as BlockUid].safeParse(block);
    if (!result.success) {
      for (const issue of result.error.issues) {
        issues.push({ index, component, path: issue.path as (string | number)[], message: issue.message });
      }
    }
  });

  return { success: issues.length === 0, issues };
}
