/**
 * Page d'accueil décrite en intentions : la commune choisit ce qui apparaît,
 * le thème décide de l'ordre, de la forme et de l'emplacement (ou de ne pas afficher une section).
 */
import { z } from 'zod';
import { richTextDocumentSchema, shortRichTextDocumentSchema } from '../blocks/rich-text';

export const HOMEPAGE_SECTIONS = [
  { id: 'hero', label: 'Accroche' },
  { id: 'quick_links', label: 'Accès rapides' },
  { id: 'featured_news', label: 'Actualités à la une' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'mayor_word', label: 'Mot du maire' },
  { id: 'key_figures', label: 'Chiffres clés' },
  { id: 'practical_info', label: 'Infos pratiques' },
  { id: 'weather', label: 'Météo' },
  { id: 'waste_collection', label: 'Prochaines collectes' },
  { id: 'disruptions', label: 'Perturbations en cours' },
  { id: 'canteen', label: 'Menu de la cantine' },
  { id: 'associations', label: 'Associations' },
  { id: 'partners', label: 'Partenaires' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'free_content', label: 'Contenu libre' },
] as const;

export type HomepageSectionId = (typeof HOMEPAGE_SECTIONS)[number]['id'];
export const HOMEPAGE_SECTION_IDS = HOMEPAGE_SECTIONS.map((section) => section.id) as HomepageSectionId[];

export const HOMEPAGE_LIMITS = {
  quickLinks: { min: 4, max: 8 },
  keyFigures: { min: 3, max: 4 },
  listing: { min: 1, max: 6 },
} as const;

const SAFE_URL = /^(https?:\/\/|mailto:|tel:|\/(?!\/))/i;
const url = z.string().trim().regex(SAFE_URL, 'Lien non autorisé').nullish().or(z.literal(''));
const section = <T extends z.ZodRawShape>(shape: T) =>
  z.object({ id: z.number().int().optional(), enabled: z.boolean().nullish(), ...shape }).nullish();

/** Validation à l'enregistrement : textes riches, liens et limites hautes. */
export const homepageSchema = z
  .object({
    hero: section({ primary_url: url, secondary_url: url }),
    quick_links: section({
      items: z.array(z.object({ url: url }).passthrough()).max(HOMEPAGE_LIMITS.quickLinks.max).nullish(),
    }),
    featured_news: section({ count: z.number().int().min(1).max(HOMEPAGE_LIMITS.listing.max).nullish() }),
    agenda: section({ count: z.number().int().min(1).max(HOMEPAGE_LIMITS.listing.max).nullish() }),
    associations: section({ count: z.number().int().min(1).max(HOMEPAGE_LIMITS.listing.max).nullish() }),
    mayor_word: section({ body: shortRichTextDocumentSchema.nullish() }),
    key_figures: section({ items: z.array(z.unknown()).max(HOMEPAGE_LIMITS.keyFigures.max).nullish() }),
    partners: section({ items: z.array(z.object({ url: url }).passthrough()).max(12).nullish() }),
    free_content: section({ body: richTextDocumentSchema.nullish() }),
  })
  .passthrough();

export type HomepageIssue = { path: (string | number)[]; message: string };

export function validateHomepage(homepage: unknown): { success: boolean; issues: HomepageIssue[] } {
  if (homepage === null || homepage === undefined) return { success: true, issues: [] };
  const result = homepageSchema.safeParse(homepage);
  if (result.success) return { success: true, issues: [] };
  return {
    success: false,
    issues: result.error.issues.map((issue) => ({ path: issue.path as (string | number)[], message: issue.message })),
  };
}
